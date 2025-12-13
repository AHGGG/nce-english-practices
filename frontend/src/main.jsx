import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initLogBridge } from './utils/logBridge';
import { ToastProvider } from './components/ui';
import LogErrorBoundary from './components/LogErrorBoundary';

// Initialize logging bridge for development
if (import.meta.env.DEV) {
  initLogBridge();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LogErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </LogErrorBoundary>
  </StrictMode>,
)
