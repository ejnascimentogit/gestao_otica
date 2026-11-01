-- =====================================================================
-- Gestão Ótica — WhatsApp da loja (WuzAPI), para enviar o recibo em PDF
-- Mesmo servidor WuzAPI do Taskfull. Uma conexão (QR) por loja.
-- O token da loja no WuzAPI fica no Vault; o navegador nunca vê o token.
-- Quem grava aqui é só a Edge Function whatsapp-loja (chave de serviço).
-- =====================================================================

create table if not exists public.whatsapp_contas (
  loja_id          uuid primary key references public.lojas(id) on delete cascade,
  status           text not null default 'desconectada' check (status in ('desconectada','aguardando_qr','conectada','erro')),
  telefone         text,
  jid              text,
  segredo_id       uuid,
  limite_diario    integer not null default 50,
  consentimento_em timestamptz,
  ultimo_erro      text,
  atualizado_em    timestamptz not null default now()
);
alter table public.whatsapp_contas enable row level security;
create policy whatsapp_contas_ler on public.whatsapp_contas for select to authenticated using (loja_id in (select minhas_lojas()));
grant select (loja_id, status, telefone, limite_diario, consentimento_em, ultimo_erro, atualizado_em) on public.whatsapp_contas to authenticated;

create table if not exists public.whatsapp_envios (
  id         uuid primary key default gen_random_uuid(),
  loja_id    uuid not null references public.lojas(id) on delete cascade,
  recibo_id  uuid references public.recibos(id) on delete set null,
  telefone   text not null,
  nome       text,
  texto      text not null,
  arquivo    text,
  status     text not null check (status in ('enviada','erro')),
  erro       text,
  enviado_por uuid,
  criado_em  timestamptz not null default now()
);
create index if not exists whatsapp_envios_loja on public.whatsapp_envios (loja_id, criado_em desc);
alter table public.whatsapp_envios enable row level security;
create policy whatsapp_envios_ler on public.whatsapp_envios for select to authenticated using (loja_id in (select minhas_lojas()));
grant select on public.whatsapp_envios to authenticated;

-- Token da loja no Vault (só a chave de serviço chama estas duas)
create or replace function public.whatsapp_salvar_token(p_loja uuid, p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  v_id := vault.create_secret(p_token, 'whatsapp-loja-' || p_loja::text || '-' || extract(epoch from now())::bigint, 'Token WuzAPI da loja');
  insert into whatsapp_contas (loja_id, segredo_id) values (p_loja, v_id)
  on conflict (loja_id) do update set segredo_id = excluded.segredo_id, atualizado_em = now();
end $$;

create or replace function public.whatsapp_token(p_loja uuid) returns text
language sql security definer set search_path = public as $$
  select s.decrypted_secret from vault.decrypted_secrets s
   where s.id = (select segredo_id from whatsapp_contas where loja_id = p_loja)
$$;

revoke all on function public.whatsapp_salvar_token(uuid, text) from public, anon, authenticated;
revoke all on function public.whatsapp_token(uuid) from public, anon, authenticated;
grant execute on function public.whatsapp_salvar_token(uuid, text), public.whatsapp_token(uuid) to service_role;
