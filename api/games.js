/**
 * Proxy com cache na CDN da Vercel para os jogos da Copa.
 *
 * A API worldcup26.ir oscila muito em dias de jogo. Esta função tenta até
 * 3 vezes e, com `s-maxage` + `stale-while-revalidate`, a CDN serve a
 * última resposta boa para TODOS os usuários — uma busca bem-sucedida a
 * cada 2 minutos sustenta o bolão inteiro, mesmo com a origem instável.
 */
const UPSTREAM = 'https://worldcup26.ir/get/games'

export default async function handler(req, res) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const upstream = await fetch(UPSTREAM, { signal: AbortSignal.timeout(8000) })
      if (!upstream.ok) throw new Error(`upstream respondeu ${upstream.status}`)
      const data = await upstream.json()
      // fresco por 2 min; depois serve a versão antiga enquanto revalida (até 1 dia)
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=86400')
      return res.status(200).json(data)
    } catch (err) {
      if (attempt === 3) {
        return res.status(502).json({ error: `API da Copa indisponível: ${err}` })
      }
    }
  }
}
