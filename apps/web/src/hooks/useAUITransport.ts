/**
 * useAUITransport - Unified transport abstraction for AUI streaming
 *
 * Manages WebSocket connections for AUI streaming.
 * Handles React StrictMode double-mount by checking connection instance identity.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface UseAUITransportConfig {
  url: string;
  onMessage?: (data: unknown) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
  params?: Record<string, unknown>;
}

interface ParsedWebSocketTarget {
  url: string;
  extractedParams: Record<string, unknown>;
}

interface AUIMessage {
  type?: string;
  [key: string]: unknown;
}

export function useAUITransport({
  url,
  onMessage,
  onError,
  onComplete,
  params = {},
}: UseAUITransportConfig) {
  const [isConnected, setIsConnected] = useState(false);

  const connectionRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(false);

  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalDisconnectRef = useRef(false);

  const configRef = useRef({ url, params });
  const callbacksRef = useRef({ onMessage, onError, onComplete });

  useEffect(() => {
    configRef.current = { url, params };
  });

  useEffect(() => {
    callbacksRef.current = { onMessage, onError, onComplete };
  });

  const getWebSocketUrl = useCallback(
    (inputUrl: string): ParsedWebSocketTarget => {
      let streamType = inputUrl;

      if (inputUrl.includes("/")) {
        const wsMatch = inputUrl.match(/\/api\/aui\/ws\/([^?]+)/);
        const streamMatch = inputUrl.match(/\/api\/aui\/stream\/([^?]+)/);
        const demoMatch = inputUrl.match(/\/api\/aui\/demo\/stream\/([^?]+)/);

        if (wsMatch) streamType = wsMatch[1];
        else if (streamMatch) streamType = streamMatch[1];
        else if (demoMatch) streamType = demoMatch[1];
      }

      const urlParams: Record<string, unknown> = {};
      try {
        const parsedUrl = new URL(inputUrl, window.location.origin);
        for (const [key, value] of parsedUrl.searchParams.entries()) {
          if (value === "true") urlParams[key] = true;
          else if (value === "false") urlParams[key] = false;
          else if (!Number.isNaN(Number(value)) && value !== "") {
            urlParams[key] = Number(value);
          } else {
            urlParams[key] = value;
          }

          if (key === "words" && typeof urlParams[key] === "string") {
            urlParams[key] = (urlParams[key] as string)
              .split(",")
              .map((item) => item.trim());
          }
        }
      } catch {
        // ignore
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;

      return {
        url: `${protocol}//${host}/api/aui/ws/${streamType}`,
        extractedParams: urlParams,
      };
    },
    [],
  );

  const connectWebSocketRef = useRef<(() => void) | null>(null);

  const connectWebSocket = useCallback(() => {
    connectWebSocketRef.current?.();
  }, []);

  const connectImpl = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (connectionRef.current || !isMountedRef.current) return;

    const { url: currentUrl, params: currentParams } = configRef.current;
    if (!currentUrl) return;

    const { url: wsUrl, extractedParams } = getWebSocketUrl(currentUrl);
    const mergedParams = { ...extractedParams, ...currentParams };

    try {
      const ws = new WebSocket(wsUrl);
      connectionRef.current = ws;

      const thisConnection = ws;
      isIntentionalDisconnectRef.current = false;

      ws.onopen = () => {
        if (connectionRef.current !== thisConnection || !isMountedRef.current) {
          ws.close();
          return;
        }

        setIsConnected(true);
        retryCountRef.current = 0;

        if (Object.keys(mergedParams).length > 0) {
          ws.send(JSON.stringify({ type: "params", data: mergedParams }));
        }
      };

      ws.onmessage = (event) => {
        if (connectionRef.current !== thisConnection || !isMountedRef.current)
          return;

        try {
          const data = JSON.parse(event.data) as AUIMessage;
          callbacksRef.current.onMessage?.(data);

          if (data.type === "aui_stream_end" || data.type === "aui_error") {
            isIntentionalDisconnectRef.current = true;
            ws.close();

            if (connectionRef.current === thisConnection) {
              connectionRef.current = null;
              setIsConnected(false);
            }

            callbacksRef.current.onComplete?.();
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = (event) => {
        if (connectionRef.current !== thisConnection) return;
        console.error("[AUI] WebSocket Error:", event);
      };

      ws.onclose = (event) => {
        if (connectionRef.current !== thisConnection || !isMountedRef.current)
          return;

        setIsConnected(false);
        connectionRef.current = null;

        if (isIntentionalDisconnectRef.current || event.code === 1000) {
          return;
        }

        const maxRetries = 5;
        if (retryCountRef.current < maxRetries) {
          const delay = 2 ** retryCountRef.current * 1000;
          console.log(
            `[AUI] WebSocket disconnected (Code: ${event.code}). Reconnecting in ${delay}ms... (Attempt ${retryCountRef.current + 1}/${maxRetries})`,
          );

          retryTimeoutRef.current = setTimeout(() => {
            retryCountRef.current += 1;
            connectWebSocket();
          }, delay);
        } else {
          console.error("[AUI] WebSocket max reconnections reached.");
          callbacksRef.current.onError?.(
            "Connection lost. Max retries reached.",
          );
          callbacksRef.current.onComplete?.();
        }
      };
    } catch (error) {
      console.error("WebSocket creation failed", error);
    }
  }, [connectWebSocket, getWebSocketUrl]);

  useLayoutEffect(() => {
    connectWebSocketRef.current = connectImpl;
  }, [connectImpl]);

  const connect = useCallback(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const send = useCallback((data: unknown) => {
    if (
      connectionRef.current &&
      connectionRef.current.readyState === WebSocket.OPEN
    ) {
      connectionRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  useLayoutEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (
          configRef.current.url &&
          !connectionRef.current &&
          !isIntentionalDisconnectRef.current
        ) {
          console.log("[AUI] Tab became visible. Attempting reconnection...");
          retryCountRef.current = 0;
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connect]);

  return {
    connect,
    disconnect,
    send,
    isConnected,
    transport: "websocket" as const,
  };
}

export default useAUITransport;
