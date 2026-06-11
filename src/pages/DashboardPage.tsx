import { useMemo, useState } from 'react'
import type { Match, Score, User } from '../types'
import { MatchCard } from '../components/MatchCard'
import type { ScoreDraft } from '../components/MatchCard'
import { ScoringRulesButton } from '../components/ScoringRules'
import { db } from '../services/storage'
import { calculateLivePoints, calculateMatchPoints, calculateUserScore } from '../utils/scoring'
import { groupMatchesBySection } from '../utils/matches'

interface DashboardPageProps {
  user: User
  matches: Match[]
  onUserUpdate: (user: User) => void
}

/** Converte os palpites salvos em rascunhos editáveis (strings dos inputs). */
function draftsFromPredictions(predictions: Record<string, Score>): Record<string, ScoreDraft> {
  return Object.fromEntries(
    Object.entries(predictions).map(([id, s]) => [id, { home: String(s.home), away: String(s.away) }]),
  )
}

/**
 * Dashboard principal: jogos separados por grupo/fase com inputs de
 * palpite e botão fixo de salvar. Jogos já apurados ficam bloqueados
 * e exibem os pontos conquistados.
 */
export function DashboardPage({ user, matches, onUserUpdate }: DashboardPageProps) {
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>(() =>
    draftsFromPredictions(user.predictions),
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const sections = useMemo(() => groupMatchesBySection(matches), [matches])
  const score = useMemo(() => calculateUserScore(user, matches), [user, matches])
  const livePoints = useMemo(() => calculateLivePoints(user, matches), [user, matches])

  const filledCount = Object.values(drafts).filter((d) => d.home !== '' && d.away !== '').length

  const updateDraft = (matchId: string) => (draft: ScoreDraft) => {
    setDrafts((prev) => ({ ...prev, [matchId]: draft }))
    setDirty(true)
    setSavedFeedback(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(false)
    try {
      const predictions: Record<string, Score> = {}
      for (const [matchId, draft] of Object.entries(drafts)) {
        if (draft.home === '' || draft.away === '') continue
        predictions[matchId] = { home: Number(draft.home), away: Number(draft.away) }
      }

      const updated: User = { ...user, predictions, updatedAt: new Date().toISOString() }
      await db.saveUser(updated)
      onUserUpdate(updated)
      setDirty(false)
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 3000)
    } catch (err) {
      console.error('[DashboardPage] erro ao salvar palpites', err)
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-28">
      {/* Resumo da pontuação do usuário */}
      <div className="mb-3 grid grid-cols-3 gap-3">
        <StatCard
          label="Pontos"
          value={score.totalPoints + livePoints}
          accent
          sub={livePoints > 0 ? `inclui +${livePoints} parcial` : undefined}
        />
        <StatCard label="Em cheio" value={score.exactScores} />
        <StatCard label="Palpites" value={filledCount} />
      </div>

      <div className="mb-6 text-center">
        <ScoringRulesButton />
      </div>

      {sections.map((section) => (
        <section key={section.key} className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wide text-brand-400 uppercase">
            {section.title}
            <span className="h-px flex-1 bg-navy-700/60" />
          </h2>
          <div className="space-y-2">
            {section.matches.map((match) => {
              const saved = user.predictions[match.id]
              const points =
                match.realScore && saved ? calculateMatchPoints(saved, match.realScore) : null
              // apuração parcial: pontos provisórios contra o placar ao vivo
              const livePts =
                !match.realScore && match.liveScore && saved
                  ? calculateMatchPoints(saved, match.liveScore)
                  : null
              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  draft={drafts[match.id] ?? { home: '', away: '' }}
                  onChange={updateDraft(match.id)}
                  locked={match.realScore !== null}
                  badge={
                    points !== null ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          points > 0
                            ? 'bg-brand-500/15 text-brand-300'
                            : 'bg-navy-700/50 text-navy-300'
                        }`}
                      >
                        {points > 0 ? `+${points} pts` : '0 pts'}
                      </span>
                    ) : (
                      livePts !== null && (
                        <span className="animate-pulse rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-300">
                          parcial: {livePts > 0 ? `+${livePts}` : '0'} pts
                        </span>
                      )
                    )
                  }
                />
              )
            })}
          </div>
        </section>
      ))}

      {/* Barra fixa de salvar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-navy-700/60 bg-navy-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="text-xs text-navy-300">
            {savedFeedback ? (
              <span className="font-semibold text-brand-300">✓ Palpites salvos!</span>
            ) : saveError ? (
              <span className="font-semibold text-red-400">
                Não foi possível salvar — tente novamente.
              </span>
            ) : (
              <>
                <span className="font-bold text-white">{filledCount}</span> palpite(s) preenchido(s)
                {dirty && <span className="ml-1 text-brand-400">• alterações não salvas</span>}
              </>
            )}
          </p>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-navy-850 transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Salvando...' : 'Salvar Palpites'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = false,
  sub,
}: {
  label: string
  value: number
  accent?: boolean
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-navy-700/60 bg-navy-800/50 p-3 text-center">
      <p className={`text-2xl font-black ${accent ? 'text-brand-500' : 'text-white'}`}>
        {value}
        {sub && <span className="ml-1 align-middle text-[10px] font-bold text-red-300">{sub}</span>}
      </p>
      <p className="text-xs font-medium text-navy-300 uppercase">{label}</p>
    </div>
  )
}
