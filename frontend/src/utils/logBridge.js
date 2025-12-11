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

function sendToBackend(level, message, ...args) {
    // Prevent infinite loops: don't log if the message is from our bridge itself
    // or if it's a network error related to the bridge.
    
    // Simple loop prevention: if we are already sending, don't send again?
    // Or just avoid logging errors from the fetch itself.
    
    const timestamp = new Date().toISOString();
    
    // Prepare data
    let data = null;
    if (args.length > 0) {
        try {
            // Simple serialization for additional arguments
            data = args.reduce((acc, arg, index) => {
                acc[`arg${index}`] = typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                return acc;
            }, {});
        } catch (e) {
            data = { error: "Could not serialize args" };
        }
    }

    // "Fire and forget" - we don't want to await this or catch errors loudly
    // to avoid polluting the console more or causing loops.
    fetch(BRIDGE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            level,
            message: String(message),
            data,
            timestamp
        })
    }).catch(err => {
        // SILENT FAILURE: Do not console.log here, or we get infinite loops!
    });
}

export function initLogBridge() {
    if (window.__LOG_BRIDGE_INITIALIZED__) return;
    window.__LOG_BRIDGE_INITIALIZED__ = true;

    ['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
        console[level] = function (...args) {
            // 1. Call original method (so it still shows in browser devtools)
            originalConsole[level].apply(console, args);

            // 2. Send to backend
            try {
                sendToBackend(level, ...args);
            } catch (e) {
                // Formatting error, ignore
            }
        };
    });
    
    console.log("Log Bridge initialized. Logs are now streaming to backend.");
}
