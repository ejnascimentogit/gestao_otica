-- =====================================================================
-- Gestão Ótica — permissões da Data API e Storage
-- Projeto: gestao-otica (ref mhouxtzeomirluezzaql, sa-east-1)
-- O projeto foi criado com "Automatically expose new tables" DESLIGADO,
-- então nenhuma tabela é acessível pela API até receber GRANT aqui.
-- Regra: anon não acessa nada; authenticated acessa e a RLS filtra por loja.
-- =====================================================================

-- ---------- Funções ----------
revoke all on function public.minhas_lojas() from public, anon;
grant execute on function public.minhas_lojas() to authenticated;

-- ---------- Tabelas de negócio: leitura e escrita (RLS por loja) ----------
grant select, insert, update, delete on
  public.clientes,
  public.laboratorios,
  public.produtos,
  public.ordens_servico,
  public.receitas,
  public.os_itens,
  public.caixas,
  public.caixa_movimentos,
  public.crediarios,
  public.parcelas,
  public.contas_pagar,
  public.agendamentos
to authenticated;

-- Histórico de status: só leitura pela API (gravado pelo gatilho)
grant select on public.os_status_historico to authenticated;

-- Lojas e perfis: só leitura pela API (cadastro feito pelo dono, via SQL ou função de servidor)
grant select on public.lojas, public.perfis to authenticated;

-- Sequência da coluna identity do histórico (usada pelo gatilho)
grant usage, select on all sequences in schema public to authenticated;

-- ---------- Storage: imagens de receita ----------
-- Caminho: receitas/<loja_id>/<os_id>.<ext>  (bucket privado)
insert into storage.buckets (id, name, public)
values ('receitas', 'receitas', false)
on conflict (id) do nothing;

create policy receitas_ler_por_loja on storage.objects for select to authenticated
  using (bucket_id = 'receitas' and (storage.foldername(name))[1] in (select minhas_lojas()::text));

create policy receitas_enviar_por_loja on storage.objects for insert to authenticated
  with check (bucket_id = 'receitas' and (storage.foldername(name))[1] in (select minhas_lojas()::text));

create policy receitas_alterar_por_loja on storage.objects for update to authenticated
  using (bucket_id = 'receitas' and (storage.foldername(name))[1] in (select minhas_lojas()::text));

create policy receitas_apagar_por_loja on storage.objects for delete to authenticated
  using (bucket_id = 'receitas' and (storage.foldername(name))[1] in (select minhas_lojas()::text));
