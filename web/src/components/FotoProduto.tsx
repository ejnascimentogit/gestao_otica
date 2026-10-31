import { useRef, useState } from 'react'
import { Botao, Icone } from './ui'
import { reduzirImagem } from '../lib/imagem'
import { enviarFotoProduto, tentar } from '../data/store'

/** Desenho de óculos para quando o produto ainda não tem foto */
export function SemFoto({ tamanho = 40 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 48 24" width={tamanho} height={tamanho / 2} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <circle cx="13" cy="13" r="8" /><circle cx="35" cy="13" r="8" /><path d="M21 12q3-3 6 0M5 11 1 8M43 11l4-3" />
    </svg>
  )
}

export function MiniaturaProduto({ url, alt, tamanho = 44 }: { url?: string; alt: string; tamanho?: number }) {
  return (
    <span className="foto-mini" style={{ width: tamanho, height: tamanho }}>
      {url ? <img src={url} alt={alt} loading="lazy" /> : <SemFoto tamanho={tamanho * 0.7} />}
    </span>
  )
}

/** Foto do produto: escolher/tirar, reduzir e enviar. Chama aoMudar com o endereço novo. */
export function FotoProduto({ produtoId, url, aoMudar }: { produtoId: string; url?: string; aoMudar: (url: string | undefined) => void }) {
  const entrada = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)

  async function escolheu(arquivo?: File) {
    if (!arquivo) return
    setEnviando(true)
    const novo = await tentar(async () => enviarFotoProduto(produtoId, await reduzirImagem(arquivo)))
    setEnviando(false)
    if (novo) aoMudar(novo)
  }

  return (
    <div className="linha" style={{ gap: 12, alignItems: 'center' }}>
      <span className="foto-produto">{url ? <img src={url} alt="Foto do produto" /> : <SemFoto tamanho={56} />}</span>
      <div style={{ display: 'grid', gap: 6 }}>
        <input ref={entrada} type="file" accept="image/*" hidden onChange={e => { escolheu(e.target.files?.[0]); e.target.value = '' }} />
        <Botao pequeno disabled={enviando} onClick={() => entrada.current?.click()}>{Icone.camera} {enviando ? 'Enviando…' : url ? 'Trocar foto' : 'Adicionar foto'}</Botao>
        {url && <Botao pequeno variante="fantasma" onClick={() => aoMudar(undefined)}>Remover foto</Botao>}
        <span className="fraco">Fundo claro e a armação de frente ficam melhor.</span>
      </div>
    </div>
  )
}
