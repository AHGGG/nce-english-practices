import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
const plugins = [react()]
// Only enable SSL if explicitly requested via HTTPS=true
// Default is HTTP
const useHttps = process.env.HTTPS === 'true'
if (useHttps) {
  plugins.push(basicSsl())
}

// Backend target protocol should match frontend mode usually, 
// or default to HTTP if not specified. 
// However, if we run frontend in HTTPS, we likely want backend in HTTPS too.
// Let's default target to http, but allow override or switch based on usage.
// Actually, for simplicity, let's assume if frontend is HTTPS, backend is also HTTPS.
const targetProtocol = useHttps ? 'https' : 'http'
const targetBase = process.env.VITE_API_TARGET || `${targetProtocol}://127.0.0.1:8000`

export default defineConfig({
  plugins: plugins,
  server: {
    host: true, // Listen on all addresses (0.0.0.0)
    https: useHttps, // Enable/Disable HTTPS server
    proxy: {
      '/api': {
        target: targetBase,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/dict': {
        target: targetBase,
        changeOrigin: true,
        secure: false,
      },
      '/aui/stream': {
        target: targetBase,
        changeOrigin: true,
        secure: false,
      },
      '/aui/render': {
        target: targetBase,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: targetBase.replace('http', 'ws'),
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
