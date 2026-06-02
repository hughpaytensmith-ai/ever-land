import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// minimal Node global decl (no @types/node dependency) for the build-time env
declare const process: { env: Record<string, string | undefined> }

export default defineConfig({
  // Root by default (Netlify/root hosts); set DEPLOY_BASE for a sub-path host
  // like GitHub Pages, e.g. DEPLOY_BASE=/fletchers-bar-builder/ npm run build
  base: process.env.DEPLOY_BASE || '/',
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
