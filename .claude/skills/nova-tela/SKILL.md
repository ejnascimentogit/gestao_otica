---
name: nova-tela
description: Use ao criar uma nova tela, página ou módulo no front (web/), ou ao adicionar um item no menu lateral.
---

# Nova tela no front

## Estrutura
```
web/src/pages/<modulo>/
  <Modulo>Page.tsx        listagem/entrada do módulo
  <Modulo>Form.tsx        formulário (se houver)
web/src/domain/<modulo>.ts  regras puras + <modulo>.test.ts
web/src/data/<modulo>.ts    acesso a dados (mock agora, Supabase depois)
```

## Passos
1. Regras de negócio novas → primeiro em `domain/` com teste (`npm test`).
2. Dados → função em `data/` com a mesma assinatura que terá no Supabase (`listarX`, `salvarX`), retornando `Promise`. O mock vive em memória.
3. Página → use os componentes de `components/ui.tsx` (`Card`, `Campo`, `Botao`, `Tabela`, `Badge`, `PageHeader`). Não crie estilos soltos.
4. Rota e menu → registre em `web/src/App.tsx` no array `MODULOS` (rota, rótulo, ícone).
5. Responsivo: precisa funcionar a partir de 375px (vendedor externo usa celular).
6. Rode `npm run build` sem erro de tipo antes de terminar.

## Padrões de UI
- Ação principal da tela: botão no `PageHeader`, à direita.
- Listagens: busca no topo, filtro por status com `Badge`, linha clicável abre o formulário.
- Formulários longos: seções em `Card` com título; totais e ações fixos no rodapé.
- Valores: `formatarMoeda`; dioptrias: `formatarDioptria`; datas: `dd/mm/aaaa`.
- Identidade visual própria (tokens em `web/src/index.css`). Não copiar layout, textos ou logos de outros sistemas.
