// Edge Function: gerenciar-usuarios
// Cria usuários da loja, redefine senha e altera nome/papel/situação.
// Publicar com "Verify JWT" DESLIGADO: a autorização é feita aqui, conferindo o
// token do usuário e o papel dele na loja (admin ou gerente).
//
// Ações (POST JSON):
//   { acao: "criar", email, nome, papel, senha }
//   { acao: "redefinir_senha", perfil_id, senha }
//   { acao: "alterar", perfil_id, nome?, papel?, ativo? }
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PAPEIS = ['admin', 'gerente', 'vendedor', 'vendedor_externo', 'caixa'] as const
type Papel = (typeof PAPEIS)[number]

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const erro = (mensagem: string, status = 400) => resposta({ erro: mensagem }, status)

function chaveSecreta(): string {
  const novas = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (novas) {
    try { const k = JSON.parse(novas)?.default; if (k) return k } catch { /* usa a antiga */ }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return erro('Use POST', 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', chaveSecreta(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1) Quem está chamando
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return erro('Faça login de novo.', 401)
  const { data: quem, error: erroQuem } = await admin.auth.getUser(token)
  if (erroQuem || !quem.user) return erro('Sessão inválida. Faça login de novo.', 401)

  const { data: meu } = await admin.from('perfis')
    .select('id, loja_id, papel').eq('user_id', quem.user.id).eq('ativo', true).limit(1).maybeSingle()
  if (!meu) return erro('Seu usuário não está ligado a uma loja.', 403)
  if (meu.papel !== 'admin' && meu.papel !== 'gerente') return erro('Só administrador ou gerente pode gerenciar usuários.', 403)
  const souAdmin = meu.papel === 'admin'

  let corpo: Record<string, unknown>
  try { corpo = await req.json() } catch { return erro('Corpo da requisição inválido.') }
  const acao = String(corpo.acao ?? '')

  // Perfil-alvo da mesma loja (redefinir/alterar)
  async function alvo(perfilId: unknown) {
    const { data } = await admin.from('perfis')
      .select('id, user_id, loja_id, papel, ativo, nome').eq('id', String(perfilId ?? '')).maybeSingle()
    if (!data || data.loja_id !== meu!.loja_id) return null
    return data
  }

  try {
    if (acao === 'criar') {
      const email = String(corpo.email ?? '').trim().toLowerCase()
      const nome = String(corpo.nome ?? '').trim()
      const papel = String(corpo.papel ?? 'vendedor') as Papel
      const senha = String(corpo.senha ?? '')
      if (!emailValido(email)) return erro('E-mail inválido.')
      if (!nome) return erro('Informe o nome.')
      if (!PAPEIS.includes(papel)) return erro('Papel inválido.')
      if (papel === 'admin' && !souAdmin) return erro('Só o administrador pode criar outro administrador.', 403)
      if (senha.length < 8) return erro('A senha provisória precisa ter pelo menos 8 caracteres.')

      let userId: string | null = null
      let criadoAgora = false
      const { data: novo, error: erroNovo } = await admin.auth.admin.createUser({
        email, password: senha, email_confirm: true, user_metadata: { nome, trocar_senha: true },
      })
      if (novo?.user) { userId = novo.user.id; criadoAgora = true }
      else if (erroNovo && /already|registered|exists/i.test(erroNovo.message)) {
        // Login já existe (ex.: trabalha em outra loja): só liga à loja, sem mudar a senha dele
        for (let pagina = 1; pagina <= 20 && !userId; pagina++) {
          const { data: lista } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 })
          const achado = lista?.users.find(u => (u.email ?? '').toLowerCase() === email)
          if (achado) userId = achado.id
          if (!lista || lista.users.length < 200) break
        }
        if (!userId) return erro('Esse e-mail já existe, mas não foi possível localizar o login.')
      } else {
        return erro(`Não foi possível criar o login: ${erroNovo?.message ?? 'erro desconhecido'}`)
      }

      const { data: jaTem } = await admin.from('perfis').select('id').eq('user_id', userId).eq('loja_id', meu.loja_id).maybeSingle()
      if (jaTem) return erro('Esse e-mail já é usuário desta loja.')

      const { data: perfil, error: erroPerfil } = await admin.from('perfis')
        .insert({ user_id: userId, loja_id: meu.loja_id, nome, papel, email, ativo: true })
        .select('id, nome, papel, email, ativo').single()
      if (erroPerfil) {
        if (criadoAgora) await admin.auth.admin.deleteUser(userId!)
        return erro(`Não foi possível ligar o usuário à loja: ${erroPerfil.message}`)
      }
      return resposta({ ok: true, perfil, login_existente: !criadoAgora })
    }

    if (acao === 'redefinir_senha') {
      const p = await alvo(corpo.perfil_id)
      if (!p) return erro('Usuário não encontrado nesta loja.', 404)
      if (p.papel === 'admin' && !souAdmin) return erro('Só o administrador pode redefinir a senha de outro administrador.', 403)
      const senha = String(corpo.senha ?? '')
      if (senha.length < 8) return erro('A senha provisória precisa ter pelo menos 8 caracteres.')
      const { error: e } = await admin.auth.admin.updateUserById(p.user_id, { password: senha, user_metadata: { trocar_senha: true } })
      if (e) return erro(`Não foi possível redefinir: ${e.message}`)
      return resposta({ ok: true })
    }

    if (acao === 'alterar') {
      const p = await alvo(corpo.perfil_id)
      if (!p) return erro('Usuário não encontrado nesta loja.', 404)
      if (p.papel === 'admin' && !souAdmin) return erro('Só o administrador pode alterar outro administrador.', 403)
      const mudar: Record<string, unknown> = {}
      if (typeof corpo.nome === 'string' && corpo.nome.trim()) mudar.nome = corpo.nome.trim()
      if (typeof corpo.papel === 'string') {
        if (!PAPEIS.includes(corpo.papel as Papel)) return erro('Papel inválido.')
        if (corpo.papel === 'admin' && !souAdmin) return erro('Só o administrador pode promover a administrador.', 403)
        mudar.papel = corpo.papel
      }
      if (typeof corpo.ativo === 'boolean') mudar.ativo = corpo.ativo
      if (p.id === meu.id && (mudar.ativo === false || (mudar.papel && mudar.papel !== meu.papel))) {
        return erro('Você não pode desativar nem mudar o próprio papel.')
      }
      if (p.papel === 'admin' && (mudar.ativo === false || (mudar.papel && mudar.papel !== 'admin'))) {
        const { count } = await admin.from('perfis').select('id', { count: 'exact', head: true })
          .eq('loja_id', meu.loja_id).eq('papel', 'admin').eq('ativo', true)
        if ((count ?? 0) <= 1) return erro('A loja precisa ter pelo menos um administrador ativo.')
      }
      if (!Object.keys(mudar).length) return erro('Nada para alterar.')
      const { error: e } = await admin.from('perfis').update(mudar).eq('id', p.id)
      if (e) return erro(`Não foi possível alterar: ${e.message}`)
      return resposta({ ok: true })
    }

    return erro('Ação desconhecida.')
  } catch (e) {
    return erro(`Erro inesperado: ${e instanceof Error ? e.message : String(e)}`, 500)
  }
})
