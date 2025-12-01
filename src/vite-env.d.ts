/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // add more VITE_ env vars here later if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
