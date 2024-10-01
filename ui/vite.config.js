import { defineConfig } from 'vite'

// Plugins
import react from '@vitejs/plugin-react'
import express from './express-plugin'

export default defineConfig({
  plugins: [react(), express('src/backend/server.js')],
  server: {
    port: 5000
  }
})
