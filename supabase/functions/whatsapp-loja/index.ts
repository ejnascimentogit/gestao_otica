// Edge Function: whatsapp-loja
// WhatsApp da loja pelo WuzAPI (o mesmo servidor do Taskfull), para enviar o recibo em PDF.
// Publicar com "Verify JWT" DESLIGADO: a função confere o token de quem chamou e a loja dele.
// Segredos (Edge Functions → Secrets): WUZAPI_URL (sem barra no fim) e WUZAPI_ADMIN_TOKEN, os mesmos do Taskfull.
//
// POST JSON, sempre responde 200 com { ok, erro, ... }:
//   { acao: "estado" }
//   { acao: "conectar", consentimento: true }   (admin ou gerente)
//   { acao: "qr" }
//   { acao: "desconectar" }                      (admin ou gerente)
//   { acao: "enviar", telefone, nome?, texto, recibo_id?, arquivo?: { nome, tipo: "application/pdf"|"image/png", base64 } }
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const resp = (o: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

function chaveSecreta(): string {
  const novas = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (novas) { try { const k = JSON.parse(novas)?.default; if (k) return k } catch { /* usa a antiga */ } }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

// ---------- WuzAPI ----------
type Cfg = { url: string; admin: string }
type Resp = { ok: boolean; status: number; json: any } // eslint-disable-line @typescript-eslint/no-explicit-any
function cfgDoAmbiente(): Cfg | null {
  const url = (Deno.env.get('WUZAPI_URL') ?? '').trim().replace(/\/+$/, '')
  const admin = (Deno.env.get('WUZAPI_ADMIN_TOKEN') ?? '').trim()
  return url && admin ? { url, admin } : null
}
async function chamar(cfg: Cfg, caminho: string, o: { metodo?: string; token?: string; admin?: boolean; corpo?: unknown } = {}): Promise<Resp> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (o.admin) headers['Authorization'] = cfg.admin; else if (o.token) headers['token'] = o.token
  try {
    const r = await fetch(cfg.url + caminho, {
      method: o.metodo ?? (o.corpo ? 'POST' : 'GET'), headers,
      body: o.corpo ? JSON.stringify(o.corpo) : undefined, signal: AbortSignal.timeout(25000),
    })
    let json = null
    try { json = await r.json() } catch { /* sem corpo JSON */ }
    return { ok: r.ok && json?.success !== false, status: r.status, json }
  } catch (e) {
    return { ok: false, status: 0, json: { error: 'Servidor do WhatsApp inacessível: ' + String((e as Error)?.message || e).slice(0, 120) } }
  }
}
const erroWz = (r: Resp) => String(r.json?.error ?? r.json?.message ?? r.json?.data?.Details ?? ('HTTP ' + r.status)).slice(0, 200)
const wz = {
  criarUsuario: (c: Cfg, nome: string, token: string) => chamar(c, '/admin/users', { admin: true, corpo: { name: nome, token, events: 'ReadReceipt' } }),
  conectar: (c: Cfg, t: string) => chamar(c, '/session/connect', { token: t, corpo: { Subscribe: ['ReadReceipt'], Immediate: true } }),
  status: (c: Cfg, t: string) => chamar(c, '/session/status', { token: t }),
  qr: (c: Cfg, t: string) => chamar(c, '/session/qr', { token: t }),
  sair: (c: Cfg, t: string) => chamar(c, '/session/logout', { token: t, corpo: {} }),
  checar: (c: Cfg, t: string, fone: string) => chamar(c, '/user/check', { token: t, corpo: { Phone: [fone] } }),
  texto: (c: Cfg, t: string, fone: string, corpo: string) => chamar(c, '/chat/send/text', { token: t, corpo: { Phone: fone, Body: corpo } }),
  imagem: (c: Cfg, t: string, fone: string, dataUrl: string, legenda: string) => chamar(c, '/chat/send/image', { token: t, corpo: { Phone: fone, Image: dataUrl, Caption: legenda } }),
  documento: (c: Cfg, t: string, fone: string, dataUrl: string, nome: string, legenda: string) => chamar(c, '/chat/send/document', { token: t, corpo: { Phone: fone, Document: dataUrl, FileName: nome, MimeType: 'application/pdf', Caption: legenda } }),
}
const logado = (st: Resp) => (st.json?.data?.loggedIn ?? st.json?.data?.LoggedIn) === true
const jidDe = (st: Resp) => st.json?.data?.jid ?? st.json?.data?.Jid ?? st.json?.data?.JID ?? null
const numeroDoJid = (jid: unknown) => { const d = String(jid ?? '').split('@')[0].split(':')[0].replace(/\D/g, ''); return d || null }
function hex(n: number) { const b = new Uint8Array(n); crypto.getRandomValues(b); return [...b].map(x => x.toString(16).padStart(2, '0')).join('') }

/** "(81) 99999-0000" → 5581999990000; com + na frente, o país digitado */
function normalizarTelefone(bruto: string): string | null {
  const texto = String(bruto ?? '').trim()
  const internacional = /^(\+|00)/.test(texto)
  let d = texto.replace(/\D/g, '').replace(/^00/, '')
  if (!internacional && (d.length === 10 || d.length === 11)) d = '55' + d
  if (d.length < 11 || d.length > 15) return null
  if (d.startsWith('55') && d.length !== 12 && d.length !== 13) return null
  return d
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return resp({ ok: false, erro: 'Use POST' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', chaveSecreta(), { auth: { persistSession: false, autoRefreshToken: false } })
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return resp({ ok: false, erro: 'Faça login de novo.' }, 401)
  const { data: quem } = await admin.auth.getUser(token)
  if (!quem?.user) return resp({ ok: false, erro: 'Sessão inválida. Faça login de novo.' }, 401)
  const { data: perfil } = await admin.from('perfis').select('loja_id, papel').eq('user_id', quem.user.id).eq('ativo', true).limit(1).maybeSingle()
  if (!perfil) return resp({ ok: false, erro: 'Seu usuário não está ligado a uma loja.' })
  const loja = perfil.loja_id as string
  const gestor = perfil.papel === 'admin' || perfil.papel === 'gerente'

  // deno-lint-ignore no-explicit-any
  let b: any = {}
  try { b = await req.json() } catch { /* sem corpo */ }
  const cfg = cfgDoAmbiente()
  const conta = async () => (await admin.from('whatsapp_contas').select('loja_id, status, telefone, limite_diario, consentimento_em, ultimo_erro').eq('loja_id', loja).maybeSingle()).data
  const tokenLoja = async () => (await admin.rpc('whatsapp_token', { p_loja: loja })).data as string | null
  const marcar = (campos: Record<string, unknown>) =>
    admin.from('whatsapp_contas').upsert({ loja_id: loja, ...campos, atualizado_em: new Date().toISOString() })
  const enviadasHoje = async () => {
    const inicio = new Date(Date.now() - 3 * 3600_000); inicio.setUTCHours(3, 0, 0, 0)   // meia-noite de Brasília
    const { count } = await admin.from('whatsapp_envios').select('id', { count: 'exact', head: true }).eq('loja_id', loja).eq('status', 'enviada').gte('criado_em', inicio.toISOString())
    return count ?? 0
  }

  try {
    switch (b.acao) {
      case 'estado': {
        let c = await conta()
        if (c && cfg) {
          const t = await tokenLoja()
          if (t) {
            const st = await wz.status(cfg, t)
            if (st.ok) {
              const novo = logado(st) ? 'conectada' : (c.status === 'aguardando_qr' ? 'aguardando_qr' : 'desconectada')
              if (novo !== c.status) { await marcar({ status: novo }); c = { ...c, status: novo } }
            }
          }
        }
        return resp({ ok: true, configurado: !!cfg, conta: c, enviadas_hoje: await enviadasHoje() })
      }

      case 'conectar': {
        if (!gestor) return resp({ ok: false, erro: 'Só administrador ou gerente conecta o WhatsApp da loja.' })
        if (!cfg) return resp({ ok: false, erro: 'O servidor do WhatsApp ainda não foi configurado (segredos WUZAPI_URL e WUZAPI_ADMIN_TOKEN).' })
        if (b.consentimento !== true) return resp({ ok: false, erro: 'É preciso aceitar o aviso antes de conectar.' })
        let t = await tokenLoja()
        if (!t) {
          t = hex(24)
          const novo = await wz.criarUsuario(cfg, 'otica-' + loja.slice(0, 8), t)
          if (!novo.ok) {
            return resp({ ok: false, erro: /already|exists|duplicate/i.test(erroWz(novo))
              ? 'Esta loja já existe no servidor do WhatsApp, mas sem credencial guardada. Remova "otica-' + loja.slice(0, 8) + '" no painel do WuzAPI e tente de novo.'
              : 'Não consegui criar a conta no servidor do WhatsApp: ' + erroWz(novo) })
          }
          const { error } = await admin.rpc('whatsapp_salvar_token', { p_loja: loja, p_token: t })
          if (error) return resp({ ok: false, erro: 'Não consegui guardar a credencial: ' + error.message })
        }
        await marcar({ consentimento_em: new Date().toISOString(), status: 'aguardando_qr', ultimo_erro: null })
        const c = await wz.conectar(cfg, t)
        if (!c.ok && !/already connected/i.test(erroWz(c))) {
          await marcar({ status: 'erro', ultimo_erro: erroWz(c) })
          return resp({ ok: false, erro: 'Não consegui iniciar a conexão: ' + erroWz(c) })
        }
        return resp({ ok: true })
      }

      case 'qr': {
        if (!cfg) return resp({ ok: false, erro: 'Servidor do WhatsApp não configurado.' })
        const t = await tokenLoja()
        if (!t) return resp({ ok: false, erro: 'Conecte primeiro.' })
        const st = await wz.status(cfg, t)
        if (st.ok && logado(st)) {
          const jid = jidDe(st)
          await marcar({ status: 'conectada', jid, telefone: numeroDoJid(jid), ultimo_erro: null })
          return resp({ ok: true, conectada: true, telefone: numeroDoJid(jid) })
        }
        if (st.ok && (st.json?.data?.connected ?? st.json?.data?.Connected) !== true) await wz.conectar(cfg, t)
        const q = await wz.qr(cfg, t)
        return resp({ ok: true, conectada: false, qr: q.json?.data?.QRCode ?? q.json?.data?.qrcode ?? null })
      }

      case 'desconectar': {
        if (!gestor) return resp({ ok: false, erro: 'Só administrador ou gerente desconecta o WhatsApp da loja.' })
        const t = await tokenLoja()
        if (cfg && t) await wz.sair(cfg, t)
        await marcar({ status: 'desconectada', telefone: null, jid: null })
        return resp({ ok: true })
      }

      case 'enviar': {
        const c = await conta()
        if (!c || c.status !== 'conectada') return resp({ ok: false, erro: 'O WhatsApp da loja não está conectado.' })
        if (!cfg) return resp({ ok: false, erro: 'Servidor do WhatsApp não configurado.' })
        const fone = normalizarTelefone(b.telefone)
        if (!fone) return resp({ ok: false, erro: 'Número inválido. Use DDD e número, ex.: (81) 99999-0000.' })
        const texto = String(b.texto ?? '').trim()
        if (!texto) return resp({ ok: false, erro: 'Escreva a mensagem.' })
        if (texto.length > 1500) return resp({ ok: false, erro: 'Mensagem muito longa (máximo 1500 caracteres).' })
        const arq = b.arquivo && typeof b.arquivo.base64 === 'string' ? b.arquivo : null
        if (arq && (!['application/pdf', 'image/png', 'image/jpeg'].includes(arq.tipo) || arq.base64.length > 8_000_000)) return resp({ ok: false, erro: 'Arquivo inválido ou grande demais.' })
        if ((await enviadasHoje()) >= c.limite_diario) return resp({ ok: false, erro: `Limite de ${c.limite_diario} mensagens por dia atingido, para proteger o número da loja. Tente amanhã.` })
        const t = await tokenLoja()
        if (!t) return resp({ ok: false, erro: 'Credencial do WhatsApp não encontrada. Desconecte e conecte de novo.' })

        const registrar = (status: 'enviada' | 'erro', erro?: string) => admin.from('whatsapp_envios').insert({
          loja_id: loja, recibo_id: b.recibo_id ?? null, telefone: fone, nome: String(b.nome ?? '').slice(0, 80), texto,
          arquivo: arq ? String(arq.nome ?? '').slice(0, 80) : null, status, erro: erro ?? null, enviado_por: quem.user.id,
        })

        const chk = await wz.checar(cfg, t, fone)
        if (chk.status === 0 || chk.status >= 500) { await registrar('erro', erroWz(chk)); return resp({ ok: false, erro: 'Servidor do WhatsApp fora do ar: ' + erroWz(chk) }) }
        const u = chk.json?.data?.Users?.[0]
        if (chk.ok && u && u.IsInWhatsapp === false) { await registrar('erro', 'Número sem WhatsApp'); return resp({ ok: false, erro: 'Este número não tem WhatsApp.' }) }
        const destino = String(u?.JID ?? '').split('@')[0].split(':')[0] || fone

        let r: Resp
        if (arq) {
          const dataUrl = `data:${arq.tipo};base64,${arq.base64}`
          const nome = String(arq.nome || 'recibo.pdf').replace(/[^\w.\- ]+/g, '_').slice(0, 80)
          if (arq.tipo.startsWith('image/')) r = await wz.imagem(cfg, t, destino, dataUrl, texto)
          else r = await wz.documento(cfg, t, destino, dataUrl, nome, texto)   // a mensagem vai como legenda do PDF
        } else r = await wz.texto(cfg, t, destino, texto)

        if (r.ok) { await registrar('enviada'); return resp({ ok: true }) }
        const erro = erroWz(r)
        if (/not (logged|connected)|no session|disconnected/i.test(erro) || r.status === 401) {
          await marcar({ status: 'desconectada', ultimo_erro: erro })
          await registrar('erro', erro)
          return resp({ ok: false, erro: 'O WhatsApp da loja foi desconectado. Leia o QR de novo.' })
        }
        await registrar('erro', erro)
        return resp({ ok: false, erro: 'Não foi possível enviar: ' + erro })
      }

      default:
        return resp({ ok: false, erro: 'Ação desconhecida.' })
    }
  } catch (e) {
    console.error('whatsapp-loja:', e)
    return resp({ ok: false, erro: 'Erro inesperado: ' + String((e as Error)?.message || e).slice(0, 160) })
  }
})
