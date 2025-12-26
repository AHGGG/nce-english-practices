/**
 * Log Bridge
 * Intercepts console logs and sends them to the backend.
 */

const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
};

const BRIDGE_ENDPOINT = '/api/logs';

function formatError(error) {
    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack
        };
    }
    return error;
}

/**
 * Detect log category from message content.
 * Uses generic patterns that work across any vendor.
 */
function detectCategory(message) {
    const msg = String(message).toLowerCase();
    
    // Lifecycle events
    if (['connected', 'disconnected', 'initialized', 'closed', 'started', 'stopped', 'ready', 'session'].some(kw => msg.includes(kw))) {
        return 'lifecycle';
    }
    
    // User input (STT, transcripts)
    if (['transcript', 'user said', 'user input', 'speech-to-text', 'stt', 'recognition'].some(kw => msg.includes(kw))) {
        return 'user_input';
    }
    
    // Agent output (TTS, responses)
    if (['agent', 'assistant', 'response', 'text-to-speech', 'tts', 'speaking'].some(kw => msg.includes(kw))) {
        return 'agent_output';
    }
    
    // Audio processing
    if (['audio', 'playback', 'chunk', 'sample rate', 'buffer', 'pcm', 'mp3', 'wav'].some(kw => msg.includes(kw))) {
        return 'audio';
    }
    
    // Function/tool calls
    if (['function', 'tool', 'calling', 'invoke', 'execute'].some(kw => msg.includes(kw))) {
        return 'function_call';
    }
    
    // Network/API
    if (['websocket', 'api', 'fetch', 'request', 'latency', 'timeout'].some(kw => msg.includes(kw))) {
        return 'network';
    }
    
    return 'general';
}

function sendToBackend(level, message, ...args) {
    const timestamp = new Date().toISOString();
    
    // Prepare data
    let data = {};
    let finalMessage = message;
    let stackTrace = null;
    let errName = null;

    // 1. Check if the primary message is an Error
    if (message instanceof Error) {
        const fmt = formatError(message);
        finalMessage = fmt.message;
        stackTrace = fmt.stack;
        errName = fmt.name;
    } else {
        finalMessage = String(message);
    }

    // 2. Scan args for Errors if we haven't found a stack trace yet
    // This handles cases like: console.error("Something went wrong", errorObj)
    args.forEach(arg => {
        if (!stackTrace && arg instanceof Error) {
            const fmt = formatError(arg);
            stackTrace = fmt.stack;
            errName = fmt.name;
        }
        
        // Also capture stack from plain objects with stack property (like Vite errors)
        if (!stackTrace && typeof arg === 'object' && arg !== null && arg.stack) {
            stackTrace = arg.stack;
            errName = arg.name || arg.errorName || 'Error';
        }
    });

    if (stackTrace) {
        data.stack = stackTrace;
        data.errorName = errName;
    }

    if (args.length > 0) {
        try {
            const argsData = args.reduce((acc, arg, index) => {
                // Handle Error objects in arguments
                const val = arg instanceof Error ? formatError(arg) : arg;
                
                // Safe stringify
                try {
                    acc[`arg${index}`] = typeof val === 'object' ? JSON.stringify(val) : String(val);
                } catch (err) {
                    acc[`arg${index}`] = '[Circular/Unserializable]';
                }
                return acc;
            }, {});
            
            data = { ...data, ...argsData };
        } catch (e) {
            data = { ...data, serializationError: "Could not serialize args" };
        }
    }

    // Detect category from message
    const category = detectCategory(finalMessage);

    // Use Beacon API if available (non-blocking, reliable)
    if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({
            level,
            message: finalMessage,
            data,
            category,
            timestamp
        })], { type: 'application/json' });
        navigator.sendBeacon(BRIDGE_ENDPOINT, blob);
    } else {
        // Fallback to fetch
        fetch(BRIDGE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                level,
                message: finalMessage,
                data,
                category,
                timestamp
            })
        }).catch(err => {
            // Use originalConsole to avoid infinite loops
            originalConsole.error("[LogBridge] Failed to send log:", err);
        });
    }
}

export function initLogBridge() {
    if (window.__LOG_BRIDGE_INITIALIZED__) return;
    window.__LOG_BRIDGE_INITIALIZED__ = true;

    // 1. Intercept Console
    ['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
        console[level] = function (...args) {
            // Call original method
            originalConsole[level].apply(console, args);

            // Send to backend
            try {
                sendToBackend(level, ...args);
            } catch (e) {
                // Ignore internal errors
            }
        };
    });

    // 2. Global Error Handler (Uncaught Exceptions)
    window.addEventListener('error', (event) => {
        try {
            sendToBackend('error', `[Uncaught] ${event.message}`, event.error);
        } catch (e) { /* ignore */ }
    });

    // 3. Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
        try {
            sendToBackend('error', `[Unhandled Rejection] ${event.reason ? (event.reason.message || event.reason) : 'Unknown'}`, event.reason);
        } catch (e) { /* ignore */ }
    });

    // 4. Vite Error Overlay (Development Only)
    // Intercept Vite's error overlay to capture build/compile errors
    if (import.meta.env.DEV) {
        // Monitor for Vite error overlay in DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // Vite error overlay has id="vite-error-overlay"
                    if (node.id === 'vite-error-overlay' || 
                        (node.shadowRoot && node.shadowRoot.querySelector('.message-body'))) {
                        
                        try {
                            // Extract error message from overlay
                            const errorBody = node.shadowRoot?.querySelector('.message-body')?.textContent ||
                                            node.shadowRoot?.querySelector('pre')?.textContent ||
                                            node.textContent;
                            
                            const errorTitle = node.shadowRoot?.querySelector('.message')?.textContent || 'Vite Build Error';
                            
                            if (errorBody) {
                                sendToBackend('error', `[Vite] ${errorTitle}`, {
                                    stack: errorBody,
                                    source: 'vite-overlay',
                                    timestamp: new Date().toISOString()
                                });
                            }
                        } catch (e) {
                            originalConsole.error('[LogBridge] Failed to capture Vite error:', e);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: false });
        
        // Also listen for vite:error custom event (if available)
        window.addEventListener('vite:error', (event) => {
            try {
                const detail = event.detail || {};
                sendToBackend('error', `[Vite Event] ${detail.message || 'Build Error'}`, {
                    stack: detail.stack || detail.error?.stack,
                    file: detail.filename,
                    source: 'vite-event'
                });
            } catch (e) { /* ignore */ }
        });
    }
    
    console.log("Log Bridge initialized. Logs are now streaming to backend.");
    // Test the bridge immediately
    sendToBackend('info', 'LogBridge Connection Test: Initialized successfully');
}
