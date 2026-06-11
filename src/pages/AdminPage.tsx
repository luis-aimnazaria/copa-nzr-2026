import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Match } from '../types'
import { MatchCard } from '../components/MatchCard'
import type { ScoreDraft } from '../components/MatchCard'
import { db } from '../services/storage'
import { groupMatchesBySection, hasDefinedTeams } from '../utils/matches'

/** Senha padrão da apuração — troque aqui antes de divulgar o bolão. */
const ADMIN_PASSWORD = 'nzr2026'

/** A liberação vale só para a aba/sessão atual do navegador. */
const UNLOCK_KEY = 'bolao2026:adminUnlocked'

interface AdminPageProps {
  matches: Match[]
  /** Recarrega os jogos no App após salvar a apuração. */
  onResultsSaved: () => Promise<void>
}

/**
 * Apuração: tela administrativa para registrar resultados manualmente.
 * Jogos encerrados na API ao vivo já chegam apurados; esta tela cobre
 * atrasos da API ou simulações. Salvar aqui recalcula automaticamente
 * os pontos de todos os usuários.
 */
export function AdminPage({ matches, onResultsSaved }: AdminPageProps) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(UNLOCK_KEY) === 'true')
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>(() =>
    Object.fromEntries(
      matches
        .filter((m) => m.realScore)
        .map((m) => [m.id, { home: String(m.realScore!.home), away: String(m.realScore!.away) }]),
    ),
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  const sections = useMemo(
    () => groupMatchesBySection(matches.filter(hasDefinedTeams)),
    [matches],
  )

  const updateDraft = (matchId: string) => (draft: ScoreDraft) => {
    setDrafts((prev) => ({ ...prev, [matchId]: draft }))
    setDirty(true)
    setSavedFeedback(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const match of matches) {
        const draft = drafts[match.id]
        const complete = draft && draft.home !== '' && draft.away !== ''

        if (complete) {
          await db.saveResult(match.id, { home: Number(draft.home), away: Number(draft.away) })
        } else if (match.realScore) {
          // resultado foi apagado na tela → volta a ficar pendente
          await db.clearResult(match.id)
        }
      }
      await onResultsSaved()
      setDirty(false)
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (!unlocked) {
    return (
      <AdminLockScreen
        onUnlock={() => {
          sessionStorage.setItem(UNLOCK_KEY, 'true')
          setUnlocked(true)
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-28">
      <div className="mb-4 rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 text-xs text-brand-200">
        <strong>Área de apuração:</strong> preencha o placar real dos jogos encerrados e salve.
        A pontuação de todos os participantes é recalculada na hora. Apague os dois campos de um
        jogo para remover a apuração manual.
      </div>

      {sections.map((section) => (
        <section key={section.key} className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wide text-navy-300 uppercase">
            {section.title}
            <span className="h-px flex-1 bg-navy-700/60" />
          </h2>
          <div className="space-y-2">
            {section.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                draft={drafts[match.id] ?? { home: '', away: '' }}
                onChange={updateDraft(match.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-navy-700/60 bg-navy-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="text-xs text-navy-300">
            {savedFeedback ? (
              <span className="font-semibold text-brand-300">✓ Apuração salva!</span>
            ) : (
              dirty && <span className="text-brand-400">• alterações não salvas</span>
            )}
          </p>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-navy-850 transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Salvando...' : 'Salvar Apuração'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Trava de acesso da apuração: pede a senha padrão antes de liberar a edição. */
function AdminLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      onUnlock()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-navy-700/60 bg-navy-900/80 p-6 text-center shadow-2xl shadow-black/50"
      >
        <p className="text-4xl">🔒</p>
        <h2 className="mt-2 text-lg font-black text-white">Área restrita</h2>
        <p className="mt-1 text-sm text-navy-300">
          A apuração de resultados é protegida. Digite a senha de administrador para continuar.
        </p>

        <input
          type="password"
          autoFocus
          placeholder="Senha"
          aria-label="Senha de administrador"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(false)
          }}
          className="mt-4 w-full rounded-xl border border-navy-600 bg-navy-950 px-4 py-3 text-center tracking-widest text-white placeholder:text-navy-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
        />

        {error && <p className="mt-3 text-sm font-medium text-red-400">Senha incorreta.</p>}

        <button
          type="submit"
          disabled={password === ''}
          className="mt-4 w-full rounded-xl bg-brand-500 py-3 text-base font-bold text-navy-850 transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Desbloquear
        </button>
      </form>
    </div>
  )
}
