import { useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '../types'
import { db } from '../services/storage'
import { isValidEmail, normalizeEmail } from '../utils/email'

interface EntryPageProps {
  onLogin: (user: User) => void
}

/**
 * Tela de entrada: o e-mail é o identificador único.
 * E-mail já cadastrado → carrega o perfil e os palpites.
 * E-mail novo → pede o nome e cria o perfil.
 */
export function EntryPage({ onLogin }: EntryPageProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const normalized = normalizeEmail(email)
    if (!isValidEmail(normalized)) {
      setError('E-mail inválido. Confira o endereço digitado.')
      return
    }

    setLoading(true)
    try {
      const existing = await db.getUser(normalized)

      if (existing) {
        onLogin(existing)
        return
      }

      if (!isNewUser) {
        // primeira vez deste e-mail: revela o campo de nome
        setIsNewUser(true)
        return
      }

      if (name.trim().length < 2) {
        setError('Digite seu nome para criar o perfil.')
        return
      }

      const now = new Date().toISOString()
      const user: User = {
        email: normalized,
        name: name.trim(),
        predictions: {},
        createdAt: now,
        updatedAt: now,
      }
      await db.saveUser(user)
      onLogin(user)
    } catch (err) {
      console.error('[EntryPage]', err)
      setError('Não foi possível acessar o banco de dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-850 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/brand/nazaria-horizontal-negativo.png"
            alt="Nazária Distribuidora"
            className="mx-auto mb-5 h-12 w-auto"
          />
          <h1 className="text-2xl font-black tracking-tight text-white">
            ⚽ Bolão <span className="text-brand-500">Copa 2026</span>
          </h1>
          <p className="mt-2 text-sm text-navy-300">
            Dê seus palpites e dispute o topo do ranking
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-navy-700/60 bg-navy-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur"
        >
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-navy-100">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@exemplo.com.br"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setIsNewUser(false)
              setError('')
            }}
            className="w-full rounded-xl border border-navy-600 bg-navy-950 px-4 py-3 text-lg text-white placeholder:text-navy-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          />

          {isNewUser && (
            <div className="mt-4">
              <p className="mb-3 rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
                E-mail ainda não cadastrado — informe seu nome para criar o perfil. 👋
              </p>
              <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-navy-100">
                Nome
              </label>
              <input
                id="name"
                type="text"
                autoFocus
                placeholder="Como quer aparecer no ranking"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-navy-600 bg-navy-950 px-4 py-3 text-white placeholder:text-navy-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
              />
            </div>
          )}

          {error && <p className="mt-3 text-sm font-medium text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-xl bg-brand-500 py-3 text-base font-bold text-navy-850 transition-colors hover:bg-brand-400 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Carregando...' : isNewUser ? 'Criar perfil e entrar' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-navy-400">
          Seus palpites ficam vinculados ao seu e-mail.
        </p>
      </div>
    </main>
  )
}
