import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
const plugins = [react()]
if (process.env.DISABLE_HTTPS !== 'true') {
  plugins.push(basicSsl())
}

export default defineConfig({
  plugins: plugins,
  server: {
    host: true, // Listen on all addresses (0.0.0.0)
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'https://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/dict': {
        target: process.env.VITE_API_TARGET || 'https://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: (process.env.VITE_API_TARGET || 'https://127.0.0.1:8000').replace('http', 'ws'),
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
