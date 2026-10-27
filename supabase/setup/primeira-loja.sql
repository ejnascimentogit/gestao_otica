-- Rode DEPOIS das migrações e DEPOIS de criar o seu usuário em
-- Authentication → Users → Add user (e-mail e senha).
-- Troque os três textos entre aspas antes de rodar.

with nova_loja as (
  insert into public.lojas (nome, cnpj, telefone)
  values ('NOME DA ÓTICA', '00.000.000/0001-00', '(81) 0000-0000')
  returning id
)
insert into public.perfis (user_id, loja_id, nome, papel)
select u.id, nova_loja.id, 'SEU NOME', 'admin'
from nova_loja, auth.users u
where lower(u.email) = lower('EMAIL_DO_USUARIO_CRIADO');

-- Conferência: deve listar a loja com o seu perfil admin
select l.nome as loja, p.nome, p.papel, u.email
from public.perfis p
join public.lojas l on l.id = p.loja_id
join auth.users u on u.id = p.user_id;
