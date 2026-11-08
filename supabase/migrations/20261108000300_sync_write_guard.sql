-- CentFlow — a API pública deixa de escrever nas tabelas financeiras.
--
-- `authenticated` perde INSERT e UPDATE. A única escrita é `sync_push` (SECURITY INVOKER).
-- `sync_apply_op` muda para o esquema `private`, que o PostgREST não expõe, e passa a
-- SECURITY DEFINER: o chamador já não tem permissão de escrita, por isso a função grava
-- como dona, mas só com `auth.uid()` e continuando a passar pelos triggers de versão e
-- integridade. O RLS mantém-se em SELECT e em qualquer papel que não contorne o RLS.
--
-- Não acrescentar `private` aos esquemas expostos da API.

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

comment on schema private is
  'Funções internas. Não expor no PostgREST (Data API > Exposed schemas).';

alter function public.sync_apply_op(jsonb) set schema private;
alter function private.sync_apply_op(jsonb) security definer;

revoke all on function private.sync_apply_op(jsonb) from public, anon;
grant execute on function private.sync_apply_op(jsonb) to authenticated;

revoke insert, update on public.accounts, public.categories, public.entries from authenticated;

create or replace function public.sync_push(p_ops jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_results jsonb := '[]'::jsonb;
  v_count int;
  v_index int := 0;
  v_group_start int;
  v_group_tx text;
  v_group_results jsonb;
  v_failed_index int;
  v_failure jsonb;
  v_result jsonb;
  v_op jsonb;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_ops) <> 'array' then
    raise exception 'invalid_operation' using errcode = 'CF422';
  end if;
  v_count := jsonb_array_length(p_ops);
  if v_count > 500 then
    raise exception 'too_many_operations' using errcode = 'CF422';
  end if;

  while v_index < v_count loop
    v_group_start := v_index;
    v_group_tx := p_ops -> v_index ->> 'tx_id';
    v_group_results := '[]'::jsonb;
    v_failed_index := null;
    v_failure := null;

    begin
      loop
        v_op := p_ops -> v_index;
        v_failed_index := v_index;
        v_result := private.sync_apply_op(v_op);
        if v_result ->> 'status' = 'conflict' then
          v_failure := v_result;
          raise exception 'group_conflict' using errcode = 'CF409';
        end if;
        v_group_results := v_group_results
          || jsonb_build_array(v_result || jsonb_build_object('op_id', v_op ->> 'op_id'));
        v_index := v_index + 1;
        exit when v_index >= v_count
          or (p_ops -> v_index ->> 'tx_id') is distinct from v_group_tx
          or v_group_tx is null;
      end loop;
      v_failed_index := null;
    exception
      when sqlstate 'CF409' then
        if v_failure is null then
          v_failure := jsonb_build_object('status', 'conflict', 'reason', 'version', 'row', null);
        end if;
      when sqlstate 'CF422' or check_violation or foreign_key_violation or not_null_violation
        or invalid_text_representation or datetime_field_overflow or invalid_datetime_format
        or numeric_value_out_of_range or string_data_right_truncation then
        -- Só o sqlstate: a mensagem pode citar o valor enviado pelo cliente.
        raise log 'sync_push rejected sqlstate=%', sqlstate;
        v_reason := case sqlerrm
          when 'account_in_use' then 'account_in_use'
          when 'category_in_use' then 'category_in_use'
          when 'account_unavailable' then 'account_unavailable'
          when 'category_unavailable' then 'category_unavailable'
          when 'category_type_mismatch' then 'category_type_mismatch'
          when 'currency_mismatch' then 'currency_mismatch'
          when 'currency_locked' then 'currency_locked'
          when 'type_locked' then 'type_locked'
          else 'invalid'
        end;
        v_failure := jsonb_build_object('status', 'rejected', 'reason', v_reason);
    end;

    if v_failed_index is not null then
      v_group_results := '[]'::jsonb;
      v_index := v_group_start;
      loop
        v_op := p_ops -> v_index;
        if v_index = v_failed_index then
          v_group_results := v_group_results
            || jsonb_build_array(v_failure || jsonb_build_object('op_id', v_op ->> 'op_id'));
        else
          v_group_results := v_group_results || jsonb_build_array(jsonb_build_object(
            'op_id', v_op ->> 'op_id', 'status', 'aborted'));
        end if;
        v_index := v_index + 1;
        exit when v_index >= v_count
          or (p_ops -> v_index ->> 'tx_id') is distinct from v_group_tx
          or v_group_tx is null;
      end loop;
    end if;

    v_results := v_results || v_group_results;
  end loop;

  return jsonb_build_object('results', v_results);
end;
$$;

create or replace function public.purge_deleted(p_retention interval default interval '180 days')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_api_role text := nullif(current_setting('request.jwt.claim.role', true), '');
  v_cutoff timestamptz := now() - p_retention;
  v_entries int;
  v_categories int;
  v_accounts int;
begin
  -- Dentro de SECURITY DEFINER, current_user é o dono. O papel da API vem do JWT,
  -- definido pelo PostgREST a partir do token verificado. Vazio = SQL direto (cron, postgres).
  if v_api_role is not null and v_api_role is distinct from 'service_role' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_retention < interval '30 days' then
    raise exception 'retention_too_short' using errcode = 'CF422';
  end if;

  create temporary table purged (user_id uuid, server_seq bigint) on commit drop;

  with d as (
    delete from public.entries where deleted_at < v_cutoff returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_entries = row_count;

  with d as (
    delete from public.categories c
     where c.deleted_at < v_cutoff
       and not exists (select 1 from public.entries e
                        where e.user_id = c.user_id and e.category_id = c.id)
    returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_categories = row_count;

  with d as (
    delete from public.accounts a
     where a.deleted_at < v_cutoff
       and not exists (select 1 from public.entries e
                        where e.user_id = a.user_id
                          and (e.account_id = a.id or e.destination_account_id = a.id))
    returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_accounts = row_count;

  update public.sync_metadata m
     set purged_through_seq = greatest(m.purged_through_seq, p.max_seq), updated_at = now()
    from (select user_id, max(server_seq) as max_seq from purged group by user_id) p
   where m.user_id = p.user_id;

  return jsonb_build_object(
    'entries', v_entries, 'categories', v_categories, 'accounts', v_accounts);
end;
$$;

revoke all on function public.purge_deleted(interval) from public, anon, authenticated;
