import type { Match } from '../types'
import { fetchMatches } from './fifaApi'
import { db } from './storage'

/**
 * Junta o calendário vindo da API da Copa com os resultados apurados
 * manualmente. Resultado oficial da API (jogo encerrado) tem prioridade;
 * a apuração manual cobre atrasos da API ou simulações.
 * É a única fonte de jogos consumida pelas telas.
 */
export async function getMatches(): Promise<Match[]> {
  const [matches, results] = await Promise.all([fetchMatches(), db.getResults()])
  return matches.map((match) => ({
    ...match,
    realScore: match.realScore ?? results[match.id] ?? null,
  }))
}
