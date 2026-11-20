import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In development the client talks to the API through this proxy, so cookies
// are same-origin and no CORS configuration is needed.
const API = process.env.VITE_PROXY_TARGET || 'http://localhost:5000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/uploads': { target: API, changeOrigin: true },
      '/socket.io': { target: API, ws: true, changeOrigin: true },
    },
  },
})
