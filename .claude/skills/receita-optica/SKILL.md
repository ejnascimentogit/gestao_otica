---
name: receita-optica
description: Use ao criar ou alterar qualquer código que envolva receita óptica — dioptrias (esférico, cilindro, eixo), adição, cálculo de perto, DNP, altura, transposição, sugestão de índice de refração ou leitura de receita por IA.
---

# Receita óptica

As regras completas estão em `docs/regras-de-negocio.md` §1. Esta skill é o roteiro para aplicá-las sem erro.

## Onde fica o código
- Regras puras: `web/src/domain/receita.ts` (sem React, sem I/O)
- Testes: `web/src/domain/receita.test.ts`
- Tela: `web/src/pages/ordens/ReceitaForm.tsx` só chama o domínio

## Checklist
1. **Tipos**: dioptria é `number | null` em dioptrias (não centavos). Use `arredondarPasso(valor, 0.25)` antes de salvar.
2. **Exibição**: sempre `formatarDioptria(v)` → `+1,25`, `-0,50`, `Plano` para 0. Eixo com `°`.
3. **Cálculo de perto**: `calcularPerto(longe, adicao)`; nunca sobrescreva valores de perto editados manualmente sem confirmação.
4. **Transposição**: `transporCilindro({esf, cil, eixo})`. A loja guarda a convenção; converta ao salvar, não ao exibir.
5. **Validação**: `validarReceita(r)` retorna lista de erros por campo (eixo obrigatório com cilindro, faixas, passos). Mostre ao lado do campo.
6. **IA**: resultado da IA entra como rascunho (`lida_por_ia = true`, `conferida = false`). O botão "Confirmar receita" só habilita com a imagem visível ao lado.
7. **Teste** todo caso novo: valores negativos, adição sem esférico, eixo 0/180, transposição ida e volta (deve voltar ao original).

## Armadilhas comuns
- `0.1 + 0.2` — arredonde para o passo antes de comparar.
- Eixo 0 e 180 são o mesmo meridiano; normalize para 180 quando vier 0 com cilindro.
- Vírgula decimal do usuário: `parseDioptria("-1,25")` aceita vírgula e ponto.
- Não confundir DNP (por olho, mm) com DP binocular (soma dos dois).
