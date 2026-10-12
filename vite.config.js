import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Only PORT is read from .env here (never the database URL or the JWT secret).
  const { PORT = '4000' } = loadEnv(mode, process.cwd(), 'PORT')

  return {
    plugins: [react()],
    // In development the API runs next to Vite; the browser only ever talks to Vite.
    server: { proxy: { '/api': `http://localhost:${PORT}` } },
  }
})
