-- Cadastro inicial de laboratórios e produtos para testar a OS.
-- Vale para a loja do único perfil admin existente. Pode ser editado/apagado depois.

with l as (select loja_id as id from public.perfis where papel = 'admin' limit 1),
labs as (
  insert into public.laboratorios (loja_id, nome, prazo_dias)
  select l.id, v.nome, v.prazo from l, (values ('Laboratório Principal', 5), ('Laboratório Reserva', 7)) as v(nome, prazo)
  returning id
)
insert into public.produtos (loja_id, tipo, descricao, marca, unidade_venda, custo, preco, estoque, indice_refracao, desenho_lente)
select l.id, v.tipo::tipo_produto, v.descricao, v.marca, v.unidade::unidade_venda, v.custo, v.preco, v.estoque, v.indice, v.desenho
from l, (values
  ('lente',   'Lente monofocal 1.56 antirreflexo',  'Genérica', 'UN',  35.00,  90.00, 40, 1.56, 'monofocal'),
  ('lente',   'Lente monofocal 1.67 filtro azul',   'Genérica', 'UN',  90.00, 220.00, 20, 1.67, 'monofocal'),
  ('lente',   'Lente multifocal freeform 1.59',     'Genérica', 'PAR', 380.00, 890.00, 6, 1.59, 'multifocal'),
  ('lente',   'Lente fotossensível 1.56 + AR',      'Genérica', 'UN',  120.00, 310.00, 12, 1.56, 'monofocal'),
  ('armacao', 'Armação acetato retangular 54-18',   'Própria',  'UN',  80.00, 240.00, 10, null, null),
  ('armacao', 'Armação metal redonda 50-20',        'Própria',  'UN',  65.00, 199.00, 8, null, null),
  ('servico', 'Montagem e ajuste',                  '—',        'UN',  0.00,  30.00,  0, null, null)
) as v(tipo, descricao, marca, unidade, custo, preco, estoque, indice, desenho);
