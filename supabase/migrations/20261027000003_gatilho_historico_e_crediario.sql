-- =====================================================================
-- Gestão Ótica — ajustes para o front gravar OS e crediário
-- 1) O gatilho de histórico de status grava como dono da função, porque o
--    usuário só tem leitura em os_status_historico (ninguém forja histórico pela API).
-- 2) gerar_crediario: grava crediário + parcelas numa transação só.
-- =====================================================================

alter function public.os_registra_status() security definer set search_path = public;
revoke all on function public.os_registra_status() from public, anon, authenticated;

create or replace function public.gerar_crediario(
  p_os_id            uuid,
  p_valor_financiado numeric,
  p_juros_mes_pct    numeric,
  p_metodo           text,
  p_parcelas         jsonb      -- [{ "numero": 1, "vencimento": "2026-11-26", "valor": 242.72 }, ...]
) returns uuid
language plpgsql
security invoker              -- roda com as permissões do usuário: a RLS por loja vale aqui também
set search_path = public
as $$
declare
  v_os    public.ordens_servico;
  v_cred  uuid;
  v_n     int;
  v_total numeric(12,2);
begin
  select * into v_os from public.ordens_servico where id = p_os_id;
  if not found then
    raise exception 'OS não encontrada ou sem acesso';
  end if;
  if exists (select 1 from public.crediarios where os_id = p_os_id) then
    raise exception 'Esta OS já tem crediário';
  end if;

  v_n := jsonb_array_length(p_parcelas);
  if v_n < 1 or v_n > 24 then
    raise exception 'Quantidade de parcelas inválida: %', v_n;
  end if;

  select sum((x->>'valor')::numeric) into v_total from jsonb_array_elements(p_parcelas) x;

  insert into public.crediarios
    (loja_id, os_id, cliente_id, valor_financiado, juros_mes_pct, parcelas, metodo_juros, valor_total)
  values
    (v_os.loja_id, p_os_id, v_os.cliente_id, p_valor_financiado, p_juros_mes_pct, v_n, p_metodo, v_total)
  returning id into v_cred;

  insert into public.parcelas (loja_id, crediario_id, cliente_id, numero, vencimento, valor)
  select v_os.loja_id, v_cred, v_os.cliente_id, x.numero, x.vencimento, x.valor
  from jsonb_to_recordset(p_parcelas) as x(numero smallint, vencimento date, valor numeric);

  return v_cred;
end $$;

revoke all on function public.gerar_crediario(uuid, numeric, numeric, text, jsonb) from public, anon;
grant execute on function public.gerar_crediario(uuid, numeric, numeric, text, jsonb) to authenticated;
