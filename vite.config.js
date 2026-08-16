import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vitest configuration
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      }
    },
    // Strip console.log and console.debug from production bundles.
    // console.error is preserved for genuine runtime failures.
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
      pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug', 'console.warn', 'console.info'] : [],
    },
  }
})
