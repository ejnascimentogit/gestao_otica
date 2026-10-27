import { createClient } from '@supabase/supabase-js'

// URL e chave publishable são públicas por desenho: o acesso aos dados depende
// do login e da RLS por loja. A chave secret/service_role NUNCA entra no front.
const URL_PADRAO = 'https://mhouxtzeomirluezzaql.supabase.co'
const CHAVE_PADRAO = 'sb_publishable_JuJETcFaPDLXb2-aQ8rLxg_8EFyrwxY'

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || URL_PADRAO
export const SUPABASE_CHAVE = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || CHAVE_PADRAO

/** Modo demonstração: dados de exemplo em memória, sem login (usado no protótipo publicado). */
export const MODO_DEMO = import.meta.env.MODE === 'single' || import.meta.env.VITE_MODO === 'demo'

export const sb = createClient(SUPABASE_URL, SUPABASE_CHAVE, {
  auth: { persistSession: true, autoRefreshToken: true },
})
