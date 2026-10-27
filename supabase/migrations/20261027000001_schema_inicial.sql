-- =====================================================================
-- Gestão Ótica — schema inicial (MVP)
-- Convenções: ver docs/modelo-de-dados.md e .claude/skills/migracao-supabase
--   * toda tabela de negócio tem loja_id + RLS por loja
--   * valores monetários em numeric(12,2); dioptrias em numeric(5,2)
--   * nomes em português, snake_case, plural
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------------------------------------------------
create type os_status as enum (
  'orcamento', 'aberta', 'em_laboratorio', 'aguardando_retirada', 'finalizada', 'cancelada'
);
create type forma_pagamento as enum (
  'dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'crediario_loja', 'boleto'
);
create type tipo_produto as enum ('lente', 'armacao', 'lente_contato', 'acessorio', 'servico');
create type unidade_venda as enum ('UN', 'PAR');
create type papel_usuario as enum ('admin', 'gerente', 'vendedor', 'vendedor_externo', 'caixa');
create type status_parcela as enum ('aberta', 'paga', 'parcial', 'cancelada');
create type status_agendamento as enum ('agendado', 'realizado', 'cancelado');

-- ---------- Lojas e usuários ----------------------------------------
create table lojas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text,
  telefone    text,
  endereco    jsonb,
  logo_url    text,
  criado_em   timestamptz not null default now()
);

create table perfis (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  loja_id     uuid not null references lojas(id) on delete cascade,
  nome        text not null,
  papel       papel_usuario not null default 'vendedor',
  comissao_pct numeric(5,2) default 0,
  ativo       boolean not null default true,
  unique (user_id, loja_id)
);

-- Lojas que o usuário logado acessa (base de todas as policies)
create or replace function minhas_lojas() returns setof uuid
language sql stable security definer set search_path = public as $$
  select loja_id from perfis where user_id = auth.uid() and ativo
$$;

-- ---------- Cadastros ------------------------------------------------
create table clientes (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references lojas(id),
  nome          text not null,
  cpf_cnpj      text,
  celular       text,
  email         text,
  nascimento    date,
  endereco      jsonb,
  inscricao_estadual text,
  regime_tributario  text,
  indicador_ie  smallint default 9,          -- 9 = não contribuinte
  observacoes   text,
  criado_em     timestamptz not null default now(),
  unique (loja_id, cpf_cnpj)
);
create index on clientes (loja_id, nome);
create index on clientes (loja_id, celular);

create table laboratorios (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references lojas(id),
  nome        text not null,
  telefone    text,
  prazo_dias  int default 7,
  ativo       boolean not null default true
);

create table produtos (
  id              uuid primary key default gen_random_uuid(),
  loja_id         uuid not null references lojas(id),
  tipo            tipo_produto not null,
  codigo          text,
  codigo_barras   text,
  descricao       text not null,
  marca           text,
  unidade_venda   unidade_venda not null default 'UN',
  custo           numeric(12,2) default 0,
  preco           numeric(12,2) not null default 0,
  estoque         numeric(12,3) default 0,
  controla_estoque boolean not null default true,
  -- atributos de lente
  indice_refracao numeric(4,2),            -- 1.50, 1.56, 1.59, 1.67, 1.74
  desenho_lente   text,                    -- monofocal, multifocal, ocupacional
  tratamentos     text[],
  -- fiscal
  ncm             text,
  cfop            text,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);
create index on produtos (loja_id, descricao);
create index on produtos (loja_id, codigo_barras);

-- ---------- Ordem de serviço -----------------------------------------
create table ordens_servico (
  id                uuid primary key default gen_random_uuid(),
  loja_id           uuid not null references lojas(id),
  numero            int not null,
  cliente_id        uuid not null references clientes(id),
  vendedor_id       uuid references perfis(id),
  laboratorio_id    uuid references laboratorios(id),
  status            os_status not null default 'aberta',
  data_os           date not null default current_date,
  previsao_entrega  date,
  controle_interno  text,
  observacoes       text,
  subtotal          numeric(12,2) not null default 0,
  desconto          numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  criado_por        uuid references auth.users(id) default auth.uid(),
  criado_em         timestamptz not null default now(),
  finalizada_em     timestamptz,
  unique (loja_id, numero)
);
create index on ordens_servico (loja_id, status);
create index on ordens_servico (loja_id, cliente_id);

-- numeração sequencial por loja
create or replace function os_proximo_numero() returns trigger
language plpgsql as $$
begin
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtext(new.loja_id::text));
    select coalesce(max(numero), 0) + 1 into new.numero
      from ordens_servico where loja_id = new.loja_id;
  end if;
  return new;
end $$;
create trigger trg_os_numero before insert on ordens_servico
  for each row execute function os_proximo_numero();

create table os_status_historico (
  id          bigint generated always as identity primary key,
  loja_id     uuid not null references lojas(id),
  os_id       uuid not null references ordens_servico(id) on delete cascade,
  de          os_status,
  para        os_status not null,
  usuario_id  uuid default auth.uid(),
  em          timestamptz not null default now()
);

create or replace function os_registra_status() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into os_status_historico (loja_id, os_id, de, para)
    values (new.loja_id, new.id, case when tg_op = 'UPDATE' then old.status end, new.status);
    if new.status = 'finalizada' then new.finalizada_em := now(); end if;
  end if;
  return new;
end $$;
create trigger trg_os_status_ins after insert on ordens_servico
  for each row execute function os_registra_status();
create trigger trg_os_status_upd before update of status on ordens_servico
  for each row execute function os_registra_status();

-- Receita: 1 por OS. Dioptrias em passos de 0,25; eixo 0..180.
create table receitas (
  os_id         uuid primary key references ordens_servico(id) on delete cascade,
  loja_id       uuid not null references lojas(id),
  -- longe
  od_esf numeric(5,2), od_cil numeric(5,2), od_eixo smallint check (od_eixo between 0 and 180),
  oe_esf numeric(5,2), oe_cil numeric(5,2), oe_eixo smallint check (oe_eixo between 0 and 180),
  od_dnp numeric(4,1), oe_dnp numeric(4,1),
  od_altura numeric(4,1), oe_altura numeric(4,1),
  -- perto
  adicao numeric(4,2),
  od_esf_perto numeric(5,2), od_cil_perto numeric(5,2), od_eixo_perto smallint,
  oe_esf_perto numeric(5,2), oe_cil_perto numeric(5,2), oe_eixo_perto smallint,
  -- armação
  armacao_tipo        text,
  armacao_horizontal  numeric(4,1),
  armacao_vertical    numeric(4,1),
  armacao_diagonal    numeric(4,1),
  armacao_ponte       numeric(4,1),
  -- origem
  imagem_path   text,                    -- Storage: receitas/<loja_id>/<os_id>.jpg
  lida_por_ia   boolean not null default false,
  conferida     boolean not null default true,
  observacoes   text,
  medico        text,
  data_receita  date
);

create table os_itens (
  id              uuid primary key default gen_random_uuid(),
  loja_id         uuid not null references lojas(id),
  os_id           uuid not null references ordens_servico(id) on delete cascade,
  produto_id      uuid references produtos(id),
  descricao       text not null,
  unidade         unidade_venda not null default 'UN',
  quantidade      numeric(12,3) not null default 1 check (quantidade > 0),
  valor_unitario  numeric(12,2) not null default 0,
  desconto        numeric(12,2) not null default 0,
  total           numeric(12,2) generated always as (round(quantidade * valor_unitario - desconto, 2)) stored
);
create index on os_itens (os_id);

-- ---------- Financeiro -----------------------------------------------
create table caixas (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references lojas(id),
  aberto_por    uuid default auth.uid(),
  aberto_em     timestamptz not null default now(),
  saldo_inicial numeric(12,2) not null default 0,
  fechado_em    timestamptz,
  saldo_final   numeric(12,2)
);

create table caixa_movimentos (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references lojas(id),
  caixa_id      uuid references caixas(id),
  os_id         uuid references ordens_servico(id),
  parcela_id    uuid,
  tipo          text not null check (tipo in ('entrada', 'saida', 'sangria', 'suprimento')),
  forma         forma_pagamento not null,
  valor         numeric(12,2) not null check (valor > 0),
  descricao     text,
  em            timestamptz not null default now(),
  usuario_id    uuid default auth.uid()
);
create index on caixa_movimentos (loja_id, em);

create table crediarios (
  id              uuid primary key default gen_random_uuid(),
  loja_id         uuid not null references lojas(id),
  os_id           uuid not null references ordens_servico(id),
  cliente_id      uuid not null references clientes(id),
  valor_financiado numeric(12,2) not null,
  juros_mes_pct   numeric(5,2) not null default 0,
  parcelas        smallint not null check (parcelas between 1 and 24),
  metodo_juros    text not null default 'price' check (metodo_juros in ('price', 'simples')),
  valor_total     numeric(12,2) not null,
  criado_em       timestamptz not null default now()
);

create table parcelas (
  id              uuid primary key default gen_random_uuid(),
  loja_id         uuid not null references lojas(id),
  crediario_id    uuid not null references crediarios(id) on delete cascade,
  cliente_id      uuid not null references clientes(id),
  numero          smallint not null,
  vencimento      date not null,
  valor           numeric(12,2) not null,
  valor_pago      numeric(12,2) not null default 0,
  pago_em         date,
  status          status_parcela not null default 'aberta',
  unique (crediario_id, numero)
);
create index on parcelas (loja_id, vencimento) where status in ('aberta', 'parcial');

alter table caixa_movimentos
  add constraint caixa_movimentos_parcela_fk foreign key (parcela_id) references parcelas(id);

create table contas_pagar (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references lojas(id),
  fornecedor    text not null,
  laboratorio_id uuid references laboratorios(id),
  descricao     text,
  vencimento    date not null,
  valor         numeric(12,2) not null,
  pago_em       date,
  valor_pago    numeric(12,2)
);

-- ---------- Agenda ---------------------------------------------------
create table agendamentos (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references lojas(id),
  cliente_id  uuid references clientes(id),
  nome_avulso text,
  tipo        text not null default 'exame' check (tipo in ('exame', 'retirada', 'ajuste', 'outro')),
  inicio      timestamptz not null,
  fim         timestamptz,
  status      status_agendamento not null default 'agendado',
  observacoes text
);
create index on agendamentos (loja_id, inicio);

-- ---------- RLS ------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','laboratorios','produtos','ordens_servico','os_status_historico',
    'receitas','os_itens','caixas','caixa_movimentos','crediarios','parcelas',
    'contas_pagar','agendamentos'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all using (loja_id in (select minhas_lojas())) with check (loja_id in (select minhas_lojas()))',
      t || '_por_loja', t);
  end loop;
end $$;

alter table lojas enable row level security;
create policy lojas_minhas on lojas for select using (id in (select minhas_lojas()));

alter table perfis enable row level security;
create policy perfis_mesma_loja on perfis for select using (loja_id in (select minhas_lojas()));
