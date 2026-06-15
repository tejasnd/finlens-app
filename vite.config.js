import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH ?? '/finlens-app/',
    server: {
      // Proxy API calls to the local FastAPI backend so the browser talks to
      // same-origin /api/* (no CORS juggling during dev).
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET ?? 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.js'],
    },
  }
})
