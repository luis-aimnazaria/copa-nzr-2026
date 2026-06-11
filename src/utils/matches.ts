import type { Match } from '../types'
import { PHASE_LABELS, PHASE_ORDER } from '../types'

export interface MatchSection {
  key: string
  title: string
  matches: Match[]
}

/**
 * Agrupa os jogos em seções para exibição:
 * fase de grupos vira uma seção por grupo (A–L); demais fases, uma seção cada.
 */
export function groupMatchesBySection(matches: Match[]): MatchSection[] {
  const sections: MatchSection[] = []

  for (const phase of PHASE_ORDER) {
    const ofPhase = matches.filter((m) => m.phase === phase)
    if (ofPhase.length === 0) continue

    if (phase === 'GROUP') {
      const letters = [...new Set(ofPhase.map((m) => m.group))].sort()
      for (const letter of letters) {
        sections.push({
          key: `group-${letter}`,
          title: `Grupo ${letter}`,
          matches: sortByDate(ofPhase.filter((m) => m.group === letter)),
        })
      }
    } else {
      sections.push({ key: phase, title: PHASE_LABELS[phase], matches: sortByDate(ofPhase) })
    }
  }

  return sections
}

const sortByDate = (matches: Match[]) =>
  [...matches].sort((a, b) => a.date.localeCompare(b.date))

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatMatchDate = (iso: string) => dateFormatter.format(new Date(iso))

/** Jogo só aceita palpite/apuração quando os dois times já estão definidos. */
export const hasDefinedTeams = (match: Match) =>
  match.homeTeam.code !== 'TBD' && match.awayTeam.code !== 'TBD'

/** O jogo já começou? (palpites fecham no horário do pontapé inicial) */
export const hasStarted = (match: Match, now: Date = new Date()) =>
  new Date(match.date).getTime() <= now.getTime()
