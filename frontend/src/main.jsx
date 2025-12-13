import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initLogBridge } from './utils/logBridge';
import { ToastProvider } from './components/ui';

// Initialize logging bridge for development
if (import.meta.env.DEV) {
  initLogBridge();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
