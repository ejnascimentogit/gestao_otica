-- Armações reais (fotos do Studio Óptico Eucênia) no catálogo da Ótica Nascimento.
-- Preço 0 = "Consulte o preço" no catálogo até a loja informar o valor.
-- Pode rodar mais de uma vez: não duplica. Também tira do catálogo os desenhos de exemplo.
with loja as (select id from lojas where nome = 'Ótica Nascimento' limit 1),
novos(descricao, marca, codigo, preco, foto) as (values
  ('Eva · gatinho tartaruga',                 'SÓE',         '55-18-144 C7',          0,      'eva-tartaruga'),
  ('Moderna · redonda verde translúcida',     'SÓE',         '143 C2',                0,      'moderna-verde'),
  ('Clássica · gatinho preta',                'SÓE',         'BB90169 55-18',         0,      'classica-preta'),
  ('Atemporal · oval tartaruga',              'SÓE',         '143 C3',                0,      'atemporal-tartaruga'),
  ('Delicada · sem aro, metal',               'SÓE',         'GN0809 C2 55-20-141',   0,      'delicada-sem-aro'),
  ('Gatinho rosé acetato',                    'Milan Glass', '54-15-142 C3',          0,      'gatinho-rose-acetato'),
  ('Gatinho metal e acetato tartaruga',       'SÓE',         'S12029 C1 51-20-147',   0,      'gatinho-metal-tartaruga'),
  ('Oval tartaruga clara',                    'SÓE',         'BB130290 C5 53-21-145', 0,      'oval-tartaruga-clara'),
  ('Hexagonal marrom',                        'SÓE',         'K9189 C3 54-19-148',    0,      'hexagonal-marrom'),
  ('Oval tartaruga',                          'SÓE',         'C18-2 52-18-143',       0,      'oval-tartaruga'),
  ('Gatinho tartaruga',                       'SÓE',         'BB130304 C3 54-18-145', 0,      'gatinho-tartaruga-2'),
  ('Redonda tartaruga',                       'SÓE',         'CB0115 C3 53-20-143',   0,      'redonda-tartaruga'),
  ('Redonda tartaruga escura',                'SÓE',         'C2 143',                439.00, 'redonda-tartaruga-2')
)
insert into produtos (loja_id, tipo, descricao, marca, codigo, unidade_venda, custo, preco, estoque, foto_url, no_catalogo)
select loja.id, 'armacao', n.descricao, n.marca, n.codigo, 'UN', 0, n.preco, 1,
       '/catalogo-fotos/eucenia/' || n.foto || '.jpg', true
  from novos n cross join loja
 where not exists (select 1 from produtos p where p.loja_id = loja.id and p.descricao = n.descricao);

update produtos set no_catalogo = false
 where marca = 'Exemplo' and loja_id = (select id from lojas where nome = 'Ótica Nascimento' limit 1);
