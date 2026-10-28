-- =====================================================================
-- Gestão Ótica — e-mail no perfil (tela de Usuários) e ícone da logo da loja
-- O front não lê auth.users; a lista de usuários da loja mostra o e-mail
-- guardado aqui. A Edge Function gerenciar-usuarios preenche ao criar.
-- =====================================================================

alter table public.perfis add column if not exists email text;

update public.perfis p
   set email = u.email
  from auth.users u
 where u.id = p.user_id
   and p.email is null;

-- Logo da loja: logo_url (selo completo, usado nas impressões) já existe;
-- logo_icone_url é a versão compacta para o menu do sistema.
alter table public.lojas add column if not exists logo_icone_url text;
