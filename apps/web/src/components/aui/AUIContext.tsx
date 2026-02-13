/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/**
 * AUI Context
 *
 * Provides WebSocket send function and transport info to child components.
 * Used by dynamically rendered AUI components for HITL interactions.
 */

type TransportType = "sse" | "ws" | "websocket";

interface AUIContextValue {
  transport: TransportType;
  isConnected: boolean;
  send: ((event: unknown) => boolean | void) | null;
}

interface AUIProviderProps {
  children: ReactNode;
  value: AUIContextValue;
}

const AUIContext = createContext<AUIContextValue>({
  transport: "sse",
  isConnected: false,
  send: null,
});

export const AUIProvider = ({ children, value }: AUIProviderProps) => (
  <AUIContext.Provider value={value}>{children}</AUIContext.Provider>
);

export const useAUI = () => useContext(AUIContext);

export default AUIContext;
