/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Optional: if set, only this email may stay signed in (see AuthApp). */
  readonly VITE_ALLOWED_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
