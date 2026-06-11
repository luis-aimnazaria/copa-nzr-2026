/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do projeto Supabase (https://xxxx.supabase.co). */
  readonly VITE_SUPABASE_URL?: string
  /** Chave pública no formato novo (sb_publishable_...). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Chave pública no formato legado (anon JWT). */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
