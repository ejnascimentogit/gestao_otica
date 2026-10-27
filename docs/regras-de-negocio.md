# Regras de Negócio

Fonte da verdade para cálculos. Cada regra tem implementação em `web/src/domain/` e teste correspondente.

## 1. Receita óptica (`domain/receita.ts`)

### 1.1 Formato
| Campo | Faixa | Passo | Exibição |
|---|---|---|---|
| Esférico | -30,00 a +30,00 | 0,25 | sinal + 2 casas (`+2,25`, `-0,75`, `0,00` como `Plano`) |
| Cilindro | -10,00 a +10,00 | 0,25 | sinal + 2 casas |
| Eixo | 0 a 180 | 1 | inteiro + `°`; obrigatório se cilindro ≠ 0 |
| Adição | +0,75 a +4,00 | 0,25 | sinal + 2 casas |
| DNP (por olho) | 25,0 a 40,0 mm | 0,5 | 1 casa |
| Altura | 10,0 a 35,0 mm | 0,5 | 1 casa |

### 1.2 Cálculo de perto
```
esf_perto = esf_longe + adicao
cil_perto = cil_longe
eixo_perto = eixo_longe
```
Só calcula se `adicao` estiver preenchida. Se o usuário editar o perto manualmente, não sobrescrever sem confirmar.

### 1.3 Transposição de cilindro
Para converter entre convenções (+cil ↔ -cil):
```
esf' = esf + cil
cil' = -cil
eixo' = eixo <= 90 ? eixo + 90 : eixo - 90
```
A loja escolhe a convenção padrão (default: cilindro negativo). Receita digitada na outra convenção é transposta ao salvar.

### 1.4 Equivalente esférico (para sugestão de índice)
`EE = esf + cil / 2`

### 1.5 Sugestão de índice de refração (💡 referência inicial, ajustável por loja)
Usa o maior |meridiano| entre os olhos (`max(|esf|, |esf + cil|)`):

| Maior meridiano | Índice sugerido |
|---|---|
| até 2,00 | 1.50 / 1.56 |
| 2,25 a 4,00 | 1.59 / 1.61 |
| 4,25 a 6,00 | 1.67 |
| acima de 6,00 | 1.74 |

### 1.6 Leitura por IA
A IA só **preenche rascunho**. A receita fica `lida_por_ia = true, conferida = false` até o usuário confirmar olhando a imagem. OS não sai de "orçamento"/"aberta" para "em laboratório" com receita não conferida.

## 2. Itens e totais (`domain/totais.ts`)
- Todo cálculo em **centavos inteiros**.
- `total_item = round(quantidade × valor_unitario) − desconto_item`
- `subtotal = Σ total_item`
- `total_os = subtotal − desconto_geral` (nunca negativo)
- Quantidade sugerida: produto com `unidade_venda = UN` do tipo lente → 2; `PAR` → 1; demais → 1.

## 3. Pagamento e crediário (`domain/crediario.ts`)

### 3.1 Entrada
- `entrada ≤ total_os`. Gera `caixa_movimentos` tipo `entrada` com a forma escolhida.
- `saldo = total_os − Σ entradas`.

### 3.2 Crediário da loja
Parâmetros: `valor_financiado (= saldo)`, `n` parcelas (1–24), `i` juros % ao mês, `primeiro_vencimento`, `dia_vencimento`.

**Método padrão: Price (parcelas iguais)**
```
se i = 0:  parcela = valor / n
senão:     parcela = valor × i / (1 − (1 + i)^−n)
```
**Método alternativo: juros simples**
```
total = valor × (1 + i × n);  parcela = total / n
```
Arredondamento: calcula em centavos; a diferença de centavos vai para a **última** parcela, para que `Σ parcelas = total` exato.

Vencimentos: primeira em `primeiro_vencimento`; as seguintes no mesmo `dia_vencimento` dos meses seguintes. Se o mês não tem o dia (ex.: 31), usa o último dia do mês.

Antes de confirmar, a tela mostra: valor financiado, juros, total a pagar, valor da parcela e as datas.

### 3.3 Baixa de parcela
- Pagamento total → `status = paga`.
- Pagamento parcial → `status = parcial`, `valor_pago` acumula.
- Gera `caixa_movimentos` com `parcela_id`.
- 💡 Atraso: multa e juros de mora configuráveis por loja (padrão 2% + 1% a.m. pro rata).

## 4. Status da OS
```
orcamento → aberta → em_laboratorio → aguardando_retirada → finalizada
     ↘________↘______________↘_____________→ cancelada
```
- Orçamento não gera financeiro.
- `em_laboratorio` exige laboratório e receita conferida.
- `finalizada` exige saldo = 0 **ou** crediário gerado.
- `cancelada` com entrada recebida → gera estorno (saída no caixa) após confirmação.
- Toda mudança grava `os_status_historico` (trigger no banco).

## 5. Impressão da OS
Três vias: cliente, loja e laboratório. Via do laboratório **sem nenhum valor monetário**.
