import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': {
        target      : 'http://localhost:3001',
        changeOrigin: true,
        secure      : false,
        timeout     : 600000,
        proxyTimeout: 600000,
      },
    },
  },

  define: {
    global        : 'globalThis',
    'process.env' : {},
  },

  optimizeDeps: {
    include: [
      'algosdk',
      '@txnlab/use-wallet-react',
      '@perawallet/connect',
      '@blockshake/defly-connect',
    ],
    esbuildOptions: {
      target : 'esnext',
      define : {
        global: 'globalThis',
      },
    },
  },
})