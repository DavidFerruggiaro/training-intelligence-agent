import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy /api to the local backend only during development.
    // In production the frontend uses VITE_API_URL to reach the backend directly.
    ...(mode !== 'production' && {
      proxy: {
        '/api': 'http://localhost:8000',
        '/health': 'http://localhost:8000',
      },
    }),
  },
}))
