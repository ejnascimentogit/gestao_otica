-- =====================================================================
-- Gestão Ótica — código numérico da loja (1, 2, 3...)
-- 1 = Ótica Nascimento, 2 = Studio Óptico Eucênia; as próximas recebem 3, 4... sozinhas.
-- =====================================================================
create sequence if not exists public.lojas_codigo_seq start 1;
alter table public.lojas add column if not exists codigo integer;

update public.lojas set codigo = 1 where nome = 'Ótica Nascimento' and codigo is null;
update public.lojas set codigo = 2 where nome = 'Studio Óptico Eucênia' and codigo is null;
-- qualquer outra que exista recebe o próximo número, pela ordem de criação
update public.lojas l set codigo = x.n
  from (select id, 2 + row_number() over (order by criado_em) as n from public.lojas where codigo is null) x
 where l.id = x.id;

select setval('public.lojas_codigo_seq', greatest((select max(codigo) from public.lojas), 1));
alter table public.lojas alter column codigo set default nextval('public.lojas_codigo_seq');
alter table public.lojas alter column codigo set not null;
alter table public.lojas add constraint lojas_codigo_unico unique (codigo);
alter sequence public.lojas_codigo_seq owned by public.lojas.codigo;
