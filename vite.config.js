import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': {
        target        : 'http://localhost:3001',
        changeOrigin  : true,
        secure        : false,
        timeout       : 600000,   // ← 10 min — prevents ECONNRESET on slow AI
        proxyTimeout  : 600000,   // ← 10 min — proxy waits for backend
        configure     : (proxy) => {
          proxy.on('error', (err, req) => {
            console.error(`[proxy] error on ${req.url}:`, err.message)
          })
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log(`[proxy] → ${req.method} ${req.url}`)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(`[proxy] ← ${proxyRes.statusCode} ${req.url}`)
          })
        },
      },
    },
  },

  define: {
    'process.env': {},
    global       : 'globalThis',
  },
  resolve: {
    alias: { buffer: 'buffer' },
  },
  optimizeDeps: {
    include     : ['algosdk', 'buffer'],
    esbuildOptions: { target: 'esnext' },
  },
})