-- Loja Studio Óptico Eucênia (31/10/2026)
-- Aproveita a "Ótica Nascimento" duplicada e sem usuários, leva as armações com fotos da Eucênia
-- para a loja dela, faz a Eucênia administradora da loja dela e cria o catálogo.
begin;

-- 1) A loja duplicada (sem nenhum usuário) vira a Studio Óptico Eucênia
update lojas set
  nome = 'Studio Óptico Eucênia',
  cnpj = '29.488.278/0001-31',
  telefone = '(81) 98642-8294',
  logo_url = '/logos/studio-optico-eucenia-logo.png',
  logo_icone_url = '/logos/studio-optico-eucenia-icone.png'
where id = (
  select l.id from lojas l
   where l.nome = 'Ótica Nascimento'
     and not exists (select 1 from perfis p where p.loja_id = l.id)
   order by l.criado_em limit 1
);

-- 2) Armações com as fotos da Eucênia vão para a loja dela (estejam onde estiverem)
update produtos set loja_id = (select id from lojas where nome = 'Studio Óptico Eucênia')
 where foto_url like '/catalogo-fotos/eucenia/%';

-- 3) Qualquer outro produto que tenha caído na loja duplicada volta para a Ótica Nascimento
update produtos set loja_id = (select id from lojas where nome = 'Ótica Nascimento')
 where loja_id = (select id from lojas where nome = 'Studio Óptico Eucênia')
   and (foto_url is null or foto_url not like '/catalogo-fotos/eucenia/%');

-- 4) Eucênia passa a ser administradora da loja dela
update perfis set
  loja_id = (select id from lojas where nome = 'Studio Óptico Eucênia'),
  papel = 'admin'
where user_id = (select id from auth.users where lower(email) = 'euceniasilva2112@gmail.com');

-- 5) Catálogo da loja dela, já ligado, com o WhatsApp da loja
insert into catalogos (loja_id, slug, ativo, whatsapp, titulo, apresentacao)
select id, 'studio-optico-eucenia', true, '5581986428294', 'Nossas armações',
       'Enxergar bem é viver melhor. Toque em "Tenho interesse" e fale com a gente pelo WhatsApp. Instagram: @studio_optico_eucenia'
  from lojas where nome = 'Studio Óptico Eucênia'
on conflict (loja_id) do update set
  slug = excluded.slug, ativo = true, whatsapp = excluded.whatsapp,
  titulo = excluded.titulo, apresentacao = excluded.apresentacao, atualizado_em = now();

commit;

-- Conferência: deve mostrar as duas lojas, cada uma com seus usuários e produtos
select l.nome,
       (select string_agg(p.nome || ' (' || p.papel || ')', ', ') from perfis p where p.loja_id = l.id) as usuarios,
       (select count(*) from produtos p where p.loja_id = l.id) as produtos,
       (select count(*) from produtos p where p.loja_id = l.id and p.no_catalogo) as no_catalogo,
       (select slug from catalogos c where c.loja_id = l.id) as catalogo
  from lojas l order by l.criado_em;

