import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initLogBridge } from "./utils/logBridge";
import { ToastProvider } from "./components/ui";
import LogErrorBoundary from "./components/LogErrorBoundary";
import { initializeRenderers } from "./components/content";

// Initialize logging bridge for development
if (import.meta.env.DEV) {
  initLogBridge();
}

// Initialize content renderers
initializeRenderers();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element '#root' not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <LogErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </LogErrorBoundary>
  </StrictMode>,
);
