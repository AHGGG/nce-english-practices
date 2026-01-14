/**
 * SSE Stream Parser Utility
 * 
 * Unified parsing of Server-Sent Events (SSE) streams used throughout the app.
 * Handles both JSON-based SSE (with type field) and raw text SSE formats.
 */

/**
 * Parse a JSON-based SSE stream (used by overview, simplify endpoints)
 * 
 * @param {Response} response - fetch Response object
 * @param {Object} handlers - Callback handlers
 * @param {Function} handlers.onChunk - Called with content string for each chunk
 * @param {Function} handlers.onDone - Called with done data object when stream ends
 * @param {Function} handlers.onError - Called if an error occurs
 * @returns {Promise<void>}
 * 
 * @example
 * await parseJSONSSEStream(response, {
 *     onChunk: (content) => setText(prev => prev + content),
 *     onDone: (data) => setFinalData(data.overview)
 * });
 */
export async function parseJSONSSEStream(response, handlers = {}) {
    const { onChunk, onDone, onError } = handlers;
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            
            for (const line of chunk.split('\n')) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'chunk') {
                            onChunk?.(data.content);
                        } else if (data.type === 'done') {
                            onDone?.(data);
                        } else if (data.type === 'error') {
                            onError?.(new Error(data.message || 'Stream error'));
                        } else {
                            // Handle custom event types (e.g., 'image_check')
                            handlers.onEvent?.(data.type, data);
                        }
                    } catch (parseError) {
                        // Non-JSON line, ignore
                    }
                }
            }
        }
    } catch (error) {
        onError?.(error);
    }
}

/**
 * Parse a raw text SSE stream (used by explain-word endpoint)
 * 
 * @param {Response} response - fetch Response object
 * @param {Object} handlers - Callback handlers
 * @param {Function} handlers.onText - Called with each text chunk
 * @param {Function} handlers.onDone - Called when stream ends normally
 * @param {Function} handlers.onError - Called if an error occurs
 * @param {Object} options - Additional options
 * @param {Object} options.abortCheck - Function returning true if stream should be aborted
 * @returns {Promise<void>}
 * 
 * @example
 * await parseTextSSEStream(response, {
 *     onText: (text) => setExplanation(prev => prev + text),
 *     onDone: () => setIsStreaming(false)
 * });
 */
export async function parseTextSSEStream(response, handlers = {}, options = {}) {
    const { onText, onDone, onError } = handlers;
    const { abortCheck } = options;
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    try {
        while (true) {
            // Check if we should abort
            if (abortCheck?.()) {
                await reader.cancel();
                return;
            }
            
            const { done, value } = await reader.read();
            if (done) {
                onDone?.();
                break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            
            for (const line of chunk.split('\n')) {
                if (abortCheck?.()) {
                    await reader.cancel();
                    return;
                }
                
                if (line.startsWith('data: ')) {
                    const text = line.slice(6);
                    
                    if (text === '[DONE]') {
                        onDone?.();
                        return;
                    } else if (text.startsWith('[ERROR]')) {
                        onError?.(new Error(text));
                        return;
                    } else {
                        // Decode [NL] markers back to actual newlines (preserves markdown formatting)
                        const decodedText = text.replace(/\[NL\]/g, '\n');
                        onText?.(decodedText);
                    }
                }
            }
        }
    } catch (error) {
        onError?.(error);
    }
}

/**
 * Check if a response is an SSE stream
 * @param {Response} response - fetch Response object
 * @returns {boolean}
 */
export function isSSEResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('text/event-stream');
}

export default {
    parseJSONSSEStream,
    parseTextSSEStream,
    isSSEResponse
};
