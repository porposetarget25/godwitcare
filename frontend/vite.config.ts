// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/godwitcare/' : '/',   // GH Pages vs local
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Local-only proxy to Spring Boot:
      // http://localhost:5173/api -> http://localhost:8080/api
      '/api': 'http://localhost:8080'
    }
  },
  build: {
    outDir: 'dist'
  }
}))
