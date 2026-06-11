import type { Score, User } from '../../types'
import type { StorageAdapter } from './StorageAdapter'

const USERS_KEY = 'bolao2026:users'
const RESULTS_KEY = 'bolao2026:results'

/**
 * Implementação do StorageAdapter sobre LocalStorage, simulando um
 * banco de dados com duas "tabelas":
 *  - bolao2026:users   → Record<email, User>
 *  - bolao2026:results → Record<matchId, Score>
 */
export class LocalStorageAdapter implements StorageAdapter {
  private read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  }

  private write(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value))
  }

  async getUser(email: string): Promise<User | null> {
    const users = this.read<Record<string, User>>(USERS_KEY, {})
    return users[email] ?? null
  }

  async saveUser(user: User): Promise<void> {
    const users = this.read<Record<string, User>>(USERS_KEY, {})
    users[user.email] = { ...user, updatedAt: new Date().toISOString() }
    this.write(USERS_KEY, users)
  }

  async getAllUsers(): Promise<User[]> {
    return Object.values(this.read<Record<string, User>>(USERS_KEY, {}))
  }

  async getResults(): Promise<Record<string, Score>> {
    return this.read<Record<string, Score>>(RESULTS_KEY, {})
  }

  async saveResult(matchId: string, score: Score): Promise<void> {
    const results = await this.getResults()
    results[matchId] = score
    this.write(RESULTS_KEY, results)
  }

  async clearResult(matchId: string): Promise<void> {
    const results = await this.getResults()
    delete results[matchId]
    this.write(RESULTS_KEY, results)
  }
}
