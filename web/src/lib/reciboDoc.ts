// Documento do recibo (A4): HTML próprio, imagem desenhada pelo navegador e PDF de uma página.
// Mesma proposta do Taskfull. Nada de color-mix aqui: as misturas de cor são calculadas em JS.
import qrcode from 'qrcode-generator'
import { formatarData, formatarMoeda } from '../domain/formatos'
import {
  calcularParcelas, descricaoPagamento, formaParcelada, formatarDocumento, numeroRecibo, valorPorExtenso, type FormaRecibo,
} from '../domain/recibos'
import type { Recibo } from '../data/store'

export interface ImagensRecibo { logo?: string | null; loja?: string | null; cliente?: string | null; qr?: string | null }

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const brl = (c: number) => formatarMoeda(c).replace(/\s/g, ' ')
const mix = (hex: string, outro: string, pct: number) => {
  const a = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), o = [1, 3, 5].map(i => parseInt(outro.slice(i, i + 2), 16))
  return '#' + a.map((v, i) => Math.round((v * pct) / 100 + (o[i] * (100 - pct)) / 100).toString(16).padStart(2, '0')).join('')
}

export const urlConferencia = (origem: string, codigo: string) => `${origem}/recibo?c=${encodeURIComponent(codigo)}`
export const urlAssinatura = (origem: string, token: string) => `${origem}/recibo?t=${encodeURIComponent(token)}`

/** QR com o endereço de conferência, como imagem SVG embutida */
export function qrDoRecibo(origem: string, codigo: string): string {
  try {
    const q = qrcode(0, 'M'); q.addData(urlConferencia(origem, codigo)); q.make()
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(q.createSvgTag(4, 0))
  } catch { return '' }
}

const iconeInstagram = (cor: string) =>
  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="2" style="vertical-align:-2px"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="${cor}"/></svg>`

export function reciboHtml(r: Recibo, imgs: ImagensRecibo, host: string): string {
  const e = r.emissor
  const cor = /^#[0-9a-fA-F]{6}$/.test(e.cor || '') ? e.cor! : '#7a2e4d'
  const c18 = mix(cor, '#ffffff', 18), c45 = mix(cor, '#ffffff', 45), c05 = mix(cor, '#ffffff', 5), c60 = mix(cor, '#888888', 60)
  const doc = e.documento ? (e.documento.replace(/\D/g, '').length > 11 ? 'CNPJ ' : 'CPF ') + formatarDocumento(e.documento) : ''
  const contato = [e.telefone, e.email].filter(Boolean).join(' · ')
  const redes = (e.redes_sociais || '').split(/[\s,;]+/).filter(Boolean)
    .map(u => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;white-space:nowrap">${iconeInstagram(cor)}${esc(u.startsWith('@') ? u : '@' + u)}</span>`).join('')
  const extenso = valorPorExtenso(r.valor)
  const parcelas = formaParcelada(r.forma) ? calcularParcelas(r.valor, r.parcelas, r.primeiraParcela || r.dataEmissao) : null
  const criado = new Date(r.criadoEm)
  const quando = criado.toLocaleDateString('pt-BR') + ' às ' + criado.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const assLoja = imgs.loja ? `<img src="${imgs.loja}" style="max-height:100px;max-width:240px">` : ''
  const assCli = imgs.cliente ? `<img src="${imgs.cliente}" style="max-height:100px;max-width:240px">` : ''
  const sit = r.status === 'cancelado' ? '<div style="position:absolute;top:420px;left:120px;font-size:120px;font-weight:800;color:rgba(200,0,0,.18);transform:rotate(-20deg);letter-spacing:10px">CANCELADO</div>' : ''
  const docCli = r.clienteDocumento ? (r.clienteDocumento.length > 11 ? 'CNPJ ' : 'CPF ') + formatarDocumento(r.clienteDocumento) : ''
  const assinado = r.assinadoEm
    ? 'Assinou em ' + new Date(r.assinadoEm).toLocaleDateString('pt-BR') + ' às ' + new Date(r.assinadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      + (r.assinadoVia === 'link' ? ' pelo link' + (r.assinadoIp ? ' · IP ' + esc(r.assinadoIp) : '') : ' na tela')
    : 'Assinatura do cliente (opcional)'
  const pagamento = descricaoPagamento({ forma: r.forma as FormaRecibo, valor: r.valor, parcelas: r.parcelas, primeiraParcela: r.primeiraParcela, dataEmissao: r.dataEmissao })

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo ${numeroRecibo(r.numero)}</title><style>
@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{width:794px;min-height:1123px;margin:0 auto;font-family:Manrope,Inter,Arial,Helvetica,sans-serif;color:#1c2733;background:#fff;position:relative;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bar{height:10px;background:linear-gradient(90deg,${c45},${cor})}
.wrap{padding:34px 50px 0}
.head{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:2px solid ${c18}}
.logo{width:96px;height:96px;object-fit:contain;border-radius:12px;margin-right:18px}
.emp h1{font-size:25px;color:${cor};line-height:1.15}.emp p{font-size:11.5px;color:#5b6773;margin-top:3px;line-height:1.45}
.num{text-align:right}.num .t{font-size:10px;letter-spacing:2px;color:${c60};font-weight:700}.num .n{font-size:26px;font-weight:800;color:${cor}}.num .d{font-size:11px;color:#5b6773;margin-top:3px}
h2{font-size:28px;letter-spacing:4px;margin:24px 0 4px}.sub{font-size:11.5px;color:#6b7783;margin-bottom:16px}
.card{border:1px solid ${c18};border-radius:12px;padding:13px 16px;background:${c05};margin-bottom:11px}
.lbl{font-size:9px;letter-spacing:1.5px;font-weight:700;color:${c60};text-transform:uppercase;margin-bottom:4px}.val{font-size:15px;font-weight:600}
.total{display:flex;justify-content:space-between;align-items:center;background:${cor};color:#fff;border-radius:12px;padding:14px 20px;margin:12px 0}
.total .l{font-size:9.5px;letter-spacing:2px;font-weight:700;opacity:.85}.total .v{font-size:32px;font-weight:800}.total .e{font-size:11px;opacity:.92;max-width:360px;text-align:right;line-height:1.35}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}th{text-align:left;font-size:9px;letter-spacing:1.5px;color:${c60};padding:5px 7px;border-bottom:1px solid ${c18}}td{padding:6px 7px;border-bottom:1px solid #f1ece8}.r{text-align:right}
.txt{font-size:13px;line-height:1.55;margin:16px 0}.txt b{color:${cor}}
.sig{display:flex;gap:40px;margin-top:20px}.sig>div{flex:1;text-align:center}.sigimg{height:90px;display:flex;align-items:flex-end;justify-content:center}.line{border-top:1.5px solid #1c2733;padding-top:6px;font-size:12px;font-weight:600}.line small{display:block;font-size:10px;color:#6b7783;font-weight:400;margin-top:2px}
.qr{position:absolute;right:0;bottom:0;width:78px;height:78px}.ver{position:absolute;left:50px;right:50px;bottom:26px;min-height:78px;padding-right:92px;border-top:1px solid ${c18};padding-top:10px;font-size:9.5px;color:#6b7783;line-height:1.5}.ver b{color:#1c2733}.mono{font-family:Consolas,monospace;word-break:break-all}
</style></head><body><div class="bar"></div><div class="wrap">
<div class="head"><div style="display:flex;align-items:center">${imgs.logo ? `<img class="logo" src="${imgs.logo}">` : ''}<div class="emp"><h1>${esc(e.nome)}</h1><p>${esc(doc)}${e.endereco ? '<br>' + esc(e.endereco) : ''}${contato ? '<br>' + esc(contato) : ''}${redes ? '<br>' + redes : ''}</p></div></div>
<div class="num"><div class="t">RECIBO Nº</div><div class="n">${numeroRecibo(r.numero)}</div><div class="d">Emitido em ${formatarData(r.dataEmissao)}</div></div></div>
<h2>RECIBO DE PAGAMENTO</h2><div class="sub">Documento de quitação, sem valor de nota fiscal.</div>
<div class="card"><div class="lbl">Recebemos de</div><div class="val">${esc(r.clienteNome)}</div><div style="font-size:11px;color:#6b7783;margin-top:3px">${esc(docCli)}${docCli && r.descricao ? ' · ' : ''}${r.descricao ? 'Referente a ' + esc(r.descricao) : ''}</div></div>
<div class="total"><div><div class="l">VALOR TOTAL</div><div class="v">${brl(r.valor)}</div></div><div class="e">(${esc(extenso)})</div></div>
<div class="card"><div class="lbl">Condição de pagamento</div><div class="val">${esc(pagamento)}</div>${parcelas ? `<table><tr><th>PARCELA</th><th>VENCIMENTO</th><th class="r">VALOR</th></tr>${parcelas.map(p => `<tr><td>${p.n}/${r.parcelas}</td><td>${formatarData(p.vencimento)}</td><td class="r">${brl(p.valor)}</td></tr>`).join('')}</table>` : ''}</div>
<p class="txt">Recebemos de <b>${esc(r.clienteNome)}</b> a quantia de <b>${brl(r.valor)}</b> (${esc(extenso)})${r.descricao ? ', referente a ' + esc(r.descricao) : ''}, e damos plena quitação do valor acima.</p>
<div class="sig"><div><div class="sigimg">${assLoja}</div><div class="line">${esc(e.nome)}<small>Assinatura de quem recebeu</small></div></div>
<div><div class="sigimg">${assCli}</div><div class="line">${esc(r.clienteNome)}<small>${assinado}</small></div></div></div>
${sit}</div><div class="ver"><b>Recibo nº ${numeroRecibo(r.numero)}</b> · Código <b>${esc(r.codigo)}</b> · Emitido eletronicamente em ${quando} (horário de Brasília)<br>Código de autenticidade (SHA-256): <span class="mono">${esc(r.hash)}</span><br>É a “impressão digital” deste recibo: se qualquer dado for alterado, o código deixa de bater.<br>Confira em <b>${esc(host)}/recibo</b> com o código <b>${esc(r.codigo)}</b> ou leia o QR code.${imgs.qr ? `<img class="qr" src="${imgs.qr}">` : ''}</div></body></html>`
}

/** Imagem do recibo: o próprio navegador faz o layout (SVG com foreignObject → canvas) */
export async function reciboCanvas(html: string): Promise<HTMLCanvasElement> {
  const fr = document.createElement('iframe')
  fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;'
  document.body.appendChild(fr)
  try {
    await new Promise<void>(ok => { fr.onload = () => ok(); fr.srcdoc = html })
    const doc = fr.contentDocument!
    await Promise.all([...doc.images].map(i => i.decode?.().catch(() => undefined)))
    const altura = Math.max(1123, doc.body.scrollHeight)
    const xml = new XMLSerializer().serializeToString(doc.documentElement)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="794" height="${altura}"><foreignObject x="0" y="0" width="794" height="${altura}">${xml}</foreignObject></svg>`
    const img = new Image()
    await new Promise<void>((ok, erro) => { img.onload = () => ok(); img.onerror = () => erro(new Error('Não foi possível montar a imagem do recibo.')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) })
    const c = document.createElement('canvas'); c.width = 794 * 2; c.height = altura * 2
    const x = c.getContext('2d')!; x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height)
    c.toDataURL('image/png') // erro aqui = imagem "contaminada"
    return c
  } finally { fr.remove() }
}

/** PDF de uma página com a imagem do recibo (JPEG dentro do PDF), sem biblioteca */
export function pdfDeCanvas(canvas: HTMLCanvasElement): Blob {
  const b64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1], bin = atob(b64), jpeg = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) jpeg[i] = bin.charCodeAt(i)
  const w = canvas.width, h = canvas.height, larg = 595.28, alt = +((larg * h) / w).toFixed(2), enc = new TextEncoder()
  const partes: Uint8Array[] = [], offs: number[] = []
  let pos = 0
  const add = (x: string | Uint8Array) => { const b = typeof x === 'string' ? enc.encode(x) : x; partes.push(b); pos += b.length }
  add('%PDF-1.4\n')
  offs[1] = pos; add('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  offs[2] = pos; add('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  offs[3] = pos; add(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${larg} ${alt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`)
  offs[4] = pos; add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`); add(jpeg); add('\nendstream\nendobj\n')
  const cont = `q ${larg} 0 0 ${alt} 0 0 cm /Im0 Do Q`
  offs[5] = pos; add(`5 0 obj\n<< /Length ${cont.length} >>\nstream\n${cont}\nendstream\nendobj\n`)
  const xref = pos
  add('xref\n0 6\n0000000000 65535 f \n' + [1, 2, 3, 4, 5].map(i => String(offs[i]).padStart(10, '0') + ' 00000 n \n').join(''))
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(partes as BlobPart[], { type: 'application/pdf' })
}

/** Imagem (de arquivo ou endereço) como data URL, para o recibo virar arquivo sem depender da rede */
export async function comoDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('data:')) return url
  try {
    const blob = await (await fetch(url)).blob()
    return await new Promise<string>(ok => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.readAsDataURL(blob) })
  } catch { return url }
}
