import React, { useState, useEffect, useRef } from 'react';
import { applyPatch } from 'fast-json-patch';

/**
 * AUIStreamHydrator - Handles SSE event streams and renders AUI components
 * 
 * Compatible with both legacy AUIRenderPacket and new streaming events:
 * - RENDER_SNAPSHOT: Full component spec (backward compatible)
 * - TEXT_DELTA: Incremental text updates
 * - STATE_DELTA: JSON Patch state updates (future)
 */
const AUIStreamHydrator = ({ streamUrl, onError, onComplete }) => {
    const [componentSpec, setComponentSpec] = useState(null);
    const [accumulatedText, setAccumulatedText] = useState({});
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);

    // New state for extended events
    const [messages, setMessages] = useState([]); // Array of text messages (for TEXT_MESSAGE lifecycle)
    const [activities, setActivities] = useState({}); // Map: activity_id -> activity state
    const [toolCalls, setToolCalls] = useState([]); // Array of tool call events
    const [runState, setRunState] = useState(null); // Current run state

    const eventSourceRef = useRef(null);

    useEffect(() => {
        if (!streamUrl) return;

        console.log('[AUIStreamHydrator] Connecting to:', streamUrl);
        setIsStreaming(true);
        setError(null);

        const eventSource = new EventSource(streamUrl);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const auiEvent = JSON.parse(event.data);
                console.log('[AUIStreamHydrator] Received event:', auiEvent.type, auiEvent);

                switch (auiEvent.type) {
                    case 'aui_stream_start':
                        console.log('[AUIStreamHydrator] Stream started:', auiEvent.session_id);
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
                        // We need to check this separately since setState is async
                        if (messages.findIndex(m => m.id === auiEvent.message_id) < 0) {
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

                            // Create a deep clone to avoid mutation issues before patching
                            // The 'ui' object in RenderSnapshotEvent maps to { component:..., props:..., intention:..., targetLevel:... }
                            // We need to patch the WHOLE object to allow targetLevel changes too, 
                            // but our state 'componentSpec' is slightly different structure than the raw event 'ui'

                            // Let's assume the backend 'create_state_diff' was run on the WHOLE object structure:
                            // { component: "...", props: { ... }, intention: "...", target_level: ... }

                            // Our state 'componentSpec' is:
                            // { component, props, intention, targetLevel }

                            // We need to normalize key names if the backend sends 'target_level' but frontend uses 'targetLevel'.
                            // Ideally, backend should send exactly what frontend expects, OR frontend state mirrors backend.

                            // For now, let's assume the patch is against the object structure:
                            // { component, props, intention, target_level }
                            // So we reconstruct that, patch it, and map back.

                            // Deep clone to ensure we don't mutate current state
                            const doc = {
                                component: prev.component,
                                props: structuredClone(prev.props),
                                intention: prev.intention,
                                target_level: prev.targetLevel
                            };

                            try {
                                // fast-json-patch applyPatch modifies in place
                                const result = applyPatch(doc, auiEvent.delta);
                                // The library might return results array or object depending on version/config
                                // But since we cloned 'doc', we can blindly use it if it was mutated, 
                                // OR use result.newDocument if the library returns it (immutable mode).
                                // Let's rely on the mutated 'doc' (or newDoc if returned) to be safe.

                                // Standard fast-json-patch v3+: applyPatch(doc, patch) returns results array, modifies doc.
                                // If we want immutable: const newDoc = applyPatch(doc, patch, false, false).newDocument;

                                // Let's check what 'result' is. If it has .newDocument, use it.
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
                        eventSource.close();
                        if (onComplete) onComplete();
                        break;

                    case 'aui_error':
                        console.error('[AUIStreamHydrator] Stream error:', auiEvent.message);
                        setError(auiEvent.message);
                        setIsStreaming(false);
                        eventSource.close();
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

                    default:
                        console.warn('[AUIStreamHydrator] Unknown event type:', auiEvent.type);
                }
            } catch (err) {
                console.error('[AUIStreamHydrator] Failed to parse event:', err);
                setError('Failed to parse server event');
            }
        };

        eventSource.onerror = (err) => {
            console.error('[AUIStreamHydrator] EventSource error:', err);
            setError('Connection error');
            setIsStreaming(false);
            eventSource.close();
            if (onError) onError('Connection error');
        };

        // Cleanup on unmount
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [streamUrl]);

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                <strong>Stream Error:</strong> {error}
            </div>
        );
    }

    // Check if we have any extended events to display
    const hasExtendedEvents = messages.length > 0 || Object.keys(activities).length > 0 || toolCalls.length > 0 || runState;

    if (!componentSpec && !hasExtendedEvents) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-pulse text-[#666] font-mono text-sm">
                    Connecting to stream...
                </div>
            </div>
        );
    }

    // Dynamic component rendering (lazy load from registry)
    return (
        <div className="aui-stream-container">
            {isStreaming && (
                <div className="absolute top-2 right-2 flex items-center gap-2 text-[10px] text-neon-cyan font-mono">
                    <span className="animate-pulse">●</span>
                    STREAMING
                </div>
            )}

            {/* Render the component dynamically (if exists) */}
            {componentSpec && (
                <DynamicComponentRenderer
                    component={componentSpec.component}
                    props={componentSpec.props}
                />
            )}

            {/* Render messages if any */}
            {messages.length > 0 && (
                <div className="mb-4">
                    <MessageList messages={messages} />
                </div>
            )}

            {/* Render activities if any */}
            {Object.keys(activities).length > 0 && (
                <div className="mt-4 space-y-2">
                    {Object.values(activities).map(activity => (
                        <ActivityProgressBar key={activity.id} activity={activity} />
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
        </div>
    );
};

// Simple UI Components for extended events

const MessageList = ({ messages }) => (
    <div className="space-y-4">
        {messages.map(msg => (
            <div key={msg.id} className="bg-canvas-dark border border-neon-green/30 rounded-lg p-4 font-mono">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-neon-green text-xs font-semibold uppercase tracking-wider">
                        {msg.metadata?.type || msg.role}
                    </span>
                    {msg.metadata?.title && (
                        <span className="text-ink/60 text-xs">- {msg.metadata.title}</span>
                    )}
                    {msg.metadata?.word && (
                        <span className="text-ink/60 text-xs">- {msg.metadata.word}</span>
                    )}
                    {msg.isStreaming && (
                        <span className="text-neon-pink text-xs animate-pulse ml-auto">
                            ● streaming...
                        </span>
                    )}
                    {!msg.isStreaming && (
                        <span className="text-neon-cyan text-xs ml-auto">
                            ✓ complete
                        </span>
                    )}
                </div>
                <div className="text-ink text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content || (<span className="text-ink/40 italic">waiting for content...</span>)}
                </div>
            </div>
        ))}
    </div>
);

const ActivityProgressBar = ({ activity }) => (
    <div className="bg-canvas-dark border border-ink/20 rounded-lg p-3 font-mono text-sm">
        <div className="flex items-center justify-between mb-2">
            <span className="text-ink font-medium">{activity.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${activity.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                activity.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                    activity.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                }`}>
                {activity.status}
            </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-ink/10 rounded-full overflow-hidden mb-2">
            <div
                className="absolute h-full bg-neon-cyan transition-all duration-300"
                style={{ width: `${(activity.progress * 100).toFixed(0)}%` }}
            />
        </div>

        <div className="flex items-center justify-between text-xs text-ink/60">
            <span>{activity.current_step || 'Waiting...'}</span>
            <span>{(activity.progress * 100).toFixed(0)}%</span>
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
        <div className="bg-canvas-dark border border-ink/20 rounded-lg p-3 font-mono text-sm">
            <div className="text-ink font-medium mb-3">Tool Calls</div>
            <div className="space-y-3">
                {Object.entries(groupedCalls).map(([id, events]) => {
                    const startEvent = events.find(e => e.type === 'aui_tool_call_start');
                    const endEvent = events.find(e => e.type === 'aui_tool_call_end');
                    const resultEvent = events.find(e => e.type === 'aui_tool_call_result');

                    return (
                        <div key={id} className="border-l-2 border-neon-cyan/50 pl-3">
                            <div className="text-ink">🔧 {startEvent?.tool_name || 'Tool'}</div>
                            {endEvent && (
                                <div className="text-xs text-ink/60 mt-1">
                                    Status: {endEvent.status} ({endEvent.duration_ms?.toFixed(0)}ms)
                                </div>
                            )}
                            {resultEvent && resultEvent.result && (
                                <div className="text-xs text-neon-cyan mt-1">
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
    <div className="bg-canvas-dark border border-ink/20 rounded-lg p-3 font-mono text-sm">
        <div className="flex items-center gap-3">
            <span className="text-ink/60">Agent Run:</span>
            {runState.type === 'aui_run_started' && (
                <>
                    <span className="text-blue-400">🔄 Running</span>
                    <span className="text-xs text-ink/60">{runState.task_description}</span>
                </>
            )}
            {runState.type === 'aui_run_finished' && (
                <>
                    <span className="text-green-400">✅ Finished</span>
                    <span className="text-xs text-ink/60">{runState.duration_ms?.toFixed(0)}ms</span>
                </>
            )}
            {runState.type === 'aui_run_error' && (
                <>
                    <span className="text-red-400">❌ Error</span>
                    <span className="text-xs text-red-400/80">{runState.error_message}</span>
                </>
            )}
        </div>
    </div>
);

// Props: { streamUrl: string (required), onError?: func, onComplete?: func }

/**
 * DynamicComponentRenderer - Loads and renders components from the AUI registry
 */
const DynamicComponentRenderer = ({ component, props }) => {
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
            <Component {...props} />
        </React.Suspense>
    );
};

// Props: { component: string (required), props?: object }

export default AUIStreamHydrator;
