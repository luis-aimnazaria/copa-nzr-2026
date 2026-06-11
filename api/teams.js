/**
 * Proxy com cache na CDN da Vercel para as seleções (dados praticamente
 * estáticos — cache mais longo). Ver api/games.js para a justificativa.
 */
const UPSTREAM = 'https://worldcup26.ir/get/teams'

export default async function handler(req, res) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const upstream = await fetch(UPSTREAM, { signal: AbortSignal.timeout(8000) })
      if (!upstream.ok) throw new Error(`upstream respondeu ${upstream.status}`)
      const data = await upstream.json()
      // seleções mudam raramente: fresco por 1h, stale até 7 dias
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=604800')
      return res.status(200).json(data)
    } catch (err) {
      if (attempt === 3) {
        return res.status(502).json({ error: `API da Copa indisponível: ${err}` })
      }
    }
  }
}
