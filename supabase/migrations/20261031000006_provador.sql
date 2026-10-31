-- =====================================================================
-- Gestão Ótica — provador virtual
-- produtos.provador_url: imagem da armação de frente, fundo transparente,
-- com a largura da frente da armação (o tamanho no rosto vem da medida no código).
-- O catálogo público passa a devolver a imagem do provador e o código (medida).
-- =====================================================================
alter table public.produtos add column if not exists provador_url text;

create or replace function public.catalogo_publico(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'loja', jsonb_build_object('nome', l.nome, 'telefone', l.telefone, 'logo_url', l.logo_url, 'logo_icone_url', l.logo_icone_url),
    'titulo', c.titulo,
    'apresentacao', c.apresentacao,
    'whatsapp', c.whatsapp,
    'produtos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'tipo', p.tipo, 'descricao', p.descricao, 'marca', p.marca, 'codigo', p.codigo,
               'preco', p.preco, 'foto_url', p.foto_url, 'provador_url', p.provador_url) order by p.descricao)
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

-- Imagens de provador já prontas (desenhadas a partir das fotos e dos exemplos)
update public.produtos
   set provador_url = replace(replace(foto_url, '/catalogo-fotos/eucenia/', '/catalogo-fotos/eucenia/provador/'), '.jpg', '.svg')
 where foto_url like '/catalogo-fotos/eucenia/%.jpg' and provador_url is null;
update public.produtos
   set provador_url = replace(foto_url, '/exemplos/armacoes/', '/exemplos/armacoes/provador/')
 where foto_url like '/exemplos/armacoes/%.svg' and foto_url not like '/exemplos/armacoes/provador/%' and provador_url is null;
