---
name: financeiro-crediario
description: Use ao mexer em totais da OS, desconto, entrada, forma de pagamento, crediário da loja, geração de parcelas, juros, promissória, caixa ou contas a receber.
---

# Financeiro e crediário

Regras em `docs/regras-de-negocio.md` §2–§3. Código em `web/src/domain/totais.ts` e `web/src/domain/crediario.ts`.

## Regra de ouro
**Tudo em centavos inteiros.** Converta na borda: `paraCentavos("1.234,56")` na entrada, `formatarMoeda(centavos)` na saída. Nenhuma soma de reais em float.

## Gerar crediário
1. `saldo = totalOs - somaEntradas` (centavos).
2. `simularCrediario({ valorCentavos, parcelas, jurosMesPct, metodo, primeiroVencimento, diaVencimento })` retorna `{ parcelas: [{numero, vencimento, valorCentavos}], totalCentavos, jurosCentavos }`.
3. Mostre a simulação **antes** de confirmar (total, juros, parcela, datas).
4. Ao confirmar, grave `crediarios` + `parcelas` na **mesma transação** (Edge Function ou RPC `gerar_crediario`), nunca parcela por parcela do front.

## Invariantes (todas têm teste)
- `Σ parcelas == totalCentavos` exatamente; a sobra de arredondamento vai na última.
- Juros 0 → parcelas iguais ao valor dividido.
- Dia 31 em mês curto → último dia do mês.
- `entrada <= totalOs`; total da OS nunca negativo.

## Promissória
Gerada a partir do crediário: dados do cliente (nome, CPF, endereço), valor total por extenso, vencimentos, local e data. Componente `ImpressaoPromissoria`.

## Mudanças nesse fluxo
Qualquer alteração em cálculo de juros, arredondamento ou geração de parcelas muda dinheiro do cliente: **descreva e peça aprovação antes**.
