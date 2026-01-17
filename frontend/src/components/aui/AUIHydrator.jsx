import React, { Suspense, useMemo } from 'react';
import { getComponent } from './registry';

/**
 * AUIHydrator: The "Body" that the Agent inhabits.
 * Takes a plain JSON packet and hydrates it into a live React Component.
 * 
 * @param {Object} props
 * @param {Object} props.packet - The AUI JSON payload (type="aui_render")
 * @param {Function} props.onInteract - Callback when user interacts with the component
 */
export const AUIHydrator = ({ packet, onInteract }) => {
    const Component = useMemo(() => {
        if (!packet || packet.type !== 'aui_render') return null;
        return getComponent(packet.ui.component);
    }, [packet]);

    if (!packet || packet.type !== 'aui_render') {
        return null;
    }

    const { ui, fallback_text } = packet;

    if (!Component) {
        // Fallback if component code not found on client
        return (
            <div className="p-4 border border-border rounded bg-bg-surface text-text-secondary">
                <p className="mb-2 text-xs uppercase tracking-widest text-text-muted">
                    AUI Fallback
                </p>
                <div className="whitespace-pre-wrap font-mono text-sm">
                    {fallback_text}
                </div>
            </div>
        );
    }

    return (
        <Suspense fallback={<div className="animate-pulse h-20 bg-bg-surface rounded" />}>
            <div className="aui-container my-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Component {...ui.props} onInteract={onInteract} packetId={packet.id} />
            </div>
        </Suspense>
    );
};
