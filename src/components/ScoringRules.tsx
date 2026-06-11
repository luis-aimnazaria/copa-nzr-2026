import { useEffect, useState } from 'react'
import { POINTS } from '../utils/scoring'

/** Regras exibidas no balão — os pontos vêm de POINTS para nunca divergirem do cálculo. */
const RULES = [
  {
    points: POINTS.EXACT_SCORE,
    title: 'Placar em cheio',
    example: 'Palpite 2×1 · Jogo 2×1',
  },
  {
    points: POINTS.OUTCOME_AND_GOAL_DIFF,
    title: 'Vencedor/empate + saldo de gols',
    example: 'Palpite 3×1 · Jogo 2×0',
  },
  {
    points: POINTS.OUTCOME_AND_ONE_TEAM_GOALS,
    title: 'Vencedor/empate + gols de um dos times',
    example: 'Palpite 2×1 · Jogo 2×0',
  },
  {
    points: POINTS.OUTCOME_ONLY,
    title: 'Apenas o vencedor ou o empate',
    example: 'Palpite 1×0 · Jogo 3×1',
  },
  {
    points: POINTS.MISS,
    title: 'Erro total',
    example: 'Palpite 1×0 · Jogo 0×2',
  },
]

/**
 * Botão "como funciona a pontuação?" que abre um balão (modal) com as regras.
 * Cada palpite recebe apenas a maior pontuação aplicável.
 */
export function ScoringRulesButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-navy-600 bg-navy-800/50 px-3 py-1.5 text-xs font-semibold text-navy-200 transition-colors hover:border-brand-500/60 hover:text-brand-300 ${className}`}
      >
        <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-[10px] font-black text-navy-850">
          ?
        </span>
        Como funciona a pontuação?
      </button>

      {open && <ScoringRulesModal onClose={() => setOpen(false)} />}
    </>
  )
}

function ScoringRulesModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Regras de pontuação"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-navy-700/60 bg-navy-900 p-5 shadow-2xl shadow-black/60"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">⚽ Regras de pontuação</h3>
            <p className="mt-0.5 text-xs text-navy-300">
              Cada palpite vale apenas a maior pontuação aplicável.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg border border-navy-600 px-2.5 py-1 text-sm font-bold text-navy-200 transition-colors hover:border-brand-500/60 hover:text-brand-300"
          >
            ✕
          </button>
        </div>

        <ul className="space-y-2">
          {RULES.map((rule) => (
            <li
              key={rule.title}
              className="flex items-center gap-3 rounded-xl border border-navy-700/60 bg-navy-800/50 p-3"
            >
              <span
                className={`grid h-10 w-12 shrink-0 place-items-center rounded-lg text-base font-black ${
                  rule.points > 0
                    ? 'bg-brand-500/15 text-brand-400'
                    : 'bg-navy-700/50 text-navy-300'
                }`}
              >
                {rule.points}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{rule.title}</p>
                <p className="text-xs text-navy-300">{rule.example}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center text-xs text-navy-400">
          Os pontos são somados em todos os jogos já apurados.
        </p>
      </div>
    </div>
  )
}
