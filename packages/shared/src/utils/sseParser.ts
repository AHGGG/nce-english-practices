export interface SSEHandlers {
    onChunk?: (content: string) => void;
    onDone?: (data: any) => void;
    onError?: (error: Error) => void;
    onEvent?: (type: string, data: any) => void;
}

export interface TextSSEHandlers {
    onText?: (text: string) => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
}

export interface TextSSEOptions {
    abortCheck?: () => boolean;
}

/**
 * Parse a JSON-based SSE stream
 */
export async function parseJSONSSEStream(response: Response, handlers: SSEHandlers = {}) {
    const { onChunk, onDone, onError, onEvent } = handlers;
    
    if (!response.body) return;
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
                            onEvent?.(data.type, data);
                        }
                    } catch {
                        // Non-JSON line, ignore
                    }
                }
            }
        }
    } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
    }
}

/**
 * Parse a raw text SSE stream
 */
export async function parseTextSSEStream(response: Response, handlers: TextSSEHandlers = {}, options: TextSSEOptions = {}) {
    const { onText, onDone, onError } = handlers;
    const { abortCheck } = options;
    
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    try {
        while (true) {
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
                        const decodedText = text.replace(/\[NL\]/g, '\n');
                        onText?.(decodedText);
                    }
                }
            }
        }
    } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
    }
}

export function isSSEResponse(response: Response): boolean {
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('text/event-stream');
}
