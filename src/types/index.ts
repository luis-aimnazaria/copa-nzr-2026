/**
 * Tipos centrais do Bolão Copa 2026.
 */

/** Fases da Copa de 2026 (formato com 48 seleções). */
export type Phase =
  | 'GROUP'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL'

export const PHASE_LABELS: Record<Phase, string> = {
  GROUP: 'Fase de Grupos',
  ROUND_OF_32: '16-avos de Final',
  ROUND_OF_16: 'Oitavas de Final',
  QUARTER_FINAL: 'Quartas de Final',
  SEMI_FINAL: 'Semifinais',
  THIRD_PLACE: 'Disputa de 3º Lugar',
  FINAL: 'Final',
}

export const PHASE_ORDER: Phase[] = [
  'GROUP',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
]

export interface Team {
  /** Código FIFA de 3 letras ('TBD' para vagas ainda não definidas no mata-mata). */
  code: string
  name: string
  /** URL da imagem da bandeira (vazio para vagas ainda não definidas). */
  flag: string
}

/** Placar de uma partida (real ou palpite). */
export interface Score {
  home: number
  away: number
}

export interface Match {
  id: string
  /** Data/hora do jogo em ISO 8601. */
  date: string
  phase: Phase
  /** Letra do grupo (apenas na fase de grupos). */
  group?: string
  homeTeam: Team
  awayTeam: Team
  /** Resultado real — null enquanto o jogo não foi apurado. */
  realScore: Score | null
}

export interface User {
  /** E-mail normalizado (minúsculas) — identificador único do usuário. */
  email: string
  name: string
  /** Palpites indexados por id do jogo. */
  predictions: Record<string, Score>
  createdAt: string
  updatedAt: string
}

/** Linha do leaderboard, já calculada. */
export interface RankingEntry {
  email: string
  name: string
  totalPoints: number
  exactScores: number
  predictionsCount: number
}
