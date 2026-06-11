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

  // Sincroniza no banco os jogos que a API já encerrou (uma vez por jogo):
  // mantém a tabela results completa e ativa a trava server-side que
  // impede edição de palpite de jogo apurado. Fire-and-forget.
  for (const match of matches) {
    if (match.realScore && !results[match.id]) {
      db.saveResult(match.id, match.realScore).catch((err) =>
        console.warn('[matchService] sync de resultado falhou', match.id, err),
      )
    }
  }

  return matches.map((match) => ({
    ...match,
    realScore: match.realScore ?? results[match.id] ?? null,
  }))
}
