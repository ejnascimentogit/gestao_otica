-- =====================================================================
-- Gestão Ótica — catálogo da loja com link e lista de interessados
-- * produtos ganham foto e a marca "no catálogo"
-- * catalogos: endereço público (slug), WhatsApp da loja, ligado/desligado
-- * interessados_catalogo: quem deixou nome e WhatsApp no catálogo
-- O cliente final NÃO faz login: lê o catálogo e registra interesse só pelas
-- duas funções abaixo (security definer), que devolvem apenas o que é público.
-- O WhatsApp é aberto pelo link wa.me no celular de cada um: o sistema não
-- envia mensagem nenhuma sozinho (sem API, sem risco de bloqueio).
-- =====================================================================

-- ---------- Produtos: foto e catálogo ----------
alter table public.produtos add column if not exists foto_url text;
alter table public.produtos add column if not exists no_catalogo boolean not null default false;

-- Lojas em que o usuário logado é administrador ou gerente
create or replace function public.minhas_lojas_gestor() returns setof uuid
language sql stable security definer set search_path = public as $$
  select loja_id from perfis where user_id = auth.uid() and ativo and papel in ('admin', 'gerente')
$$;
revoke all on function public.minhas_lojas_gestor() from public, anon;
grant execute on function public.minhas_lojas_gestor() to authenticated;

-- ---------- Configuração do catálogo (uma por loja) ----------
create table if not exists public.catalogos (
  loja_id       uuid primary key references public.lojas(id) on delete cascade,
  slug          text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  ativo         boolean not null default false,
  whatsapp      text check (whatsapp ~ '^55[0-9]{10,11}$'),
  titulo        text check (char_length(titulo) <= 80),
  apresentacao  text check (char_length(apresentacao) <= 400),
  atualizado_em timestamptz not null default now()
);
alter table public.catalogos enable row level security;
create policy catalogos_ler on public.catalogos for select to authenticated
  using (loja_id in (select minhas_lojas()));
create policy catalogos_gestor_inserir on public.catalogos for insert to authenticated
  with check (loja_id in (select minhas_lojas_gestor()));
create policy catalogos_gestor_alterar on public.catalogos for update to authenticated
  using (loja_id in (select minhas_lojas_gestor())) with check (loja_id in (select minhas_lojas_gestor()));
grant select, insert, update on public.catalogos to authenticated;

-- ---------- Interessados (contatos vindos do catálogo) ----------
create table if not exists public.interessados_catalogo (
  id                uuid primary key default gen_random_uuid(),
  loja_id           uuid not null references public.lojas(id) on delete cascade,
  produto_id        uuid references public.produtos(id) on delete set null,
  produto_descricao text,
  nome              text not null check (char_length(nome) between 2 and 80),
  whatsapp          text not null check (whatsapp ~ '^55[0-9]{10,11}$'),
  status            text not null default 'novo' check (status in ('novo', 'em_contato', 'virou_cliente', 'descartado')),
  cliente_id        uuid references public.clientes(id) on delete set null,
  observacoes       text,
  criado_em         timestamptz not null default now()
);
create index if not exists interessados_catalogo_loja_idx on public.interessados_catalogo (loja_id, criado_em desc);
create index if not exists interessados_catalogo_whatsapp_idx on public.interessados_catalogo (loja_id, whatsapp, criado_em desc);
alter table public.interessados_catalogo enable row level security;
create policy interessados_catalogo_por_loja on public.interessados_catalogo for all to authenticated
  using (loja_id in (select minhas_lojas())) with check (loja_id in (select minhas_lojas()));
-- inserção só pela função pública abaixo
grant select, update, delete on public.interessados_catalogo to authenticated;

-- ---------- Leitura pública do catálogo ----------
create or replace function public.catalogo_publico(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'loja', jsonb_build_object('nome', l.nome, 'telefone', l.telefone, 'logo_url', l.logo_url, 'logo_icone_url', l.logo_icone_url),
    'titulo', c.titulo,
    'apresentacao', c.apresentacao,
    'whatsapp', c.whatsapp,
    'produtos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'tipo', p.tipo, 'descricao', p.descricao, 'marca', p.marca,
               'preco', p.preco, 'foto_url', p.foto_url) order by p.descricao)
        from produtos p
       where p.loja_id = c.loja_id and p.ativo and p.no_catalogo
    ), '[]'::jsonb)
  )
  from catalogos c
  join lojas l on l.id = c.loja_id
  where c.slug = lower(trim(p_slug)) and c.ativo
$$;
revoke all on function public.catalogo_publico(text) from public;
grant execute on function public.catalogo_publico(text) to anon, authenticated;

-- ---------- Registro de interesse (cliente sem login) ----------
create or replace function public.catalogo_registrar_interesse(p_slug text, p_produto_id uuid, p_nome text, p_whatsapp text)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_loja uuid;
  v_nome text := left(regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g'), 80);
  v_zap  text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_prod text;
begin
  select loja_id into v_loja from catalogos where slug = lower(trim(p_slug)) and ativo;
  if v_loja is null then return jsonb_build_object('ok', false, 'erro', 'Catálogo indisponível.'); end if;

  v_zap := regexp_replace(v_zap, '^0+', '');
  if char_length(v_zap) in (10, 11) then v_zap := '55' || v_zap; end if;
  if v_zap !~ '^55[0-9]{10,11}$' then return jsonb_build_object('ok', false, 'erro', 'WhatsApp inválido.'); end if;
  if char_length(v_nome) < 2 then return jsonb_build_object('ok', false, 'erro', 'Informe seu nome.'); end if;

  if p_produto_id is not null then
    select descricao into v_prod from produtos where id = p_produto_id and loja_id = v_loja and ativo and no_catalogo;
  end if;

  -- mesmo número e mesmo produto em 30 minutos: não repete
  if exists (select 1 from interessados_catalogo
              where loja_id = v_loja and whatsapp = v_zap
                and produto_id is not distinct from (case when v_prod is null then null else p_produto_id end)
                and criado_em > now() - interval '30 minutes') then
    return jsonb_build_object('ok', true, 'repetido', true);
  end if;
  -- trava contra abuso: no máximo 10 registros por número por dia e 300 por loja por dia
  if (select count(*) from interessados_catalogo where loja_id = v_loja and whatsapp = v_zap and criado_em > now() - interval '1 day') >= 10
     or (select count(*) from interessados_catalogo where loja_id = v_loja and criado_em > now() - interval '1 day') >= 300 then
    return jsonb_build_object('ok', true, 'limitado', true);
  end if;

  insert into interessados_catalogo (loja_id, produto_id, produto_descricao, nome, whatsapp)
  values (v_loja, case when v_prod is null then null else p_produto_id end, v_prod, v_nome, v_zap);
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.catalogo_registrar_interesse(text, uuid, text, text) from public;
grant execute on function public.catalogo_registrar_interesse(text, uuid, text, text) to anon, authenticated;

-- ---------- Storage: fotos do catálogo (bucket público para leitura) ----------
-- Caminho: catalogo/<loja_id>/<produto_id>-<momento>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo', 'catalogo', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy catalogo_enviar_por_loja on storage.objects for insert to authenticated
  with check (bucket_id = 'catalogo' and (storage.foldername(name))[1] in (select minhas_lojas()::text));
create policy catalogo_alterar_por_loja on storage.objects for update to authenticated
  using (bucket_id = 'catalogo' and (storage.foldername(name))[1] in (select minhas_lojas()::text));
create policy catalogo_apagar_por_loja on storage.objects for delete to authenticated
  using (bucket_id = 'catalogo' and (storage.foldername(name))[1] in (select minhas_lojas()::text));
