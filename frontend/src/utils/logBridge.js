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

    fetch(BRIDGE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            level,
            message: finalMessage,
            data,
            timestamp
        })
    }).catch(err => {
        // Use originalConsole to avoid infinite loops
        originalConsole.error("[LogBridge] Failed to send log:", err);
    });
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
    
    console.log("Log Bridge initialized. Logs are now streaming to backend.");
    // Test the bridge immediately
    sendToBackend('info', 'LogBridge Connection Test: Initialized successfully');
}
