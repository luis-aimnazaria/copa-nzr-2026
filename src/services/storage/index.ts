import { LocalStorageAdapter } from './LocalStorageAdapter'
import { SupabaseAdapter } from './SupabaseAdapter'
import type { StorageAdapter } from './StorageAdapter'

/**
 * Ponto único de escolha da camada de persistência:
 *  - Com VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY definidas (.env.local ou
 *    variáveis de ambiente da Vercel) → banco central no Supabase, ranking
 *    compartilhado entre todos os participantes.
 *  - Sem as variáveis → LocalStorage (modo demonstração, dados só no navegador).
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const db: StorageAdapter =
  supabaseUrl && supabaseKey
    ? new SupabaseAdapter(supabaseUrl, supabaseKey)
    : new LocalStorageAdapter()

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[storage] Supabase não configurado — usando LocalStorage (dados apenas neste navegador).',
  )
}

export type { StorageAdapter }
