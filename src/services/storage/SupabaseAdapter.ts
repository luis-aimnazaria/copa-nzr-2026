import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Company, Score, User } from '../../types'
import type { StorageAdapter } from './StorageAdapter'

/** Linha da tabela public.users (ver supabase/schema.sql). */
interface UserRow {
  email: string
  name: string
  company: Company
  predictions: Record<string, Score>
  created_at: string
  updated_at: string
}

/** Linha da tabela public.results. */
interface ResultRow {
  match_id: string
  home: number
  away: number
}

const rowToUser = (row: UserRow): User => ({
  email: row.email,
  name: row.name,
  company: row.company,
  predictions: row.predictions ?? {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

/**
 * Persistência central no Supabase — todos os participantes compartilham
 * o mesmo banco, então o ranking funciona entre dispositivos diferentes.
 * Schema das tabelas em `supabase/schema.sql`.
 */
export class SupabaseAdapter implements StorageAdapter {
  private client: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey)
  }

  async getUser(email: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle<UserRow>()
    if (error) throw new Error(`Supabase getUser: ${error.message}`)
    return data ? rowToUser(data) : null
  }

  async saveUser(user: User): Promise<void> {
    const { error } = await this.client.from('users').upsert({
      email: user.email,
      name: user.name,
      company: user.company,
      predictions: user.predictions,
      created_at: user.createdAt,
      updated_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Supabase saveUser: ${error.message}`)
  }

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await this.client.from('users').select('*').returns<UserRow[]>()
    if (error) throw new Error(`Supabase getAllUsers: ${error.message}`)
    return (data ?? []).map(rowToUser)
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
