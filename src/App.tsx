import { useCallback, useEffect, useState } from 'react'
import type { Match, User } from './types'
import { Header } from './components/Header'
import type { Tab } from './components/Header'
import { EntryPage } from './pages/EntryPage'
import { DashboardPage } from './pages/DashboardPage'
import { RankingPage } from './pages/RankingPage'
import { AdminPage } from './pages/AdminPage'
import { getMatches } from './services/matchService'
import { db } from './services/storage'

/** Mantém o usuário logado entre visitas (guarda apenas o e-mail da sessão). */
const SESSION_KEY = 'bolao2026:session'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [tab, setTab] = useState<Tab>('palpites')
  const [restoringSession, setRestoringSession] = useState(true)

  const refreshMatches = useCallback(async () => {
    setMatches(await getMatches())
  }, [])

  // Apuração automática: os resultados vêm da API ao vivo. Além da carga
  // inicial, re-busca a cada 5 minutos e ao voltar para a aba do navegador,
  // para que jogos encerrados sejam apurados sem ação manual.
  useEffect(() => {
    refreshMatches()

    const interval = setInterval(refreshMatches, 5 * 60 * 1000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshMatches()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [refreshMatches])

  useEffect(() => {
    const sessionEmail = localStorage.getItem(SESSION_KEY)
    if (sessionEmail) {
      db.getUser(sessionEmail)
        .then((stored) => setUser(stored))
        .catch(() => setUser(null))
        .finally(() => setRestoringSession(false))
    } else {
      setRestoringSession(false)
    }
  }, [])

  const handleLogin = (loggedUser: User) => {
    localStorage.setItem(SESSION_KEY, loggedUser.email)
    setUser(loggedUser)
    setTab('palpites')
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  if (restoringSession) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-navy-950">
        <p className="animate-pulse text-navy-300">Carregando...</p>
      </main>
    )
  }

  if (!user) {
    return <EntryPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-dvh bg-navy-950 text-navy-100">
      <Header user={user} activeTab={tab} onTabChange={setTab} onLogout={handleLogout} />

      {matches === null ? (
        <p className="animate-pulse py-16 text-center text-navy-300">Buscando jogos da Copa...</p>
      ) : (
        <>
          {tab === 'palpites' && (
            <DashboardPage key={user.email} user={user} matches={matches} onUserUpdate={setUser} />
          )}
          {tab === 'ranking' && <RankingPage matches={matches} currentEmail={user.email} />}
          {tab === 'apuracao' && <AdminPage matches={matches} onResultsSaved={refreshMatches} />}
        </>
      )}
    </div>
  )
}
