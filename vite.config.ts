import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * O proxy /wc-api contorna o CORS da API worldcup26.ir durante o
 * desenvolvimento. Em produção, configure um proxy equivalente no servidor —
 * sem ele, o app cai automaticamente no snapshot local dos dados.
 */
const worldCupProxy = {
  '/wc-api': {
    target: 'https://worldcup26.ir',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/wc-api/, ''),
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: worldCupProxy },
  preview: { proxy: worldCupProxy },
})
