/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do projeto Supabase (https://xxxx.supabase.co). */
  readonly VITE_SUPABASE_URL?: string
  /** Chave pública (anon) do Supabase. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
