-- Armações de exemplo para o catálogo da Ótica Nascimento (fotos ilustrativas em web/public/exemplos/armacoes).
-- Marca "Exemplo" para achar e apagar depois. Pode rodar mais de uma vez: não duplica.
with loja as (select id from lojas where nome = 'Ótica Nascimento' limit 1),
novos(descricao, preco, estoque, foto) as (values
  ('Armação aviador metal prata',          259.90, 4, 'aviador-prata'),
  ('Armação clássica preta e prata',       289.90, 3, 'browline-classica'),
  ('Armação gatinho acetato vinho',        279.90, 5, 'gatinho-vinho'),
  ('Armação hexagonal metal rosé',         239.90, 4, 'hexagonal-rose'),
  ('Armação oval acetato azul',            199.90, 6, 'oval-azul'),
  ('Armação quadrada acetato tartaruga',   269.90, 5, 'quadrada-tartaruga'),
  ('Armação redonda acetato transparente', 229.90, 7, 'redonda-transparente'),
  ('Armação retangular verde musgo',       209.90, 6, 'retangular-verde')
)
insert into produtos (loja_id, tipo, descricao, marca, unidade_venda, custo, preco, estoque, foto_url, no_catalogo)
select loja.id, 'armacao', n.descricao, 'Exemplo', 'UN', round(n.preco * 0.42, 2), n.preco, n.estoque,
       '/exemplos/armacoes/' || n.foto || '.svg', true
  from novos n cross join loja
 where not exists (select 1 from produtos p where p.loja_id = loja.id and p.descricao = n.descricao);

-- As duas armações que já existiam ganham foto e entram no catálogo
update produtos set foto_url = '/exemplos/armacoes/retangular-preta.svg', no_catalogo = true
 where descricao = 'Armação acetato retangular 54-18' and foto_url is null
   and loja_id = (select id from lojas where nome = 'Ótica Nascimento' limit 1);
update produtos set foto_url = '/exemplos/armacoes/redonda-dourada.svg', no_catalogo = true
 where descricao = 'Armação metal redonda 50-20' and foto_url is null
   and loja_id = (select id from lojas where nome = 'Ótica Nascimento' limit 1);

-- Para apagar os exemplos depois (só os que não foram usados em OS):
-- delete from produtos where marca = 'Exemplo' and id not in (select produto_id from os_itens where produto_id is not null);
