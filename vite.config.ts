import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Proxies de desenvolvimento espelhando as rotas de produção:
 * em produção, /api/games e /api/teams são funções serverless da Vercel
 * (pasta api/) com cache na CDN; em dev, vão direto na API da Copa.
 */
const worldCupProxy = {
  '/api/games': {
    target: 'https://worldcup26.ir',
    changeOrigin: true,
    rewrite: () => '/get/games',
  },
  '/api/teams': {
    target: 'https://worldcup26.ir',
    changeOrigin: true,
    rewrite: () => '/get/teams',
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: worldCupProxy },
  preview: { proxy: worldCupProxy },
})
