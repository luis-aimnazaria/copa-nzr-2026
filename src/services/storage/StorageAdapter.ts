import type { Score, User } from '../../types'

/**
 * Contrato de persistência do bolão.
 *
 * Toda a aplicação fala apenas com esta interface — hoje implementada em
 * LocalStorage. Para migrar para Supabase/Firebase, basta criar um novo
 * adapter (ex.: SupabaseAdapter) e trocar a instância em `services/storage/index.ts`.
 * Todos os métodos são assíncronos justamente para que essa troca seja transparente.
 */
export interface StorageAdapter {
  /** Busca um usuário pelo e-mail (normalizado). Retorna null se não existir. */
  getUser(email: string): Promise<User | null>

  /** Cria ou atualiza um usuário (upsert pelo e-mail). */
  saveUser(user: User): Promise<void>

  /** Lista todos os usuários cadastrados (usado pelo ranking). */
  getAllUsers(): Promise<User[]>

  /** Resultados reais apurados, indexados por id do jogo. */
  getResults(): Promise<Record<string, Score>>

  /** Registra/atualiza o resultado real de um jogo. */
  saveResult(matchId: string, score: Score): Promise<void>

  /** Remove a apuração de um jogo (volta a ficar pendente). */
  clearResult(matchId: string): Promise<void>
}
