-- =====================================================================
-- Gestão Ótica — Recibos de pagamento (trazidos do Taskfull, perfil Pessoal)
-- * dados da loja no recibo (e-mail, redes, cor, assinatura) e função para salvar
-- * recibos: número por loja, código de conferência, imutável depois de emitido
-- * link de assinatura do cliente (7 dias, uso único) e conferência pública (QR)
-- * bucket privado "recibos" (assinaturas), pasta = id da loja
-- =====================================================================

-- ---------- Dados da loja usados no recibo ----------
alter table public.lojas add column if not exists email text;
alter table public.lojas add column if not exists redes_sociais text;
alter table public.lojas add column if not exists cor_recibo text;
alter table public.lojas add column if not exists assinatura_path text;

-- lojas só tem leitura pela API: a gravação passa por esta função (só admin/gerente da loja)
create or replace function public.loja_salvar_dados(p_loja uuid, p_dados jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_loja not in (select minhas_lojas_gestor()) then
    raise exception 'Só administrador ou gerente pode alterar os dados da loja.';
  end if;
  update lojas set
    cnpj = coalesce(nullif(trim(p_dados->>'cnpj'), ''), cnpj),
    telefone = nullif(trim(coalesce(p_dados->>'telefone', telefone, '')), ''),
    email = nullif(trim(coalesce(p_dados->>'email', email, '')), ''),
    endereco = case when p_dados ? 'endereco' then jsonb_build_object('texto', trim(p_dados->>'endereco')) else endereco end,
    redes_sociais = nullif(trim(coalesce(p_dados->>'redes_sociais', redes_sociais, '')), ''),
    cor_recibo = case when coalesce(p_dados->>'cor_recibo', '') ~ '^#[0-9a-fA-F]{6}$' then p_dados->>'cor_recibo' else cor_recibo end,
    assinatura_path = case when p_dados ? 'assinatura_path' then nullif(p_dados->>'assinatura_path', '') else assinatura_path end
  where id = p_loja;
end $$;
revoke all on function public.loja_salvar_dados(uuid, jsonb) from public, anon;
grant execute on function public.loja_salvar_dados(uuid, jsonb) to authenticated;

-- ---------- Recibos ----------
create table if not exists public.recibos (
  id                      uuid primary key default gen_random_uuid(),
  loja_id                 uuid not null references public.lojas(id),
  numero                  integer not null default 0,
  codigo                  text not null default '',
  data_emissao            date not null default current_date,
  cliente_id              uuid references public.clientes(id) on delete set null,
  cliente_nome            text not null,
  cliente_documento       text not null default '',
  os_id                   uuid references public.ordens_servico(id) on delete set null,
  descricao               text not null default '',
  valor                   numeric(12,2) not null check (valor > 0),
  forma_pagamento         text not null check (forma_pagamento in ('pix','dinheiro','debito','credito_vista','credito_parcelado','crediario_loja','transferencia')),
  parcelas                integer not null default 1 check (parcelas between 1 and 24),
  primeira_parcela        date,
  observacao              text not null default '',
  emissor                 jsonb not null default '{}'::jsonb,
  hash                    text not null default '',
  status                  text not null default 'emitido' check (status in ('emitido','cancelado')),
  cancelado_em            timestamptz,
  assinatura_cliente_path text,
  assinatura_cliente_img  text,
  assinado_em             timestamptz,
  assinado_ip             text,
  assinado_agente         text,
  assinado_via            text,
  criado_por              uuid,
  created_at              timestamptz not null default now()
);
create unique index if not exists recibos_loja_numero on public.recibos (loja_id, numero);
create unique index if not exists recibos_codigo on public.recibos (codigo);
create index if not exists recibos_loja_data on public.recibos (loja_id, data_emissao desc);

create or replace function public.recibos_antes_inserir() returns trigger language plpgsql as $f$
begin
  perform pg_advisory_xact_lock(hashtext('recibo' || new.loja_id::text));
  select coalesce(max(numero), 0) + 1 into new.numero from public.recibos where loja_id = new.loja_id;
  if new.codigo is null or new.codigo = '' then
    new.codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  if new.criado_por is null then new.criado_por := auth.uid(); end if;
  new.status := 'emitido'; new.hash := ''; new.assinado_em := null;
  return new;
end $f$;

-- Recibo emitido não muda (só: hash uma vez, assinatura do cliente uma vez, cancelamento).
create or replace function public.recibos_antes_atualizar() returns trigger language plpgsql as $f$
begin
  if new.loja_id is distinct from old.loja_id or new.numero is distinct from old.numero or new.codigo is distinct from old.codigo
     or new.data_emissao is distinct from old.data_emissao or new.cliente_nome is distinct from old.cliente_nome
     or new.cliente_documento is distinct from old.cliente_documento or new.descricao is distinct from old.descricao
     or new.valor is distinct from old.valor or new.forma_pagamento is distinct from old.forma_pagamento
     or new.parcelas is distinct from old.parcelas or new.primeira_parcela is distinct from old.primeira_parcela
     or new.emissor is distinct from old.emissor or new.created_at is distinct from old.created_at
     or (new.hash is distinct from old.hash and old.hash <> '') then
    raise exception 'Um recibo emitido não pode ser alterado. Cancele e emita outro.';
  end if;
  if old.status = 'cancelado' and new.status <> 'cancelado' then
    raise exception 'Recibo cancelado não pode ser reativado.';
  end if;
  if old.assinado_em is not null and (new.assinado_em is distinct from old.assinado_em
     or new.assinatura_cliente_path is distinct from old.assinatura_cliente_path
     or new.assinatura_cliente_img is distinct from old.assinatura_cliente_img
     or new.assinado_ip is distinct from old.assinado_ip or new.assinado_agente is distinct from old.assinado_agente
     or new.assinado_via is distinct from old.assinado_via) then
    raise exception 'A assinatura já foi registrada e não pode ser trocada.';
  end if;
  return new;
end $f$;

drop trigger if exists trg_recibos_inserir on public.recibos;
create trigger trg_recibos_inserir before insert on public.recibos for each row execute function public.recibos_antes_inserir();
drop trigger if exists trg_recibos_atualizar on public.recibos;
create trigger trg_recibos_atualizar before update on public.recibos for each row execute function public.recibos_antes_atualizar();

alter table public.recibos enable row level security;
create policy recibos_ler on public.recibos for select to authenticated using (loja_id in (select minhas_lojas()));
create policy recibos_emitir on public.recibos for insert to authenticated with check (loja_id in (select minhas_lojas()));
create policy recibos_alterar on public.recibos for update to authenticated
  using (loja_id in (select minhas_lojas())) with check (loja_id in (select minhas_lojas()));
grant select, insert, update on public.recibos to authenticated;   -- sem delete: recibo só se cancela

-- ---------- Link de assinatura (cliente sem login) ----------
create table if not exists public.recibo_links (
  id         uuid primary key default gen_random_uuid(),
  recibo_id  uuid not null references public.recibos(id) on delete cascade,
  token      text not null unique,
  criado_em  timestamptz not null default now(),
  expira_em  timestamptz not null default now() + interval '7 days',
  usado_em   timestamptz,
  criado_por uuid
);
create index if not exists recibo_links_recibo on public.recibo_links (recibo_id);
alter table public.recibo_links enable row level security;   -- sem policy: só as funções abaixo mexem

create or replace function public.recibo_gerar_link(p_recibo uuid) returns text
language plpgsql security definer set search_path = public as $f$
declare r public.recibos; t text;
begin
  select * into r from public.recibos where id = p_recibo;
  if not found or r.loja_id not in (select minhas_lojas()) then raise exception 'Sem permissão para este recibo.'; end if;
  if r.status <> 'emitido' then raise exception 'Este recibo está cancelado.'; end if;
  if r.assinado_em is not null then raise exception 'Este recibo já foi assinado.'; end if;
  select token into t from public.recibo_links where recibo_id = p_recibo and usado_em is null and expira_em > now() order by criado_em desc limit 1;
  if t is null then
    t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.recibo_links (recibo_id, token, criado_por) values (p_recibo, t, auth.uid());
  end if;
  return t;
end $f$;

create or replace function public.recibo_link_dados(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $f$
declare l public.recibo_links; r public.recibos;
begin
  select * into l from public.recibo_links where token = p_token;
  if not found then return jsonb_build_object('erro', 'invalido'); end if;
  select * into r from public.recibos where id = l.recibo_id;
  if r.assinado_em is not null or l.usado_em is not null then return jsonb_build_object('erro', 'usado'); end if;
  if r.status <> 'emitido' then return jsonb_build_object('erro', 'cancelado'); end if;
  if l.expira_em < now() then return jsonb_build_object('erro', 'expirado'); end if;
  return jsonb_build_object('erro', null, 'numero', r.numero, 'data_emissao', r.data_emissao,
    'emissor_nome', r.emissor->>'nome', 'cliente_nome', r.cliente_nome, 'valor', r.valor,
    'forma_pagamento', r.forma_pagamento, 'parcelas', r.parcelas, 'descricao', r.descricao);
end $f$;

create or replace function public.recibo_link_assinar(p_token text, p_img text) returns jsonb
language plpgsql security definer set search_path = public as $f$
declare l public.recibo_links; r public.recibos; hdr json; ip text;
begin
  if p_img is null or p_img !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' or length(p_img) < 300 or length(p_img) > 600000 then
    return jsonb_build_object('ok', false, 'erro', 'Assinatura inválida. Desenhe de novo.');
  end if;
  select * into l from public.recibo_links where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'erro', 'Link inválido.'); end if;
  select * into r from public.recibos where id = l.recibo_id for update;
  if r.assinado_em is not null or l.usado_em is not null then return jsonb_build_object('ok', false, 'erro', 'Este recibo já foi assinado.'); end if;
  if r.status <> 'emitido' then return jsonb_build_object('ok', false, 'erro', 'Este recibo foi cancelado.'); end if;
  if l.expira_em < now() then return jsonb_build_object('ok', false, 'erro', 'O link expirou. Peça um novo.'); end if;
  begin hdr := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json; exception when others then hdr := '{}'::json; end;
  ip := trim(split_part(coalesce(hdr->>'cf-connecting-ip', hdr->>'x-forwarded-for', ''), ',', 1));
  update public.recibos set assinatura_cliente_img = p_img, assinatura_cliente_path = 'inline:' || r.id::text, assinado_em = now(),
    assinado_ip = nullif(ip, ''), assinado_agente = left(hdr->>'user-agent', 300), assinado_via = 'link' where id = r.id;
  update public.recibo_links set usado_em = now() where id = l.id;
  return jsonb_build_object('ok', true);
end $f$;

-- Conferência pública pelo código (QR): recalcula a impressão digital e compara com a gravada.
create or replace function public.recibo_verificar(p_codigo text) returns jsonb
language plpgsql security definer set search_path = public set timezone = 'UTC' as $f$
declare r public.recibos; calc text; doc text; nome text;
begin
  select * into r from public.recibos where codigo = upper(trim(p_codigo));
  if not found then return jsonb_build_object('encontrado', false); end if;
  calc := encode(sha256(convert_to(concat_ws('|', r.id::text, r.numero::text, r.codigo, r.data_emissao::text, r.cliente_nome, r.cliente_documento,
    trim_scale(r.valor)::text, r.forma_pagamento, r.parcelas::text, coalesce(r.primeira_parcela::text, ''), coalesce(r.emissor->>'documento', ''),
    trim(both '"' from to_json(r.created_at)::text)), 'UTF8')), 'hex');
  doc := regexp_replace(coalesce(r.emissor->>'documento', ''), '\D', '', 'g');
  if length(doc) = 11 then doc := '***.' || substr(doc, 4, 3) || '.' || substr(doc, 7, 3) || '-**'; end if;
  nome := split_part(r.cliente_nome, ' ', 1);
  if position(' ' in trim(r.cliente_nome)) > 0 then nome := nome || ' ' || upper(left(regexp_replace(trim(r.cliente_nome), '^.*\s', ''), 1)) || '.'; end if;
  return jsonb_build_object('encontrado', true, 'numero', r.numero, 'data_emissao', r.data_emissao,
    'emissor_nome', r.emissor->>'nome', 'emissor_documento', doc,
    'cliente_nome', nome, 'valor', r.valor, 'forma_pagamento', r.forma_pagamento, 'parcelas', r.parcelas,
    'status', r.status, 'cancelado_em', r.cancelado_em, 'assinado', r.assinado_em is not null, 'assinado_em', r.assinado_em,
    'assinado_via', r.assinado_via, 'hash', r.hash, 'integro', (r.hash <> '' and r.hash = calc));
end $f$;

revoke all on function public.recibo_gerar_link(uuid) from public;
revoke all on function public.recibo_link_dados(text) from public;
revoke all on function public.recibo_link_assinar(text, text) from public;
revoke all on function public.recibo_verificar(text) from public;
grant execute on function public.recibo_gerar_link(uuid) to authenticated;
grant execute on function public.recibo_link_dados(text), public.recibo_link_assinar(text, text), public.recibo_verificar(text) to anon, authenticated;

-- ---------- Storage: assinaturas (privado) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recibos', 'recibos', false, 1048576, array['image/png'])
on conflict (id) do nothing;
create policy recibos_ler_por_loja on storage.objects for select to authenticated
  using (bucket_id = 'recibos' and (storage.foldername(name))[1] in (select minhas_lojas()::text));
create policy recibos_enviar_por_loja on storage.objects for insert to authenticated
  with check (bucket_id = 'recibos' and (storage.foldername(name))[1] in (select minhas_lojas()::text));
create policy recibos_alterar_por_loja on storage.objects for update to authenticated
  using (bucket_id = 'recibos' and (storage.foldername(name))[1] in (select minhas_lojas()::text));
