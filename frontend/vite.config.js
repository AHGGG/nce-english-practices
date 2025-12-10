import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // Listen on all addresses (0.0.0.0)
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/dict': {
        target: 'https://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'wss://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
