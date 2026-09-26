// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: process.env.GH_PAGES ? '/godwitcare/' : '/',   // GH Pages vs Render/local
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
