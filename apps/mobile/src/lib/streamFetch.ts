/**
 * Streaming fetch for React Native
 */

import { fetch as fetchPolyfill } from "react-native-fetch-api";
import { TextDecoder } from "text-encoding";

let textDecoder: TextDecoder | null = null;

export function getTextDecoder(): TextDecoder {
  if (!textDecoder) {
    textDecoder = new TextDecoder();
  }
  return textDecoder;
}

export async function streamFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  console.log("[streamFetch] URL:", url);

  const response = await fetchPolyfill(url, {
    ...options,
    reactNative: {
      networking: true,
    },
  });

  console.log("[streamFetch] Response status:", response.status);

  return response;
}

export async function readStreamLineByLine(
  body: ReadableStream<Uint8Array> | null,
  onLine: (line: string) => void,
): Promise<void> {
  if (!body) {
    console.log("[readStreamLineByLine] body is null");
    return;
  }

  let reader;
  try {
    reader = body.getReader();
  } catch (e) {
    console.error("[readStreamLineByLine] getReader failed:", e);
    return;
  }

  const decoder = getTextDecoder();
  let buffer = "";
  let readCount = 0;
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();
      readCount++;

      if (result.done) {
        console.log(
          "[readStreamLineByLine] Stream done, reads:",
          readCount,
          "bytes:",
          totalBytes,
        );
        if (buffer.trim()) {
          onLine(buffer);
        }
        break;
      }

      let chunk = result.value;

      // Handle different chunk types
      if (typeof chunk === "number") {
        totalBytes += 1;
        const char = String.fromCharCode(chunk);
        buffer += char;
      } else if (chunk instanceof Uint8Array) {
        totalBytes += chunk.length;
        const decodedChunk = decoder.decode(chunk, { stream: true });
        console.log(
          "[readStreamLineByLine] Chunk (uint8):",
          readCount,
          "bytes:",
          chunk.length,
        );
        buffer += decodedChunk;
      } else if (ArrayBuffer.isView(chunk)) {
        const uint8 = new Uint8Array(
          chunk.buffer,
          chunk.byteOffset,
          chunk.byteLength,
        );
        totalBytes += uint8.length;
        const decodedChunk = decoder.decode(uint8, { stream: true });
        console.log(
          "[readStreamLineByLine] Chunk (view):",
          readCount,
          "bytes:",
          uint8.length,
        );
        buffer += decodedChunk;
      } else if (chunk instanceof ArrayBuffer) {
        const uint8 = new Uint8Array(chunk);
        totalBytes += uint8.length;
        const decodedChunk = decoder.decode(uint8, { stream: true });
        console.log(
          "[readStreamLineByLine] Chunk (buffer):",
          readCount,
          "bytes:",
          uint8.length,
        );
        buffer += decodedChunk;
      } else if (typeof chunk === "string") {
        totalBytes += chunk.length;
        buffer += chunk;
      } else {
        try {
          buffer += String(chunk);
        } catch {}
      }

      // Optimization: Only split if buffer contains newline
      if (buffer.includes("\n")) {
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            onLine(line);
          }
        }
      }
    }
  } catch (e) {
    console.error("[readStreamLineByLine] Error:", e);
  }
}
