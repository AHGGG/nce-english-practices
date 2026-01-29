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
 * Supports both browser fetch and React Native (which uses arrayBuffer)
 */
export async function parseJSONSSEStream(
  response: Response,
  handlers: SSEHandlers = {},
) {
  const { onChunk, onDone, onError, onEvent } = handlers;

  if (!response.body) return;

  let reader: ReadableStreamDefaultReader | null = null;
  let decoder: TextDecoder | null = null;
  let buffer = "";

  // Check if getReader is available (browser)
  if (typeof response.body.getReader === "function") {
    reader = response.body.getReader();
    decoder = new TextDecoder();
  } else {
    // React Native fallback: read entire body and parse
    try {
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      decoder = new TextDecoder();
      const fullText = decoder.decode(uint8Array);

      // Process the entire text as SSE format
      const lines = fullText.split("\n");
      for (const line of lines) {
        processLine(line);
      }
      onDone?.({});
      return;
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
      return;
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder!.decode(value, { stream: true });
      }

      if (done) {
        // Process remaining buffer
        if (buffer.trim()) {
          const lines = buffer.split("\n");
          for (const line of lines) {
            processLine(line);
          }
        }
        break;
      }

      // Process complete lines
      const lines = buffer.split("\n");
      // Keep the last segment (potentially incomplete) in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        processLine(line);
      }
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }

  function processLine(line: string) {
    if (!line.trim()) return;

    if (line.startsWith("data: ")) {
      try {
        const data = JSON.parse(line.slice(6));

        if (data.type === "chunk") {
          onChunk?.(data.content);
        } else if (data.type === "done") {
          onDone?.(data);
        } else if (data.type === "error") {
          onError?.(new Error(data.message || "Stream error"));
        } else {
          onEvent?.(data.type, data);
        }
      } catch {
        // Non-JSON line, ignore
      }
    }
  }
}

/**
 * Parse a raw text SSE stream
 * Supports both browser fetch and React Native
 */
export async function parseTextSSEStream(
  response: Response,
  handlers: TextSSEHandlers = {},
  options: TextSSEOptions = {},
) {
  const { onText, onDone, onError } = handlers;
  const { abortCheck } = options;

  if (!response.body) return;

  let reader: ReadableStreamDefaultReader | null = null;
  let decoder: TextDecoder | null = null;
  let buffer = "";

  // Check if getReader is available (browser)
  if (typeof response.body.getReader === "function") {
    reader = response.body.getReader();
    decoder = new TextDecoder();
  } else {
    // React Native fallback: read entire body and parse
    try {
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      decoder = new TextDecoder();
      const fullText = decoder.decode(uint8Array);

      const lines = fullText.split("\n");
      for (const line of lines) {
        if (processTextLine(line)) break;
      }
      onDone?.();
      return;
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
      return;
    }
  }

  try {
    while (true) {
      if (abortCheck?.()) {
        await reader!.cancel();
        return;
      }

      const { done, value } = await reader!.read();

      if (value) {
        buffer += decoder!.decode(value, { stream: true });
      }

      if (done) {
        if (buffer.trim()) {
          const lines = buffer.split("\n");
          for (const line of lines) {
            if (processTextLine(line)) return;
          }
        }
        onDone?.();
        break;
      }

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (abortCheck?.()) {
          await reader!.cancel();
          return;
        }
        if (processTextLine(line)) return;
      }
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }

  function processTextLine(line: string): boolean {
    if (line.startsWith("data: ")) {
      const text = line.slice(6);

      if (text === "[DONE]") {
        onDone?.();
        return true; // Stop processing
      } else if (text.startsWith("[ERROR]")) {
        onError?.(new Error(text));
        return true; // Stop processing
      } else {
        const decodedText = text.replace(/\[NL\]/g, "\n");
        onText?.(decodedText);
      }
    }
    return false;
  }
}

export function isSSEResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("text/event-stream");
}
