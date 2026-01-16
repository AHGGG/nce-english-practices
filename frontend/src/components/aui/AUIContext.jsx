import React, { createContext, useContext } from 'react';

/**
 * AUI Context
 * 
 * Provides WebSocket send function and transport info to child components.
 * Used by dynamically rendered AUI components for HITL interactions.
 */

const AUIContext = createContext({
    transport: 'sse',
    isConnected: false,
    send: null,  // WebSocket send function
});

export const AUIProvider = AUIContext.Provider;

export const useAUI = () => useContext(AUIContext);

export default AUIContext;
