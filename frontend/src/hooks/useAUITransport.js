/**
 * useAUITransport - Unified transport abstraction for AUI streaming
 * 
 * Manages WebSocket connections for AUI streaming.
 * Handles React StrictMode double-mount by checking connection instance identity.
 */

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';

export function useAUITransport({
  url,
  onMessage,
  onError,
  onComplete,
  params = {},
}) {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef(null);
  const isMountedRef = useRef(false);
  
  // Reconnection state
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  const isIntentionalDisconnectRef = useRef(false);
  
  // Store all changing values in refs to avoid stale closures and infinite loops
  const configRef = useRef({ url, params });
  const callbacksRef = useRef({ onMessage, onError, onComplete });
  
  // Keep refs fresh without triggering re-renders
  useEffect(() => {
    configRef.current = { url, params };
  });
  
  useEffect(() => {
    callbacksRef.current = { onMessage, onError, onComplete };
  });

  /**
   * Normalize Stream URL to WebSocket format
   * Supports inputs like: 
   * - Full URL: http://localhost/api/aui/ws/story
   * - Path: /api/aui/ws/story
   * - Type: story
   * - API Path: /api/aui/stream/story (Backward compat)
   */
  const getWebSocketUrl = useCallback((inputUrl) => {
    // 1. Extract base stream type or path
    let streamType = inputUrl;
    
    // Check if it looks like a full URL or path
    if (inputUrl.includes('/')) {
        // Try to extract known patterns
        const wsMatch = inputUrl.match(/\/api\/aui\/ws\/([^?]+)/);
        const streamMatch = inputUrl.match(/\/api\/aui\/stream\/([^?]+)/);
        const demoMatch = inputUrl.match(/\/api\/aui\/demo\/stream\/([^?]+)/);
        
        if (wsMatch) streamType = wsMatch[1];
        else if (streamMatch) streamType = streamMatch[1];
        else if (demoMatch) streamType = demoMatch[1];
    }
    
    // 2. Map legacy names
    const streamTypeMap = {
      'vocab-patch-demo': 'vocab-patch',
      'state-snapshot': 'state-snapshot', // ensure pass-through
    };
    
    if (streamTypeMap[streamType]) {
      streamType = streamTypeMap[streamType];
    }
    
    // 3. Extract query params from input URL
    const urlParams = {};
    try {
      // Dummy base if relative path
      const url = new URL(inputUrl, window.location.origin); 
      for (const [key, value] of url.searchParams.entries()) {
        // Parse numbers and booleans
        if (value === 'true') urlParams[key] = true;
        else if (value === 'false') urlParams[key] = false;
        else if (!isNaN(Number(value)) && value !== '') urlParams[key] = Number(value);
        else urlParams[key] = value;
        
        // Special handling for comma-separated arrays
        if (key === 'words' && typeof urlParams[key] === 'string') {
          urlParams[key] = urlParams[key].split(',').map(w => w.trim());
        }
      }
    } catch (e) {
      // Not a valid URL structure, ignore
    }
    
    // 4. Construct final WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    return {
      url: `${protocol}//${host}/api/aui/ws/${streamType}`,
      extractedParams: urlParams
    };
  }, []);



  /**
   * Connect using WebSocket with Auto-Reconnect
   */
  const connectWebSocket = useCallback(() => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (connectionRef.current) {
        // If already connected/connecting, checking readyState might be good
        return; 
    }
    
    if (!isMountedRef.current) return;

    const { url: currentUrl, params: currentParams } = configRef.current;
    if (!currentUrl) return;

    const { url: wsUrl, extractedParams } = getWebSocketUrl(currentUrl);
    
    // Merge extracted URL params with user-provided params (user params take precedence)
    const mergedParams = { ...extractedParams, ...currentParams };
    
    try {
        const ws = new WebSocket(wsUrl);
        connectionRef.current = ws;

        // Capture the instance for closure comparison
        const thisConnection = ws;
        isIntentionalDisconnectRef.current = false;

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
            retryCountRef.current = 0; // Reset retry count on success
            
            // Always send params (including extracted ones from SSE URL)
            if (mergedParams && Object.keys(mergedParams).length > 0) {
                ws.send(JSON.stringify({ type: 'params', data: mergedParams }));
            }
        };

        ws.onmessage = (event) => {
            if (connectionRef.current !== thisConnection || !isMountedRef.current) return;
            
            try {
                const data = JSON.parse(event.data);
                callbacksRef.current.onMessage?.(data);

                // Handle stream completion events
                if (data.type === 'aui_stream_end' || data.type === 'aui_error') {
                    // Mark as intentional to prevent auto-reconnect
                    isIntentionalDisconnectRef.current = true;
                    
                    ws.close(); // This will trigger onclose, but we set the flag above
                    
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

        ws.onerror = (err) => {
            if (connectionRef.current !== thisConnection) return;
            console.error('[AUI] WebSocket Error:', err);
        };

        ws.onclose = (event) => {
            if (connectionRef.current !== thisConnection) return;
            if (!isMountedRef.current) return;
            
            setIsConnected(false);
            connectionRef.current = null;
            
            // If intentional disconnect OR Normal Closure (1000), stop here
            if (isIntentionalDisconnectRef.current || event.code === 1000) {
                return;
            }

            // Attempt Reconnection (Exponential Backoff)
            const maxRetries = 5;
            if (retryCountRef.current < maxRetries) {
                const delay = Math.pow(2, retryCountRef.current) * 1000;
                console.log(`[AUI] WebSocket disconnected (Code: ${event.code}). Reconnecting in ${delay}ms... (Attempt ${retryCountRef.current + 1}/${maxRetries})`);
                
                retryTimeoutRef.current = setTimeout(() => {
                    retryCountRef.current++;
                    connectWebSocket();
                }, delay);
            } else {
                 console.error('[AUI] WebSocket max reconnections reached.');
                 callbacksRef.current.onError?.('Connection lost. Max retries reached.');
                 callbacksRef.current.onComplete?.();
            }
        };
    } catch (err) {
        console.error("WebSocket creation failed", err);
        // Retry logic for immediate immediate failures too?
    }
  }, [getWebSocketUrl]);

  /**
   * Connect using WebSocket (Default and only transport)
   */
  const connect = useCallback(() => {
    // Just alias to WebSocket connection logic
    connectWebSocket();
  }, [connectWebSocket]);

  /**
   * Disconnect current connection
   */
  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true; // Mark as intentional
    
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

  /**
   * Send data (WebSocket only)
   */
  const send = useCallback((data) => {
    // Always WebSocket
    
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
      if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
      }
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
    };
  }, []);

  // Visibility Change Handling (Reconnect on visibility if dropped)
  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
              // If we expected to be connected but aren't, try reconnecting
              // Check if we have a config url and NO active connection
              if (configRef.current.url && !connectionRef.current && !isIntentionalDisconnectRef.current) {
                   console.log('[AUI] Tab became visible. Attempting reconnection...');
                   retryCountRef.current = 0; // Reset retries for visibility-triggered reconnect
                   connect();
              }
          }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
  }, [connect]);

  return {
    connect,
    disconnect,
    send,
    isConnected,
    transport: 'websocket', // Hardcoded for backward compat with consumers checking this
  };
}

export default useAUITransport;
