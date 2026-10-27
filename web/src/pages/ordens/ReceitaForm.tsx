import { useState } from 'react'
import { Botao, Campo, Entrada, Icone, Selecao } from '../../components/ui'
import {
  calcularPerto, formatarDioptria, parseDioptria, sugerirIndice, validarReceita,
  type Olho, type Receita,
} from '../../domain/receita'

type Lado = 'od' | 'oe'

function DioptriaInput({ valor, aoMudar, invalida }: { valor: number | null; aoMudar: (v: number | null) => void; invalida?: boolean }) {
  const [txt, setTxt] = useState<string | null>(null)
  return (
    <Entrada
      inputMode="decimal"
      invalida={invalida}
      value={txt ?? formatarDioptria(valor)}
      placeholder="—"
      onFocus={() => setTxt(valor === null ? '' : String(valor).replace('.', ','))}
      onChange={e => setTxt(e.target.value)}
      onBlur={() => { aoMudar(parseDioptria(txt ?? '')); setTxt(null) }}
    />
  )
}

function NumInput({ valor, aoMudar, invalida, passo = 0.5 }: { valor: number | null; aoMudar: (v: number | null) => void; invalida?: boolean; passo?: number }) {
  return (
    <Entrada
      type="number" step={passo} inputMode="decimal" invalida={invalida} placeholder="—"
      value={valor ?? ''}
      onChange={e => aoMudar(e.target.value === '' ? null : Number(e.target.value))}
    />
  )
}

export function ReceitaForm({ receita, aoMudar }: { receita: Receita; aoMudar: (r: Receita) => void }) {
  const erros = validarReceita(receita)
  const set = (fn: (r: Receita) => void) => { const c = structuredClone(receita); fn(c); aoMudar(c) }
  const setOlho = (dist: 'longe' | 'perto', lado: Lado, campo: keyof Olho, v: number | null) =>
    set(r => { r[dist][lado][campo] = v })

  const temGrau = receita.longe.od.esf !== null || receita.longe.oe.esf !== null
  const sugestao = temGrau ? sugerirIndice(receita) : null

  function calcular() {
    set(r => {
      r.perto.od = calcularPerto(r.longe.od, r.adicao)
      r.perto.oe = calcularPerto(r.longe.oe, r.adicao)
    })
  }

  function simularLeituraIa() {
    // Protótipo: simula a resposta da IA. Na versão real, o upload vai para o Storage
    // e uma Edge Function devolve o JSON da receita (ver docs/mapeamento.md §2.3).
    set(r => {
      r.longe.od = { esf: -2.25, cil: -0.75, eixo: 175 }
      r.longe.oe = { esf: -2.5, cil: -0.5, eixo: 10 }
      r.adicao = 1.75
      r.lidaPorIa = true
      r.conferida = false
    })
  }

  const linha = (dist: 'longe' | 'perto', lado: Lado) => (
    <tr key={dist + lado}>
      <td className="olho">{lado.toUpperCase()}</td>
      <td><DioptriaInput valor={receita[dist][lado].esf} aoMudar={v => setOlho(dist, lado, 'esf', v)} invalida={!!erros[`${dist}.${lado}.esf`]} /></td>
      <td><DioptriaInput valor={receita[dist][lado].cil} aoMudar={v => setOlho(dist, lado, 'cil', v)} invalida={!!erros[`${dist}.${lado}.cil`]} /></td>
      <td><NumInput passo={1} valor={receita[dist][lado].eixo} aoMudar={v => setOlho(dist, lado, 'eixo', v)} invalida={!!erros[`${dist}.${lado}.eixo`]} /></td>
      {dist === 'longe' ? (
        <>
          <td><NumInput valor={receita.dnp[lado]} aoMudar={v => set(r => { r.dnp[lado] = v })} invalida={!!erros[`dnp.${lado}`]} /></td>
          <td><NumInput valor={receita.altura[lado]} aoMudar={v => set(r => { r.altura[lado] = v })} invalida={!!erros[`altura.${lado}`]} /></td>
        </>
      ) : <><td /><td /></>}
    </tr>
  )

  const listaErros = Object.values(erros)

  return (
    <div>
      <div className="linha" style={{ marginBottom: 12 }}>
        <Botao pequeno onClick={simularLeituraIa}>{Icone.camera} Ler receita por foto (IA)</Botao>
        <Botao pequeno onClick={calcular} disabled={receita.adicao === null}>{Icone.calc} Calcular perto pela adição</Botao>
        <span className="espaco" />
        {sugestao && <span className="fraco">Índice sugerido: <b>{sugestao.indice.toFixed(2)}</b> ({sugestao.motivo})</span>}
      </div>

      {receita.lidaPorIa && !receita.conferida && (
        <div className="aviso alerta" style={{ marginBottom: 12 }}>
          <span style={{ flex: 1 }}>Receita preenchida pela IA. Confira cada valor com a imagem antes de enviar ao laboratório.</span>
          <Botao pequeno variante="acento" onClick={() => set(r => { r.conferida = true })}>Confirmar conferência</Botao>
        </div>
      )}

      <div className="receita-scroll">
        <table className="tabela-receita">
          <thead>
            <tr><th /><th>Esférico</th><th>Cilindro</th><th>Eixo</th><th>DNP</th><th>Altura</th></tr>
          </thead>
          <tbody>
            <tr><td colSpan={6} className="grupo">Longe</td></tr>
            {linha('longe', 'od')}
            {linha('longe', 'oe')}
            <tr>
              <td colSpan={6} className="grupo">
                <div className="linha">
                  <span>Perto</span>
                  <span className="espaco" />
                  <span className="fraco">Adição</span>
                  <div style={{ width: 96 }}><DioptriaInput valor={receita.adicao} aoMudar={v => set(r => { r.adicao = v })} invalida={!!erros.adicao} /></div>
                </div>
              </td>
            </tr>
            {linha('perto', 'od')}
            {linha('perto', 'oe')}
          </tbody>
        </table>
      </div>

      {listaErros.length > 0 && (
        <ul style={{ color: 'var(--erro)', fontSize: 12, margin: '8px 0 0', paddingLeft: 18 }}>
          {[...new Set(listaErros)].map(e => <li key={e}>{e}</li>)}
        </ul>
      )}

      <div className="grade" style={{ marginTop: 16 }}>
        <Campo rotulo="Tipo de armação">
          <Selecao value={receita.armacao.tipo} onChange={e => set(r => { r.armacao.tipo = e.target.value })}>
            <option value="">Selecione</option>
            <option>Aro fechado (acetato)</option>
            <option>Aro fechado (metal)</option>
            <option>Fio de nylon</option>
            <option>Parafusada</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Horizontal (mm)"><NumInput valor={receita.armacao.horizontal} aoMudar={v => set(r => { r.armacao.horizontal = v })} /></Campo>
        <Campo rotulo="Vertical (mm)"><NumInput valor={receita.armacao.vertical} aoMudar={v => set(r => { r.armacao.vertical = v })} /></Campo>
        <Campo rotulo="Diagonal maior (mm)"><NumInput valor={receita.armacao.diagonal} aoMudar={v => set(r => { r.armacao.diagonal = v })} /></Campo>
        <Campo rotulo="Ponte (mm)"><NumInput valor={receita.armacao.ponte} aoMudar={v => set(r => { r.armacao.ponte = v })} /></Campo>
      </div>
      <Campo rotulo="Observações da receita" style={{ marginTop: 12 }}>
        <textarea className="entrada" value={receita.observacoes} onChange={e => set(r => { r.observacoes = e.target.value })} />
      </Campo>
    </div>
  )
}
