---
name: migracao-supabase
description: Use ao criar ou alterar tabelas, colunas, índices, funções, triggers, policies RLS ou buckets de Storage do Supabase deste projeto.
---

# Migração Supabase

## Passos
1. Leia `docs/modelo-de-dados.md` e a migração mais recente em `supabase/migrations/`.
2. **Nunca edite uma migração já existente.** Crie um arquivo novo: `supabase/migrations/AAAAMMDDHHMMSS_descricao_curta.sql`.
3. Siga as convenções:
   - nomes em português, `snake_case`, tabelas no plural
   - `id uuid primary key default gen_random_uuid()`
   - `loja_id uuid not null references lojas(id)` em toda tabela de negócio
   - dinheiro `numeric(12,2)`; dioptria `numeric(5,2)`; mm `numeric(4,1)`
   - datas de negócio `date`; eventos `timestamptz default now()`
   - índice começando por `loja_id` nas consultas de listagem
4. **RLS obrigatório** em tabela nova:
   ```sql
   alter table <t> enable row level security;
   create policy <t>_por_loja on <t> for all
     using (loja_id in (select minhas_lojas()))
     with check (loja_id in (select minhas_lojas()));
   ```
5. Operações com várias tabelas que precisam ser atômicas (ex.: gerar crediário, finalizar OS) → função `plpgsql` chamada via RPC, `security invoker`.
6. Valide a sintaxe antes de commitar:
   ```bash
   pip install pglast && python -c "import pglast;pglast.parse_sql(open('ARQUIVO').read())"
   ```
   ou `supabase db reset` localmente se o CLI estiver instalado.
7. Atualize `docs/modelo-de-dados.md` (tabela e diagrama) e os tipos do front (`supabase gen types typescript`).

## Antes de aplicar em projeto remoto
Mostre o SQL e espere aprovação. Migração em produção não volta atrás sem outra migração.
