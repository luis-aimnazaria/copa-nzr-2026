import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Company, Score, User } from '../../types'
import type { StorageAdapter } from './StorageAdapter'

/** Linha da tabela public.users (ver supabase/schema.sql). */
interface UserRow {
  email: string
  name: string
  company: Company
  created_at: string
  updated_at: string
}

/** Linha da tabela public.predictions (1 linha por palpite). */
interface PredictionRow {
  email: string
  match_id: string
  home: number
  away: number
}

/** Linha da tabela public.results. */
interface ResultRow {
  match_id: string
  home: number
  away: number
}

const USER_COLUMNS = 'email,name,company,created_at,updated_at'

const rowToUser = (row: UserRow, predictions: Record<string, Score>): User => ({
  email: row.email,
  name: row.name,
  company: row.company,
  predictions,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const rowsToPredictions = (rows: PredictionRow[]): Record<string, Score> =>
  Object.fromEntries(rows.map((r) => [r.match_id, { home: r.home, away: r.away }]))

/**
 * Persistência central no Supabase — todos os participantes compartilham
 * o mesmo banco, então o ranking funciona entre dispositivos diferentes.
 *
 * Os palpites ficam normalizados em public.predictions (1 linha por
 * usuário × jogo): o salvamento faz diff e só toca nas linhas alteradas,
 * o que evita sobrescrever palpites feitos em outro aparelho e permite
 * que um trigger no banco rejeite edição de jogo já apurado.
 * Schema das tabelas em `supabase/schema.sql`.
 */
export class SupabaseAdapter implements StorageAdapter {
  private client: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey)
  }

  private async getPredictions(email: string): Promise<Record<string, Score>> {
    const { data, error } = await this.client
      .from('predictions')
      .select('email,match_id,home,away')
      .eq('email', email)
      .returns<PredictionRow[]>()
    if (error) throw new Error(`Supabase getPredictions: ${error.message}`)
    return rowsToPredictions(data ?? [])
  }

  async getUser(email: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select(USER_COLUMNS)
      .eq('email', email)
      .maybeSingle<UserRow>()
    if (error) throw new Error(`Supabase getUser: ${error.message}`)
    if (!data) return null
    return rowToUser(data, await this.getPredictions(email))
  }

  async saveUser(user: User): Promise<void> {
    // 1. Perfil (upsert pelo e-mail)
    const { error: userError } = await this.client.from('users').upsert({
      email: user.email,
      name: user.name,
      company: user.company,
      created_at: user.createdAt,
      updated_at: new Date().toISOString(),
    })
    if (userError) throw new Error(`Supabase saveUser: ${userError.message}`)

    // 2. Palpites: diff com o banco — só grava o que mudou e remove o que sumiu.
    //    Palpites de jogos travados não são tocados (o trigger do banco
    //    rejeitaria a escrita e derrubaria o lote inteiro).
    const current = await this.getPredictions(user.email)

    const toUpsert: PredictionRow[] = Object.entries(user.predictions)
      .filter(([matchId, score]) => {
        const existing = current[matchId]
        return !existing || existing.home !== score.home || existing.away !== score.away
      })
      .map(([matchId, score]) => ({
        email: user.email,
        match_id: matchId,
        home: score.home,
        away: score.away,
      }))

    const toDelete = Object.keys(current).filter((matchId) => !user.predictions[matchId])

    if (toUpsert.length > 0) {
      const { error } = await this.client.from('predictions').upsert(toUpsert)
      if (error) throw new Error(`Supabase savePredictions: ${error.message}`)
    }

    if (toDelete.length > 0) {
      const { error } = await this.client
        .from('predictions')
        .delete()
        .eq('email', user.email)
        .in('match_id', toDelete)
      if (error) throw new Error(`Supabase deletePredictions: ${error.message}`)
    }
  }

  async getAllUsers(): Promise<User[]> {
    const [usersRes, predictionsRes] = await Promise.all([
      this.client.from('users').select(USER_COLUMNS).returns<UserRow[]>(),
      this.client.from('predictions').select('email,match_id,home,away').returns<PredictionRow[]>(),
    ])
    if (usersRes.error) throw new Error(`Supabase getAllUsers: ${usersRes.error.message}`)
    if (predictionsRes.error)
      throw new Error(`Supabase getAllUsers/predictions: ${predictionsRes.error.message}`)

    const byEmail = new Map<string, PredictionRow[]>()
    for (const row of predictionsRes.data ?? []) {
      const list = byEmail.get(row.email) ?? []
      list.push(row)
      byEmail.set(row.email, list)
    }

    return (usersRes.data ?? []).map((row) =>
      rowToUser(row, rowsToPredictions(byEmail.get(row.email) ?? [])),
    )
  }

  async getResults(): Promise<Record<string, Score>> {
    const { data, error } = await this.client.from('results').select('*').returns<ResultRow[]>()
    if (error) throw new Error(`Supabase getResults: ${error.message}`)
    return Object.fromEntries(
      (data ?? []).map((row) => [row.match_id, { home: row.home, away: row.away }]),
    )
  }

  async saveResult(matchId: string, score: Score): Promise<void> {
    const { error } = await this.client
      .from('results')
      .upsert({ match_id: matchId, home: score.home, away: score.away })
    if (error) throw new Error(`Supabase saveResult: ${error.message}`)
  }

  async clearResult(matchId: string): Promise<void> {
    const { error } = await this.client.from('results').delete().eq('match_id', matchId)
    if (error) throw new Error(`Supabase clearResult: ${error.message}`)
  }
}
