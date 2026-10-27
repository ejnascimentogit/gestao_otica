# Gestão Ótica

Sistema de gestão para óticas: ordem de serviço com receita óptica, crediário próprio, financeiro, agenda e simulador de lentes.

## Documentação
| Documento | Conteúdo |
|---|---|
| [docs/mapeamento.md](docs/mapeamento.md) | Módulos, campos, o que é MVP e roadmap |
| [docs/regras-de-negocio.md](docs/regras-de-negocio.md) | Cálculos: receita, totais, crediário, status |
| [docs/modelo-de-dados.md](docs/modelo-de-dados.md) | Tabelas, relacionamentos e RLS |
| [CLAUDE.md](CLAUDE.md) | Instruções para o Claude Code trabalhar no repo |

## Skills (Claude Code)
| Skill | Quando usar |
|---|---|
| `nova-tela` | Criar tela/módulo no front |
| `migracao-supabase` | Qualquer mudança no banco |
| `receita-optica` | Dioptrias, adição, DNP, transposição, IA de receita |
| `financeiro-crediario` | Totais, entrada, parcelas, juros, caixa |

## Rodando o protótipo
```bash
cd web
npm install
npm run dev
```
O protótipo usa dados de exemplo em memória (`web/src/data/`). A troca para o Supabase é feita módulo a módulo, mantendo as mesmas funções.

## Banco
```bash
supabase link --project-ref <seu-projeto>
supabase db push
```

## Stack
Supabase (Postgres, Auth, Storage, Edge Functions) · React · Vite · TypeScript · Vitest
