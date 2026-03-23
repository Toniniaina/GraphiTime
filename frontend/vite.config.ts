import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/graphql': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/planning/export.csv': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/planning/export.pdf': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/planning/import.csv': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
