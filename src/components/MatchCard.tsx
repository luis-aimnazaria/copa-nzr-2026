import type { ReactNode } from 'react'
import type { Match, Team } from '../types'
import { formatMatchDate, hasDefinedTeams, hasStarted } from '../utils/matches'

export interface ScoreDraft {
  home: string
  away: string
}

interface MatchCardProps {
  match: Match
  draft: ScoreDraft
  onChange: (draft: ScoreDraft) => void
  /** Bloqueia a edição (ex.: jogo já apurado). */
  locked?: boolean
  /** Selo exibido no rodapé (pontuação obtida, status etc.). */
  badge?: ReactNode
}

/**
 * Card de um jogo com inputs de placar — reutilizado tanto para
 * palpites (Dashboard) quanto para apuração de resultados (Admin).
 */
export function MatchCard({ match, draft, onChange, locked = false, badge }: MatchCardProps) {
  const playable = hasDefinedTeams(match)
  const disabled = locked || !playable

  const handle = (side: 'home' | 'away') => (value: string) => {
    if (!/^\d{0,2}$/.test(value)) return
    onChange({ ...draft, [side]: value })
  }

  return (
    <div className="rounded-xl border border-navy-700/60 bg-navy-800/50 p-3 transition-colors hover:border-navy-500">
      <p className="mb-2 text-center text-xs font-medium text-navy-300 capitalize">
        {formatMatchDate(match.date)}
        {match.realScore ? (
          <span className="ml-2 rounded bg-brand-500/15 px-1.5 py-0.5 font-semibold text-brand-300 uppercase">
            Encerrado {match.realScore.home} x {match.realScore.away}
          </span>
        ) : (
          hasStarted(match) && (
            <span className="ml-2 animate-pulse rounded bg-red-500/15 px-1.5 py-0.5 font-semibold text-red-300 uppercase">
              ● Em andamento
            </span>
          )
        )}
      </p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center justify-end gap-2 overflow-hidden">
          <TeamName team={match.homeTeam} />
          <TeamFlag team={match.homeTeam} />
        </div>

        <div className="flex items-center gap-1.5">
          <ScoreInput value={draft.home} onChange={handle('home')} disabled={disabled} label={`Gols ${match.homeTeam.name}`} />
          <span className="text-xs font-bold text-navy-400">×</span>
          <ScoreInput value={draft.away} onChange={handle('away')} disabled={disabled} label={`Gols ${match.awayTeam.name}`} />
        </div>

        <div className="flex items-center justify-start gap-2 overflow-hidden">
          <TeamFlag team={match.awayTeam} />
          <TeamName team={match.awayTeam} />
        </div>
      </div>

      {!playable && (
        <p className="mt-2 text-center text-xs text-navy-400">
          Aguardando definição dos classificados
        </p>
      )}
      {badge && <div className="mt-2 flex justify-center">{badge}</div>}
    </div>
  )
}

function TeamName({ team }: { team: Team }) {
  const isTbd = team.code === 'TBD'
  return (
    <span
      className={`truncate font-semibold ${
        isTbd ? 'text-xs text-navy-300 italic' : 'text-sm text-white'
      }`}
    >
      {team.name}
    </span>
  )
}

function TeamFlag({ team }: { team: Team }) {
  if (!team.flag) {
    return (
      <span className="grid h-5 w-7 shrink-0 place-items-center rounded-sm bg-navy-700 text-[11px]">
        ⚽
      </span>
    )
  }
  return (
    <img
      src={team.flag}
      alt={`Bandeira: ${team.name}`}
      loading="lazy"
      className="h-5 w-7 shrink-0 rounded-sm object-cover shadow-sm shadow-black/40"
    />
  )
}

function ScoreInput({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
  label: string
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="-"
      className="h-11 w-11 rounded-lg border border-navy-600 bg-navy-950 text-center text-lg font-bold text-white transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none disabled:cursor-not-allowed disabled:border-navy-700 disabled:bg-navy-900/60 disabled:text-navy-400"
    />
  )
}
