import type { User } from '../types'

export type Tab = 'palpites' | 'ranking' | 'apuracao'

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'palpites', label: 'Palpites', icon: '⚽' },
  { id: 'ranking', label: 'Ranking', icon: '🏆' },
  { id: 'apuracao', label: 'Apuração', icon: '📋' },
]

interface HeaderProps {
  user: User
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onLogout: () => void
}

export function Header({ user, activeTab, onTabChange, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-navy-700/60 bg-navy-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 pt-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/brand/nazaria-horizontal-negativo.png"
            alt="Nazária Distribuidora"
            className="h-7 w-auto"
          />
          <span className="hidden rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-bold text-brand-300 sm:inline">
            ⚽ Bolão Copa 2026
          </span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-navy-300">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-navy-600 px-3 py-1.5 text-xs font-semibold text-navy-200 transition-colors hover:border-brand-500/60 hover:text-brand-300"
          >
            Sair
          </button>
        </div>
      </div>

      <nav className="mx-auto flex max-w-3xl px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 border-b-2 px-2 py-2.5 text-sm font-semibold transition-colors sm:flex-none sm:px-5 ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-navy-300 hover:text-white'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
