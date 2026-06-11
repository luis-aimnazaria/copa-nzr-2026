import type { Match, RankingEntry, Score, User } from '../types'

/**
 * Tabela oficial de pontuação do bolão.
 */
export const POINTS = {
  /** Acerto em cheio do placar (palpite 2x1, jogo 2x1). */
  EXACT_SCORE: 25,
  /** Acerto do vencedor/empate + saldo de gols (palpite 3x1, jogo 2x0). */
  OUTCOME_AND_GOAL_DIFF: 18,
  /** Acerto do vencedor/empate + gols de um dos times (palpite 2x1, jogo 2x0). */
  OUTCOME_AND_ONE_TEAM_GOALS: 15,
  /** Acerto apenas do vencedor ou do empate (palpite 1x0, jogo 3x1). */
  OUTCOME_ONLY: 10,
  /** Erro total. */
  MISS: 0,
} as const

/** -1 = visitante vence, 0 = empate, 1 = mandante vence. */
const outcome = (s: Score): number => Math.sign(s.home - s.away)

/**
 * Compara um palpite com o resultado real e retorna os pontos ganhos.
 * As regras são avaliadas da mais valiosa para a menos valiosa,
 * portanto cada palpite recebe apenas a maior pontuação aplicável.
 */
export function calculateMatchPoints(prediction: Score, real: Score): number {
  if (prediction.home === real.home && prediction.away === real.away) {
    return POINTS.EXACT_SCORE
  }
  if (outcome(prediction) !== outcome(real)) {
    return POINTS.MISS
  }
  if (prediction.home - prediction.away === real.home - real.away) {
    return POINTS.OUTCOME_AND_GOAL_DIFF
  }
  if (prediction.home === real.home || prediction.away === real.away) {
    return POINTS.OUTCOME_AND_ONE_TEAM_GOALS
  }
  return POINTS.OUTCOME_ONLY
}

export interface UserScore {
  totalPoints: number
  exactScores: number
  /** Pontos por jogo apurado, indexados por id do jogo. */
  byMatch: Record<string, number>
}

/**
 * Apura a pontuação total de um usuário considerando apenas os jogos
 * que já possuem resultado real cadastrado.
 */
export function calculateUserScore(user: User, matches: Match[]): UserScore {
  const byMatch: Record<string, number> = {}
  let totalPoints = 0
  let exactScores = 0

  for (const match of matches) {
    const prediction = user.predictions[match.id]
    if (!match.realScore || !prediction) continue

    const points = calculateMatchPoints(prediction, match.realScore)
    byMatch[match.id] = points
    totalPoints += points
    if (points === POINTS.EXACT_SCORE) exactScores++
  }

  return { totalPoints, exactScores, byMatch }
}

/**
 * Monta o leaderboard: ordena por pontos, com desempate por número de
 * placares exatos e, por fim, ordem alfabética do nome.
 */
export function buildRanking(users: User[], matches: Match[]): RankingEntry[] {
  return users
    .map((user) => {
      const score = calculateUserScore(user, matches)
      return {
        email: user.email,
        name: user.name,
        company: user.company,
        totalPoints: score.totalPoints,
        exactScores: score.exactScores,
        predictionsCount: Object.keys(user.predictions).length,
      }
    })
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.exactScores - a.exactScores ||
        a.name.localeCompare(b.name, 'pt-BR'),
    )
}
