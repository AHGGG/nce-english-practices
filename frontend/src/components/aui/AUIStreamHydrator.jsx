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
                        // Backward compatible with AUIRenderPacket
                        setComponentSpec({
                            component: auiEvent.ui.component,
                            props: auiEvent.ui.props,
                            intention: auiEvent.intention,
                            targetLevel: auiEvent.target_level
                        });
                        break;

                    case 'aui_text_delta':
                        // Accumulate text deltas
                        const { message_id, delta, field_path } = auiEvent;

                        setAccumulatedText(prev => {
                            const key = `${message_id}.${field_path}`;
                            return {
                                ...prev,
                                [key]: (prev[key] || '') + delta
                            };
                        });

                        // Update component props with accumulated text
                        setComponentSpec(prev => {
                            if (!prev) return null;

                            const updatedProps = { ...prev.props };
                            const path = field_path.split('.');

                            // Navigate to nested field (e.g. "story.content")
                            let current = updatedProps;
                            for (let i = 0; i < path.length - 1; i++) {
                                if (!current[path[i]]) current[path[i]] = {};
                                current = current[path[i]];
                            }

                            // Set accumulated value
                            const key = `${message_id}.${field_path}`;
                            current[path[path.length - 1]] = accumulatedText[key] || '';

                            return { ...prev, props: updatedProps };
                        });
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

    if (!componentSpec) {
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

            {/* Render the component dynamically */}
            <DynamicComponentRenderer
                component={componentSpec.component}
                props={componentSpec.props}
            />
        </div>
    );
};

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
