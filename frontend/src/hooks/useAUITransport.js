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
   * Convert SSE URL to WebSocket URL
   * /api/aui/stream/story -> /api/aui/ws/story
   */
  const getWebSocketUrl = useCallback((sseUrl) => {
    let streamType = 'story';
    
    const streamMatch = sseUrl.match(/\/api\/aui\/stream\/([^?]+)/);
    if (streamMatch) {
      streamType = streamMatch[1];
    }
    
    const demoMatch = sseUrl.match(/\/api\/aui\/demo\/stream\/([^?]+)/);
    if (demoMatch) {
      streamType = demoMatch[1];
    }
    
    // Map SSE endpoint names to WebSocket stream types
    // Some SSE endpoints have different names than WebSocket types
    const streamTypeMap = {
      'vocab-patch-demo': 'vocab-patch',
      // state-demo now has its own WebSocket endpoint, no mapping needed
    };
    
    if (streamTypeMap[streamType]) {
      streamType = streamTypeMap[streamType];
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    return `${protocol}//${host}/api/aui/ws/${streamType}`;
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
    const wsUrl = getWebSocketUrl(currentUrl);
    
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
      
      if (currentParams && Object.keys(currentParams).length > 0) {
        ws.send(JSON.stringify({ type: 'params', data: currentParams }));
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
