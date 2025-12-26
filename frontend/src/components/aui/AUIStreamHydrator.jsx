import React, { useState, useEffect, useRef, useCallback } from 'react';
import { applyPatch } from 'fast-json-patch';
import { useAUITransport } from '../../hooks/useAUITransport';
import { AUIProvider } from './AUIContext';

/**
 * AUIStreamHydrator - Handles streaming events and renders AUI components
 * 
 * Supports multiple transport layers:
 * - SSE (EventSource) - default, unidirectional
 * - WebSocket - bidirectional, better for HITL scenarios
 * 
 * Compatible with both legacy AUIRenderPacket and new streaming events:
 * - RENDER_SNAPSHOT: Full component spec (backward compatible)
 * - TEXT_DELTA: Incremental text updates
 * - STATE_DELTA: JSON Patch state updates
 */
const AUIStreamHydrator = ({
    streamUrl,
    params = {},        // WebSocket params (words, level, etc.)
    onError,
    onComplete
}) => {
    const [componentSpec, setComponentSpec] = useState(null);
    const [accumulatedText, setAccumulatedText] = useState({});
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);

    // New state for extended events
    const [messages, setMessages] = useState([]); // Array of text messages (for TEXT_MESSAGE lifecycle)
    const [activities, setActivities] = useState({}); // Map: activity_id -> activity state
    const [toolCalls, setToolCalls] = useState([]); // Array of tool call events
    const [runState, setRunState] = useState(null); // Current run state
    const [interruptState, setInterruptState] = useState(null); // Current interrupt state

    // Track messages ref for closure-safe access
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    /**
     * Process incoming AUI event (shared between SSE and WebSocket)
     */
    const handleEvent = useCallback((auiEvent) => {

        switch (auiEvent.type) {
            case 'aui_stream_start':
                // Stream started
                break;

            case 'aui_render_snapshot':
                setComponentSpec({
                    component: auiEvent.ui.component,
                    props: auiEvent.ui.props,
                    intention: auiEvent.intention,
                    targetLevel: auiEvent.target_level
                });
                break;

            case 'aui_state_snapshot':
                // Complete state snapshot - allows recovery/initialization
                setComponentSpec({
                    component: auiEvent.state.component,
                    props: auiEvent.state.props,
                    intention: auiEvent.state.intention,
                    targetLevel: auiEvent.state.target_level
                });
                break;


            case 'aui_text_delta':
                // Check if this delta belongs to a specific message (lifecycle)
                // Use functional setState to ensure we always work with latest state
                setMessages(prev => {
                    const messageIndex = prev.findIndex(m => m.id === auiEvent.message_id);
                    if (messageIndex >= 0) {
                        // Update the tracked message
                        return prev.map(msg =>
                            msg.id === auiEvent.message_id
                                ? { ...msg, content: msg.content + auiEvent.delta }
                                : msg
                        );
                    }
                    // Message not found - return unchanged
                    return prev;
                });

                // If no message found, fall back to legacy component spec accumulation
                // Use ref for closure-safe check
                if (messagesRef.current.findIndex(m => m.id === auiEvent.message_id) < 0) {
                    // Legacy: Accumulate text deltas into component props
                    setComponentSpec(prev => {
                        if (!prev) return prev;

                        const newProps = structuredClone(prev.props);
                        const path = auiEvent.field_path || 'content';
                        const pathParts = path.split('.');

                        // Navigate to the nested property
                        let current = newProps;
                        for (let i = 0; i < pathParts.length - 1; i++) {
                            if (!current[pathParts[i]]) {
                                current[pathParts[i]] = {};
                            }
                            current = current[pathParts[i]];
                        }

                        // Append the delta text
                        const lastKey = pathParts[pathParts.length - 1];
                        current[lastKey] = (current[lastKey] || '') + auiEvent.delta;

                        return {
                            ...prev,
                            props: newProps
                        };
                    });
                }
                break;

            case 'aui_state_delta':
                // Apply JSON Patch
                setComponentSpec(prev => {
                    if (!prev) {
                        console.warn('[AUIStreamHydrator] Received state delta but no component spec exists');
                        return null;
                    }

                    // Deep clone to ensure we don't mutate current state
                    const doc = {
                        component: prev.component,
                        props: structuredClone(prev.props),
                        intention: prev.intention,
                        target_level: prev.targetLevel
                    };

                    try {
                        const result = applyPatch(doc, auiEvent.delta);
                        const newDoc = result.newDocument || doc;

                        return {
                            component: newDoc.component,
                            props: newDoc.props,
                            intention: newDoc.intention,
                            targetLevel: newDoc.target_level || newDoc.targetLevel
                        };
                    } catch (err) {
                        console.error('[AUIStreamHydrator] JSON Patch failed:', err);
                        return prev;
                    }
                });
                break;

            case 'aui_stream_end':
                console.log('[AUIStreamHydrator] Stream ended');
                setIsStreaming(false);
                break;

            case 'aui_error':
                console.error('[AUIStreamHydrator] Stream error:', auiEvent.message);
                setError(auiEvent.message);
                setIsStreaming(false);
                if (onError) onError(auiEvent.message);
                break;

            // TEXT_MESSAGE Lifecycle Events
            case 'aui_text_message_start':
                setMessages(prev => [...prev, {
                    id: auiEvent.message_id,
                    role: auiEvent.role,
                    content: '',
                    isStreaming: true,
                    metadata: auiEvent.metadata || {}
                }]);
                break;

            case 'aui_text_message_end':
                setMessages(prev => prev.map(msg =>
                    msg.id === auiEvent.message_id
                        ? {
                            ...msg,
                            isStreaming: false,
                            content: auiEvent.final_content || msg.content
                        }
                        : msg
                ));
                break;

            case 'aui_messages_snapshot':
                setMessages(auiEvent.messages);
                break;

            // Activity Progress Events
            case 'aui_activity_snapshot':
                setActivities(prev => ({
                    ...prev,
                    [auiEvent.activity_id]: {
                        id: auiEvent.activity_id,
                        name: auiEvent.name,
                        status: auiEvent.status,
                        progress: auiEvent.progress,
                        current_step: auiEvent.current_step,
                        metadata: auiEvent.metadata
                    }
                }));
                break;

            case 'aui_activity_delta':
                setActivities(prev => {
                    const activity = prev[auiEvent.activity_id];
                    if (!activity) {
                        console.warn('[AUIStreamHydrator] Activity delta for unknown activity:', auiEvent.activity_id);
                        return prev;
                    }

                    try {
                        // Apply JSON Patch to activity
                        const activityDoc = structuredClone(activity);
                        const result = applyPatch(activityDoc, auiEvent.delta);
                        const newActivity = result.newDocument || activityDoc;

                        return {
                            ...prev,
                            [auiEvent.activity_id]: newActivity
                        };
                    } catch (err) {
                        console.error('[AUIStreamHydrator] Activity patch failed:', err);
                        return prev;
                    }
                });
                break;

            // Tool Call Events
            case 'aui_tool_call_start':
            case 'aui_tool_call_args':
            case 'aui_tool_call_end':
            case 'aui_tool_call_result':
                setToolCalls(prev => [...prev, auiEvent]);
                break;

            // Run Lifecycle Events
            case 'aui_run_started':
            case 'aui_run_finished':
            case 'aui_run_error':
                setRunState(auiEvent);
                break;

            // Interrupt Event (HITL)
            case 'aui_interrupt':
                setInterruptState({
                    id: auiEvent.interrupt_id,
                    reason: auiEvent.reason,
                    requiredAction: auiEvent.required_action,
                    payload: auiEvent.payload
                });
                break;

            default:
                console.warn('[AUIStreamHydrator] Unknown event type:', auiEvent.type);
        }
    }, [onError]);

    // Use the transport hook
    const { connect, disconnect, send, isConnected } = useAUITransport({
        url: streamUrl,
        params,
        onMessage: handleEvent,
        onError: (err) => {
            setError('Connection error');
            setIsStreaming(false);
            if (onError) onError('Connection error');
        },
        onComplete: () => {
            setIsStreaming(false);
            if (onComplete) onComplete();
        }
    });

    // Connect when streamUrl or transport changes
    // NOTE: connect/disconnect are STABLE functions (no deps) so we don't include them
    useEffect(() => {
        if (!streamUrl) return;

        setIsStreaming(true);
        setError(null);

        // Reset state for new stream
        setComponentSpec(null);
        setMessages([]);
        setActivities({});
        setToolCalls([]);
        setRunState(null);
        setInterruptState(null);

        connect();

        return () => {
            disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [streamUrl]);

    // Handle interrupt action with WebSocket support
    const handleInterruptAction = useCallback(async (action) => {
        if (isConnected) {
            // Send via WebSocket for low-latency HITL
            // Use session_id from payload (this is what backend waits for)
            const sessionId = interruptState?.payload?.session_id || interruptState?.id;
            send({
                type: 'input',
                session_id: sessionId,
                action: action.action,
                payload: { label: action.label }
            });
            return true;
        }
        // Fallback to POST (handled in InterruptBanner)
        return false;
    }, [isConnected, send, interruptState]);

    // Generic action handler for child components
    const handleComponentAction = useCallback((action, payload) => {
        console.log('[AUI] Component Action:', action, payload);

        if (isConnected && send) {
            // WebSocket path - send directly
            send({
                type: 'input',
                action: action,
                payload: payload
            });
        }
        // SSE mode: action is handled locally by the component (no backend call)
        // This aligns with AUI philosophy - single transport channel
    }, [isConnected, send]);

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                <strong>Stream Error:</strong> {error}
            </div>
        );
    }

    // Check if we have any extended events to display
    const hasExtendedEvents = messages.length > 0 || Object.keys(activities).length > 0 || toolCalls.length > 0 || runState || interruptState;

    if (!componentSpec && !hasExtendedEvents) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-pulse text-[#666] font-mono text-sm">
                    Connecting to stream...
                </div>
            </div>
        );
    }

    // Context value for child components
    const auiContextValue = {
        transport: 'websocket',
        isConnected,
        send,
    };

    // Dynamic component rendering (lazy load from registry)
    return (
        <AUIProvider value={auiContextValue}>
            <div className="aui-stream-container">
                {/* Render the component dynamically (if exists) */}
                {componentSpec && (
                    <DynamicComponentRenderer
                        component={componentSpec.component}
                        props={componentSpec.props}
                        onAction={handleComponentAction}
                        onStatusChange={(id, status) => handleComponentAction('status_changed', { id, status })}
                    />
                )}

                {/* Text Messages (Multiple concurrent streams) */}
                {messages.length > 0 && (
                    <div className="mt-4">
                        <MessageList messages={messages} />
                    </div>
                )}

                {/* Activities */}
                {Object.keys(activities).length > 0 && (
                    <div className="mt-4 space-y-3">
                        {Object.entries(activities).map(([id, activity]) => (
                            <ActivityProgressBar key={id} activity={activity} />
                        ))}
                    </div>
                )}

                {/* Render tool calls if any */}
                {toolCalls.length > 0 && (
                    <div className="mt-4">
                        <ToolCallTimeline toolCalls={toolCalls} />
                    </div>
                )}

                {/* Render run state if exists */}
                {runState && (
                    <div className="mt-4">
                        <RunStatusBadge runState={runState} />
                    </div>
                )}

                {/* Render interrupt banner if exists */}
                {interruptState && (
                    <div className="mt-4">
                        <InterruptBanner
                            interrupt={interruptState}
                            onAction={handleInterruptAction}
                            useWebSocket={isConnected}
                        />
                    </div>
                )}
            </div>
        </AUIProvider>
    );
};

// Simple UI Components for extended events

const MessageList = ({ messages }) => (
    <div className="space-y-4">
        {messages.map(msg => (
            <div key={msg.id} className="bg-canvas-dark border border-neon-green/30 rounded-lg p-6 md:p-4 font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                    <span className="text-neon-green text-sm sm:text-xs font-semibold uppercase tracking-wider">
                        {msg.metadata?.type || msg.role}
                    </span>
                    {msg.metadata?.title && (
                        <span className="text-ink/60 text-sm sm:text-xs">- {msg.metadata.title}</span>
                    )}
                    {msg.metadata?.word && (
                        <span className="text-ink/60 text-sm sm:text-xs">- {msg.metadata.word}</span>
                    )}
                    {msg.isStreaming && (
                        <span className="text-neon-pink text-sm sm:text-xs animate-pulse sm:ml-auto">
                            ● streaming...
                        </span>
                    )}
                    {!msg.isStreaming && (
                        <span className="text-neon-cyan text-sm sm:text-xs sm:ml-auto">
                            ✓ complete
                        </span>
                    )}
                </div>
                <div className="text-ink text-base sm:text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content || (<span className="text-ink/40 italic">waiting for content...</span>)}
                </div>
            </div>
        ))}
    </div>
);

const ActivityProgressBar = ({ activity }) => (
    <div className="bg-canvas-dark border border-ink/20 rounded-lg p-4 sm:p-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <span className="text-ink font-medium text-base sm:text-sm">{activity.name}</span>
            <span className={`text-sm sm:text-xs px-3 py-1.5 sm:px-2 sm:py-0.5 rounded self-start sm:self-auto ${activity.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                activity.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                    activity.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                }`}>
                {activity.status}
            </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 sm:h-2 bg-ink/10 rounded-full overflow-hidden mb-2">
            <div
                className="absolute h-full bg-neon-cyan transition-all duration-300"
                style={{ width: `${(activity.progress * 100).toFixed(0)}%` }}
            />
        </div>

        <div className="flex items-center justify-between text-sm sm:text-xs text-ink/60">
            <span>{activity.current_step || 'Waiting...'}</span>
            <span className="font-semibold">{(activity.progress * 100).toFixed(0)}%</span>
        </div>
    </div>
);

const ToolCallTimeline = ({ toolCalls }) => {
    // Group by tool_call_id
    const groupedCalls = toolCalls.reduce((acc, event) => {
        const id = event.tool_call_id;
        if (!acc[id]) acc[id] = [];
        acc[id].push(event);
        return acc;
    }, {});

    return (
        <div className="bg-canvas-dark border border-ink/20 rounded-lg p-4 sm:p-3 font-mono">
            <div className="text-ink font-medium mb-3 text-base sm:text-sm">Tool Calls</div>
            <div className="space-y-3">
                {Object.entries(groupedCalls).map(([id, events]) => {
                    const startEvent = events.find(e => e.type === 'aui_tool_call_start');
                    const endEvent = events.find(e => e.type === 'aui_tool_call_end');
                    const resultEvent = events.find(e => e.type === 'aui_tool_call_result');

                    return (
                        <div key={id} className="border-l-2 border-neon-cyan/50 pl-3 sm:pl-2">
                            <div className="text-ink text-base sm:text-sm">🔧 {startEvent?.tool_name || 'Tool'}</div>
                            {endEvent && (
                                <div className="text-sm sm:text-xs text-ink/60 mt-1">
                                    Status: {endEvent.status} ({endEvent.duration_ms?.toFixed(0)}ms)
                                </div>
                            )}
                            {resultEvent && resultEvent.result && (
                                <div className="text-sm sm:text-xs text-neon-cyan mt-1 truncate sm:whitespace-normal">
                                    Result: {JSON.stringify(resultEvent.result).substring(0, 50)}...
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const RunStatusBadge = ({ runState }) => (
    <div className="bg-canvas-dark border border-ink/20 rounded-lg p-4 sm:p-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="text-ink/60 text-sm">Agent Run:</span>
            {runState.type === 'aui_run_started' && (
                <>
                    <span className="text-blue-400 text-base sm:text-sm">🔄 Running</span>
                    <span className="text-sm sm:text-xs text-ink/60">{runState.task_description}</span>
                </>
            )}
            {runState.type === 'aui_run_finished' && (
                <>
                    <span className="text-green-400 text-base sm:text-sm">✅ Finished</span>
                    <span className="text-sm sm:text-xs text-ink/60">{runState.duration_ms?.toFixed(0)}ms</span>
                </>
            )}
            {runState.type === 'aui_run_error' && (
                <>
                    <span className="text-red-400 text-base sm:text-sm">❌ Error</span>
                    <span className="text-sm sm:text-xs text-red-400/80">{runState.error_message}</span>
                </>
            )}
        </div>
    </div>
);

const InterruptBanner = ({ interrupt, onAction, useWebSocket = false }) => {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [submitted, setSubmitted] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState(null);

    const handleAction = async (action) => {
        setIsSubmitting(true);
        setSelectedAction(action);

        try {
            // Try WebSocket first if available
            if (useWebSocket && onAction) {
                const sent = await onAction(action);
                if (sent) {
                    setSubmitted(true);
                    setIsSubmitting(false);
                    return;
                }
                // Fall through to HTTP if WebSocket send failed
            }

            // Fallback: Send user input via HTTP POST
            const response = await fetch('/api/aui/input', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: interrupt.id, // Use interrupt_id as session reference
                    action: action.action,
                    label: action.label,
                    interrupt_id: interrupt.id
                })
            });

            if (response.ok) {
                setSubmitted(true);
                if (onAction) onAction(action);
            }
        } catch (err) {
            // Silently handle errors
        } finally {
            setIsSubmitting(false);
        }
    };

    // Extract options from payload if available
    const options = interrupt.payload?.options || [];

    return (
        <div className={`border rounded-lg p-5 sm:p-4 font-mono transition-all ${submitted
            ? 'bg-green-900/20 border-green-500/50'
            : 'bg-amber-900/20 border-amber-500/50'
            }`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-lg">{submitted ? '✅' : '⚠️'}</span>
                    <span className={`font-semibold text-base sm:text-sm ${submitted ? 'text-green-400' : 'text-amber-400'}`}>
                        {submitted ? 'Response Submitted' : 'Confirmation Required'}
                    </span>
                </div>
                <span className="text-xs text-ink/50 sm:ml-auto">ID: {interrupt.id?.slice(0, 12)}...</span>
            </div>

            {!submitted && (
                <>
                    <div className="text-ink mb-3 text-base sm:text-sm">
                        <span className="text-ink/60">Reason: </span>
                        <span className="text-amber-300">{interrupt.reason}</span>
                    </div>

                    {interrupt.requiredAction && (
                        <div className="text-ink mb-4 text-base sm:text-sm">
                            <span className="text-ink/60">Action: </span>
                            <span className="text-amber-200">{interrupt.requiredAction}</span>
                        </div>
                    )}

                    {/* Structured payload display (excluding options) */}
                    {interrupt.payload && (
                        <div className="mb-4 p-4 sm:p-3 bg-canvas-dark/50 rounded text-sm sm:text-xs space-y-2 max-h-60 overflow-y-auto">
                            {interrupt.payload.plan_type && (
                                <div><span className="text-ink/60">Plan: </span><span className="text-neon-cyan">{interrupt.payload.plan_type}</span></div>
                            )}
                            {interrupt.payload.duration_days && (
                                <div><span className="text-ink/60">Duration: </span><span className="text-ink">{interrupt.payload.duration_days} days</span></div>
                            )}
                            {interrupt.payload.daily_commitment_minutes && (
                                <div><span className="text-ink/60">Daily Time: </span><span className="text-ink">{interrupt.payload.daily_commitment_minutes} minutes</span></div>
                            )}
                            {interrupt.payload.focus_areas && (
                                <div>
                                    <span className="text-ink/60">Focus Areas:</span>
                                    <ul className="mt-1 ml-4 space-y-1">
                                        {interrupt.payload.focus_areas.map((area, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${area.priority === 'high' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                                                <span className="text-ink">{area.skill}</span>
                                                <span className="text-ink/50">({area.estimated_sessions} sessions)</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {interrupt.payload.expected_improvement && (
                                <div><span className="text-ink/60">Expected Improvement: </span><span className="text-green-400">{interrupt.payload.expected_improvement}</span></div>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    {options.length > 0 && (
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-2 mt-4">
                            {options.map((option, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAction(option)}
                                    disabled={isSubmitting}
                                    className={`w-full sm:w-auto px-6 py-3 sm:px-4 sm:py-2 rounded border transition-all text-base sm:text-sm active:scale-95 ${isSubmitting && selectedAction?.action === option.action
                                        ? 'bg-amber-500/30 border-amber-500 text-amber-300 animate-pulse'
                                        : option.action === 'confirm'
                                            ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
                                            : option.action === 'cancel'
                                                ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                                                : 'bg-ink/10 border-ink/30 text-ink hover:bg-ink/20'
                                        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {submitted && (
                <div className="text-green-300 text-base sm:text-sm">
                    Selected: <span className="font-bold">{selectedAction?.label}</span>
                </div>
            )}
        </div>
    );
};

// Props: { streamUrl: string (required), onError?: func, onComplete?: func }

/**
 * DynamicComponentRenderer - Loads and renders components from the AUI registry
 */
const DynamicComponentRenderer = ({ component, props, onAction, onStatusChange }) => {
    const [Component, setComponent] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Load component from registry
        import(`./registry.js`)
            .then(module => {
                const ComponentClass = module.getComponent(component);
                if (ComponentClass) {
                    setComponent(() => ComponentClass);
                } else {
                    console.error(`Component "${component}" not found in AUI registry`);
                    setError(`Component "${component}" not found`);
                }
            })
            .catch(err => {
                console.error('Failed to load AUI registry:', err);
                setError('Failed to load registry');
            });
    }, [component]);

    if (error) {
        return (
            <div className="text-red-400 font-mono text-sm p-4 border border-red-500/50 rounded">
                Error: {error}
            </div>
        );
    }

    if (!Component) {
        return (
            <div className="text-[#666] font-mono text-sm">
                Loading component: {component}...
            </div>
        );
    }

    // Wrap lazy-loaded component in Suspense
    return (
        <React.Suspense fallback={<div className="text-[#666] font-mono text-sm animate-pulse">Rendering {component}...</div>}>
            <Component
                {...props}
                onAction={onAction}
                onStatusChange={onStatusChange}
            />
        </React.Suspense>
    );
};

// Props: { component: string (required), props?: object }

export default AUIStreamHydrator;
