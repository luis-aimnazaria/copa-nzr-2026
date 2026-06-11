import { useEffect, useState } from 'react'
import type { Match, RankingEntry } from '../types'
import { COMPANY_LABELS } from '../types'
import { ScoringRulesButton } from '../components/ScoringRules'
import { db } from '../services/storage'
import { buildRanking } from '../utils/scoring'
import { maskEmail } from '../utils/email'

interface RankingPageProps {
  matches: Match[]
  /** E-mail do usuário logado, para destacar a própria linha. */
  currentEmail: string
}

const MEDALS = ['🥇', '🥈', '🥉']

/** Leaderboard de todos os participantes, com e-mail mascarado. */
export function RankingPage({ matches, currentEmail }: RankingPageProps) {
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    db.getAllUsers().then((users) => {
      if (!cancelled) setRanking(buildRanking(users, matches))
    })
    return () => {
      cancelled = true
    }
  }, [matches])

  if (!ranking) {
    return <p className="py-16 text-center text-navy-300">Carregando ranking...</p>
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black text-white">🏆 Ranking do Bolão</h2>
        <ScoringRulesButton />
      </div>

      {ranking.some((e) => e.livePoints > 0) && (
        <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-200">
          ● Há jogos em andamento: os pontos <strong>parciais</strong> entram na ordem do ranking,
          mas só viram definitivos no fim do jogo.
        </p>
      )}

      {ranking.length === 0 ? (
        <p className="rounded-xl border border-navy-700/60 bg-navy-800/50 p-6 text-center text-navy-300">
          Nenhum participante ainda. Seja o primeiro a palpitar!
        </p>
      ) : (
        <ol className="space-y-2">
          {ranking.map((entry, index) => {
            const isMe = entry.email === currentEmail
            return (
              <li
                key={entry.email}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  isMe
                    ? 'border-brand-500/60 bg-brand-500/10'
                    : 'border-navy-700/60 bg-navy-800/50'
                }`}
              >
                <span className="w-9 text-center text-lg font-black text-navy-200">
                  {MEDALS[index] ?? `${index + 1}º`}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">
                    {entry.name}
                    <span className="ml-2 rounded bg-navy-700/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-navy-200 uppercase">
                      {COMPANY_LABELS[entry.company] ?? entry.company}
                    </span>
                    {isMe && <span className="ml-2 text-xs font-semibold text-brand-400">(você)</span>}
                  </p>
                  <p className="text-xs text-navy-300">
                    {maskEmail(entry.email)} · {entry.exactScores} em cheio · {entry.predictionsCount} palpites
                  </p>
                </div>
                <p className="text-right">
                  <span className="text-xl font-black text-brand-500">{entry.totalPoints}</span>
                  <span className="ml-1 text-xs text-navy-300">pts</span>
                  {entry.livePoints > 0 && (
                    <span className="block animate-pulse text-[10px] font-bold text-red-300">
                      +{entry.livePoints} parcial
                    </span>
                  )}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
