import React from 'react';
import { Card, Button } from "../../ui";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useAUI } from '../AUIContext';

/**
 * InteractiveDemo Component
 * 
 * Demonstrates AUI Human-in-the-Loop interaction.
 * Renders a status message and option buttons.
 * Uses WebSocket via AUI Context when available, falls back to HTTP POST.
 * 
 * Props:
 * - status: 'processing' | 'waiting_input' | 'success' | 'cancelled' | 'error'
 * - message: Display text
 * - sessionId: Required for correlation
 * - options: Array of { label, action, variant }
 */
const InteractiveDemo = ({
    status = 'processing',
    message = 'Initializing...',
    sessionId,
    options = []
}) => {
    const [submitting, setSubmitting] = React.useState(false);
    const { transport, isConnected, send } = useAUI();

    // Status config map
    const config = {
        processing: {
            icon: <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />,
            color: "border-blue-200 bg-blue-50 dark:bg-blue-950/20"
        },
        waiting_input: {
            icon: <RefreshCw className="w-8 h-8 text-amber-500" />,
            color: "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
        },
        success: {
            icon: <CheckCircle2 className="w-8 h-8 text-green-500" />,
            color: "border-green-200 bg-green-50 dark:bg-green-950/20"
        },
        cancelled: {
            icon: <XCircle className="w-8 h-8 text-gray-400" />,
            color: "border-gray-200 bg-gray-50 dark:bg-gray-800/50"
        },
        error: {
            icon: <XCircle className="w-8 h-8 text-red-500" />,
            color: "border-red-200 bg-red-50 dark:bg-red-950/20"
        }
    };

    const currentConfig = config[status] || config.processing;

    const handleAction = async (action) => {
        if (!sessionId) {
            return;
        }

        setSubmitting(true);
        try {
            // Try WebSocket first if available
            if (transport === 'websocket' && isConnected && send) {
                const sent = send({
                    type: 'input',
                    session_id: sessionId,
                    action: action,
                    payload: { timestamp: Date.now() }
                });
                if (sent) {
                    setSubmitting(false);
                    return;
                }
                // Fall through to HTTP if WebSocket send failed
            }

            // Fallback: Send via HTTP POST
            const response = await fetch('/api/aui/input', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    action: action,
                    payload: { timestamp: Date.now() }
                }),
            });

            if (!response.ok) {
                throw new Error(`Input submission failed: ${response.statusText}`);
            }
            // Success - The agent stream will update the UI state shortly
        } catch (error) {
            // Silently handle errors
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className={`w-full max-w-md mx-auto transition-all duration-300 ${currentConfig.color}`}>
            <div className="pt-6 flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-white dark:bg-black rounded-full shadow-sm">
                    {currentConfig.icon}
                </div>

                <div className="space-y-2">
                    <p className="font-medium text-lg">{message}</p>
                    {status === 'processing' && (
                        <p className="text-xs text-muted-foreground animate-pulse">Waiting for agent...</p>
                    )}
                </div>

                {/* Action Buttons */}
                {options.length > 0 && (
                    <div className="flex gap-3 mt-4 w-full justify-center">
                        {options.map((opt) => (
                            <Button
                                key={opt.action}
                                variant={opt.variant === 'destructive' ? 'danger' : (opt.variant || 'primary')}
                                onClick={() => handleAction(opt.action)}
                                isLoading={submitting}
                                className="min-w-[100px]"
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default InteractiveDemo;

