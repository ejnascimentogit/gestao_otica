# CLAUDE.md — Gestão Ótica

Sistema de gestão para óticas (OS, receita, crediário, financeiro, simulador de lentes).

## Antes de qualquer tarefa
1. Leia `docs/mapeamento.md` (o que o sistema faz) e `docs/regras-de-negocio.md` (como calcular).
2. Use a skill certa:
   - nova tela/módulo no front → `.claude/skills/nova-tela`
   - mudança no banco → `.claude/skills/migracao-supabase`
   - qualquer coisa com receita, dioptria, DNP, adição → `.claude/skills/receita-optica`
   - entrada, crediário, parcelas, caixa → `.claude/skills/financeiro-crediario`
3. **Antes de alterar um fluxo que já existe** (OS, financeiro, status, cálculos), descreva a mudança e espere aprovação do Edimilson.

## Estrutura
```
docs/                    documentação funcional e técnica
supabase/migrations/     SQL versionado (nunca editar migração já aplicada)
web/                     front React + Vite + TypeScript
  src/domain/            regras puras (receita, crediário, totais) + testes
  src/pages/             uma pasta/arquivo por módulo
  src/components/        componentes reutilizáveis
  src/data/              mock (protótipo) → depois repositórios Supabase
.claude/skills/          skills do projeto
```

## Comandos
```bash
cd web
npm install
npm run dev        # protótipo em http://localhost:5173
npm test           # testes das regras de domínio (vitest)
npm run build      # build de produção
```

## Convenções
- Código e nomes de domínio em **português** (`ordemServico`, `parcelas`), termos técnicos em inglês quando padrão (`useState`, `props`).
- Regra de negócio **só** em `web/src/domain/`, sem React, com teste. Telas chamam essas funções.
- Dinheiro: calcule em centavos (inteiro) e formate com `formatarMoeda`. Nunca some floats de reais direto.
- Dioptria: passos de 0,25, sempre exibida com sinal e 2 casas (`+1,25`, `-0,50`).
- Banco: toda tabela de negócio tem `loja_id` e RLS por `minhas_lojas()`.
- Identidade visual é **própria** do projeto. Não copiar telas, textos, logos ou nomes de sistemas de referência.
