/**
 * useAUITransport - Unified transport abstraction for AUI streaming
 * 
 * Abstracts SSE (EventSource) and WebSocket connections for AUI streaming.
 * Event format is identical regardless of transport layer.
 * 
 * Handles React StrictMode double-mount by checking connection instance identity.
 */

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';

export function useAUITransport({
  url,
  transport = 'sse',
  onMessage,
  onError,
  onComplete,
  params = {},
}) {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef(null);
  const isMountedRef = useRef(false);
  
  // Store all changing values in refs to avoid stale closures and infinite loops
  const configRef = useRef({ url, transport, params });
  const callbacksRef = useRef({ onMessage, onError, onComplete });
  
  // Keep refs fresh without triggering re-renders
  useEffect(() => {
    configRef.current = { url, transport, params };
  });
  
  useEffect(() => {
    callbacksRef.current = { onMessage, onError, onComplete };
  });

  /**
   * Convert SSE URL to WebSocket URL and extract params
   * /api/aui/stream/story?content=... -> { url: /api/aui/ws/story, params: {content: ...} }
   */
  const getWebSocketUrl = useCallback((sseUrl) => {
    let streamType = 'story';
    
    // Extract stream type from SSE URL
    const streamMatch = sseUrl.match(/\/api\/aui\/stream\/([^?]+)/);
    if (streamMatch) {
      streamType = streamMatch[1];
    }
    
    const demoMatch = sseUrl.match(/\/api\/aui\/demo\/stream\/([^?]+)/);
    if (demoMatch) {
      streamType = demoMatch[1];
    }
    
    // Map SSE endpoint names to WebSocket stream types
    const streamTypeMap = {
      'vocab-patch-demo': 'vocab-patch',
    };
    
    if (streamTypeMap[streamType]) {
      streamType = streamTypeMap[streamType];
    }
    
    // Extract query params from SSE URL
    const urlParams = {};
    try {
      const url = new URL(sseUrl, window.location.origin);
      for (const [key, value] of url.searchParams.entries()) {
        // Parse numbers and booleans
        if (value === 'true') urlParams[key] = true;
        else if (value === 'false') urlParams[key] = false;
        else if (!isNaN(Number(value)) && value !== '') urlParams[key] = Number(value);
        else urlParams[key] = value;
        
        // Special handling for comma-separated arrays (e.g., words=a,b,c)
        if (key === 'words' && typeof urlParams[key] === 'string') {
          urlParams[key] = urlParams[key].split(',').map(w => w.trim());
        }
      }
    } catch (e) {
      // Fallback: no params
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    return {
      url: `${protocol}//${host}/api/aui/ws/${streamType}`,
      extractedParams: urlParams
    };
  }, []);

  /**
   * Connect using SSE (EventSource)
   */
  const connectSSE = useCallback(() => {
    if (connectionRef.current || !isMountedRef.current) {
      return;
    }

    const { url: currentUrl } = configRef.current;
    const eventSource = new EventSource(currentUrl);
    connectionRef.current = eventSource;

    // Capture the instance for closure comparison
    const thisConnection = eventSource;

    eventSource.onopen = () => {
      // Verify this is still the active connection
      if (connectionRef.current !== thisConnection || !isMountedRef.current) return;
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      // Verify this is still the active connection
      if (connectionRef.current !== thisConnection || !isMountedRef.current) return;
      
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onMessage?.(data);
        
        if (data.type === 'aui_stream_end' || data.type === 'aui_error') {
          eventSource.close();
          if (connectionRef.current === thisConnection) {
            connectionRef.current = null;
            setIsConnected(false);
          }
          callbacksRef.current.onComplete?.();
        }
      } catch (e) {
        // Silently ignore parse errors
      }
    };

    eventSource.onerror = (err) => {
      // Verify this is still the active connection (CRITICAL for StrictMode)
      if (connectionRef.current !== thisConnection || !isMountedRef.current) return;
      
      callbacksRef.current.onError?.(err);
      setIsConnected(false);
      eventSource.close();
      connectionRef.current = null;
    };
  }, []);

  /**
   * Connect using WebSocket
   */
  const connectWebSocket = useCallback(() => {
    if (connectionRef.current || !isMountedRef.current) {
      return;
    }

    const { url: currentUrl, params: currentParams } = configRef.current;
    const { url: wsUrl, extractedParams } = getWebSocketUrl(currentUrl);
    
    // Merge extracted URL params with user-provided params (user params take precedence)
    const mergedParams = { ...extractedParams, ...currentParams };
    
    const ws = new WebSocket(wsUrl);
    connectionRef.current = ws;

    // Capture the instance for closure comparison
    // This is CRITICAL for handling StrictMode's async event timing
    const thisConnection = ws;

    ws.onopen = () => {
      // Verify this is still the active connection
      if (connectionRef.current !== thisConnection) {
        ws.close();
        return;
      }
      if (!isMountedRef.current) {
        ws.close();
        return;
      }
      
      setIsConnected(true);
      
      // Always send params (including extracted ones from SSE URL)
      if (mergedParams && Object.keys(mergedParams).length > 0) {
        ws.send(JSON.stringify({ type: 'params', data: mergedParams }));
      }
    };

    ws.onmessage = (event) => {
      // Verify this is still the active connection
      if (connectionRef.current !== thisConnection || !isMountedRef.current) return;
      
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onMessage?.(data);
      } catch (e) {
        // Silently ignore parse errors
      }
    };

    ws.onerror = (err) => {
      // Verify this is still the active connection (CRITICAL for StrictMode)
      // When the first connection is closed, its error event fires AFTER remount
      // At that point, connectionRef.current is either null or a new connection
      if (connectionRef.current !== thisConnection) return;
      if (!isMountedRef.current) return;
      
      callbacksRef.current.onError?.(err);
    };

    ws.onclose = () => {
      // Verify this is still the active connection
      if (connectionRef.current !== thisConnection) return;
      if (!isMountedRef.current) return;
      
      setIsConnected(false);
      connectionRef.current = null;
      callbacksRef.current.onComplete?.();
    };
  }, [getWebSocketUrl]);

  /**
   * Connect using the configured transport
   */
  const connect = useCallback(() => {
    const { transport: currentTransport } = configRef.current;
    if (currentTransport === 'websocket') {
      connectWebSocket();
    } else {
      connectSSE();
    }
  }, [connectSSE, connectWebSocket]);

  /**
   * Disconnect current connection
   */
  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
      setIsConnected(false);
    }
  }, []);

  /**
   * Send data (WebSocket only)
   */
  const send = useCallback((data) => {
    const { transport: currentTransport } = configRef.current;
    if (currentTransport !== 'websocket') {
      return false;
    }
    
    if (connectionRef.current && connectionRef.current.readyState === WebSocket.OPEN) {
      connectionRef.current.send(JSON.stringify(data));
      return true;
    }
    
    return false;
  }, []);

  // Track mount state - useLayoutEffect ensures this runs before useEffect
  useLayoutEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    send,
    isConnected,
    transport,
  };
}

export default useAUITransport;
