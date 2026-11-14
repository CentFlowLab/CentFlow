-- Consolidação pós-0.1.22 (ADR-079, ADR-081, ADR-082). Uma só migração para as alterações de
-- esquema destas tarefas, para a função de sincronização só ser redefinida uma vez.
--
-- 1. `wealth_items.integration`: o item de património que uma integração (Trading 212) atualiza.
--    Substitui a associação guardada só no aparelho e o critério por nome (que podia apagar
--    investimentos manuais). Sem índice único: dois aparelhos sem rede podem marcar itens
--    diferentes; a app mostra a ambiguidade e a pessoa escolhe (nada é apagado).
-- 2. `user_settings`: definições da conta sincronizadas pela fila normal (o início do mês
--    financeiro). Uma linha por chave, com id fixo por chave em todos os aparelhos.
-- 3. `vehicles.costs_paid_by` e `vehicle_external_costs`: custos da viatura pagos por terceiros,
--    sem conta; nunca entram em saldos, despesas, orçamentos nem relatórios pessoais.
-- 4. `entries.needs_review`: movimentos importados por classificar (omissão: false).
-- 5. `private.sync_apply_op`: as colunas novas só se gravam quando vêm no pedido (`v_data ? …`),
--    para as apps anteriores não as apagarem.
-- 6. `public.sync_pull_v3`: igual à v2 mais as entidades novas. A v2 fica como está: as apps
--    0.1.22 e anteriores rejeitariam entidades desconhecidas na fila local e deixariam de
--    sincronizar. Ao atualizar, a app repõe o cursor a 0 e recebe também as entidades novas.
-- 7. `sync_verify`, `sync_counts` e `purge_deleted` contam as entidades novas (as apps antigas
--    ignoram chaves que não conhecem).
--
-- Não aplicar sem autorização expressa (staging primeiro; produção depois), e antes de distribuir
-- a app que o usa.

alter table public.wealth_items
  add column integration text check (integration is null or integration in ('trading212'));

alter table public.vehicles
  add column costs_paid_by text
    check (costs_paid_by is null or char_length(btrim(costs_paid_by)) between 1 and 80);

alter table public.entries
  add column needs_review boolean not null default false;
create index entries_needs_review_idx on public.entries (user_id, date)
  where needs_review and deleted_at is null;

create table public.user_settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  key text not null check (key in ('financial_month_start_day')),
  value text not null check (char_length(value) between 1 and 200),
  version bigint not null default 1 check (version >= 1),
  server_seq bigint not null default 0,
  last_op_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);
create unique index user_settings_key_idx on public.user_settings (user_id, key)
  where deleted_at is null;
create index user_settings_pull_idx on public.user_settings (user_id, server_seq);
create index user_settings_deleted_idx on public.user_settings (deleted_at)
  where deleted_at is not null;
create trigger a_sync_stamp before insert or update on public.user_settings
  for each row execute function public.sync_stamp();
alter table public.user_settings enable row level security;
create policy "user_settings: select own" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_settings: insert own" on public.user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_settings: update own" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.user_settings from anon, authenticated;
grant select on public.user_settings to authenticated;

create table public.vehicle_external_costs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  vehicle_id uuid not null,
  date date not null check (date between date '1900-01-01' and date '2100-12-31'),
  amount bigint not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  cost_type text not null check (cost_type in ('fuel', 'insurance', 'road_tax', 'inspection',
    'tyres', 'maintenance', 'repair', 'parking_tolls', 'other')),
  quantity_milli bigint check (quantity_milli is null or
    (quantity_milli between 1 and 1000000 and cost_type = 'fuel')),
  odometer_km bigint check (odometer_km is null or odometer_km between 0 and 10000000),
  description text not null default '' check (char_length(description) <= 120),
  payer text check (payer is null or char_length(btrim(payer)) between 1 and 80),
  notes text check (notes is null or char_length(notes) <= 500),
  version bigint not null default 1 check (version >= 1),
  server_seq bigint not null default 0,
  last_op_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Ligação lógica à viatura, sem chave estrangeira: apagar a viatura mantém os custos guardados
  -- e a limpeza das linhas apagadas (purge_deleted) nunca fica bloqueada por eles.
  primary key (user_id, id)
);
create index vehicle_external_costs_pull_idx on public.vehicle_external_costs (user_id, server_seq);
create index vehicle_external_costs_vehicle_idx on public.vehicle_external_costs
  (user_id, vehicle_id, date) where deleted_at is null;
create index vehicle_external_costs_deleted_idx on public.vehicle_external_costs (deleted_at)
  where deleted_at is not null;
create trigger a_sync_stamp before insert or update on public.vehicle_external_costs
  for each row execute function public.sync_stamp();
alter table public.vehicle_external_costs enable row level security;
create policy "vehicle_external_costs: select own" on public.vehicle_external_costs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "vehicle_external_costs: insert own" on public.vehicle_external_costs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "vehicle_external_costs: update own" on public.vehicle_external_costs
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.vehicle_external_costs from anon, authenticated;
grant select on public.vehicle_external_costs to authenticated;

create or replace function private.sync_apply_op(p_op jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_entity text := p_op ->> 'entity';
  v_id uuid := (p_op ->> 'record_id')::uuid;
  v_op_id uuid := (p_op ->> 'op_id')::uuid;
  v_base bigint := (p_op ->> 'base_version')::bigint;
  v_data jsonb := p_op -> 'data';
  v_current jsonb;
  v_row jsonb;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_id is null or v_op_id is null or v_base is null or v_base < 0 or v_data is null then
    raise exception 'invalid_operation' using errcode = 'CF422';
  end if;

  if v_entity = 'accounts' then
    select to_jsonb(t) into v_current from public.accounts t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'categories' then
    select to_jsonb(t) into v_current from public.categories t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'entries' then
    select to_jsonb(t) into v_current from public.entries t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'budgets' then
    select to_jsonb(t) into v_current from public.budgets t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'subscriptions' then
    select to_jsonb(t) into v_current from public.subscriptions t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'goals' then
    select to_jsonb(t) into v_current from public.goals t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'goal_contributions' then
    select to_jsonb(t) into v_current from public.goal_contributions t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'wealth_items' then
    select to_jsonb(t) into v_current from public.wealth_items t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'vehicles' then
    select to_jsonb(t) into v_current from public.vehicles t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'documents' then
    select to_jsonb(t) into v_current from public.documents t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'user_settings' then
    select to_jsonb(t) into v_current from public.user_settings t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'vehicle_external_costs' then
    select to_jsonb(t) into v_current from public.vehicle_external_costs t
     where t.user_id = v_user and t.id = v_id for update;
  else
    raise exception 'invalid_entity' using errcode = 'CF422';
  end if;

  if v_current is not null and (v_current ->> 'last_op_id')::uuid = v_op_id then
    return jsonb_build_object('status', 'duplicate', 'row', v_current - 'user_id');
  end if;

  if v_current is null and v_base > 0 then
    return jsonb_build_object('status', 'conflict', 'reason', 'missing', 'row', null);
  end if;

  if v_current is not null and (v_current ->> 'version')::bigint <> v_base then
    return jsonb_build_object('status', 'conflict', 'reason', 'version', 'row', v_current - 'user_id');
  end if;

  if v_entity = 'accounts' then
    if v_current is null then
      insert into public.accounts as t
        (user_id, id, name, type, currency, initial_balance, archived_at, credit_limit, institution, statement_day, due_day, payment_account_id, color,
         last_op_id, created_at,
         deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'type', v_data ->> 'currency',
         (v_data ->> 'initial_balance')::bigint, (v_data ->> 'archived_at')::timestamptz, (v_data ->> 'credit_limit')::bigint, v_data ->> 'institution', (v_data ->> 'statement_day')::smallint, (v_data ->> 'due_day')::smallint, (v_data ->> 'payment_account_id')::uuid, v_data ->> 'color',
         v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.accounts as t set
        name = v_data ->> 'name',
        type = v_data ->> 'type',
        currency = v_data ->> 'currency',
        initial_balance = (v_data ->> 'initial_balance')::bigint,
        archived_at = (v_data ->> 'archived_at')::timestamptz,
        -- Campos de cartões e empréstimos (ADR-057): apps anteriores não os apagam.
        credit_limit = case when v_data ? 'credit_limit'
          then (v_data ->> 'credit_limit')::bigint else t.credit_limit end,
        institution = case when v_data ? 'institution'
          then (v_data ->> 'institution') else t.institution end,
        statement_day = case when v_data ? 'statement_day'
          then (v_data ->> 'statement_day')::smallint else t.statement_day end,
        due_day = case when v_data ? 'due_day'
          then (v_data ->> 'due_day')::smallint else t.due_day end,
        payment_account_id = case when v_data ? 'payment_account_id'
          then (v_data ->> 'payment_account_id')::uuid else t.payment_account_id end,
        color = case when v_data ? 'color'
          then (v_data ->> 'color') else t.color end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'categories' then
    if v_current is null then
      insert into public.categories as t
        (user_id, id, name, type, icon, color, system_key, essential, sort_order, last_op_id,
         created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'type', v_data ->> 'icon',
         v_data ->> 'color', v_data ->> 'system_key',
         coalesce((v_data ->> 'essential')::smallint, 0), (v_data ->> 'sort_order')::int, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.categories as t set
        name = v_data ->> 'name',
        type = v_data ->> 'type',
        icon = v_data ->> 'icon',
        color = v_data ->> 'color',
        system_key = v_data ->> 'system_key',
        -- Apps anteriores não enviam o campo: sem a chave, o valor guardado mantém-se.
        essential = case when v_data ? 'essential'
          then coalesce((v_data ->> 'essential')::smallint, 0) else t.essential end,
        -- Ordem manual (ADR-059): apps anteriores não a enviam e não a apagam.
        sort_order = case when v_data ? 'sort_order'
          then (v_data ->> 'sort_order')::int else t.sort_order end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'entries' then
    if v_current is null then
      insert into public.entries as t
        (user_id, id, type, amount, description, notes, category_id, account_id,
         destination_account_id, date, vehicle_id, vehicle_cost_type, quantity_milli, odometer_km,
         loan_id, loan_role, principal_amount, interest_amount, fees_amount, needs_review,
         last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'type', (v_data ->> 'amount')::bigint,
         coalesce(v_data ->> 'description', ''), v_data ->> 'notes',
         (v_data ->> 'category_id')::uuid, (v_data ->> 'account_id')::uuid,
         (v_data ->> 'destination_account_id')::uuid, (v_data ->> 'date')::date,
         (v_data ->> 'vehicle_id')::uuid, v_data ->> 'vehicle_cost_type',
         (v_data ->> 'quantity_milli')::bigint, (v_data ->> 'odometer_km')::bigint, (v_data ->> 'loan_id')::uuid, v_data ->> 'loan_role', (v_data ->> 'principal_amount')::bigint, (v_data ->> 'interest_amount')::bigint, (v_data ->> 'fees_amount')::bigint,
         coalesce((v_data ->> 'needs_review')::boolean, false),
         v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.entries as t set
        type = v_data ->> 'type',
        amount = (v_data ->> 'amount')::bigint,
        description = coalesce(v_data ->> 'description', ''),
        notes = v_data ->> 'notes',
        category_id = (v_data ->> 'category_id')::uuid,
        account_id = (v_data ->> 'account_id')::uuid,
        destination_account_id = (v_data ->> 'destination_account_id')::uuid,
        date = (v_data ->> 'date')::date,
        -- Apps anteriores não enviam os campos do veículo: sem a chave, o valor guardado mantém-se.
        vehicle_id = case when v_data ? 'vehicle_id'
          then (v_data ->> 'vehicle_id')::uuid else t.vehicle_id end,
        vehicle_cost_type = case when v_data ? 'vehicle_cost_type'
          then v_data ->> 'vehicle_cost_type' else t.vehicle_cost_type end,
        quantity_milli = case when v_data ? 'quantity_milli'
          then (v_data ->> 'quantity_milli')::bigint else t.quantity_milli end,
        odometer_km = case when v_data ? 'odometer_km'
          then (v_data ->> 'odometer_km')::bigint else t.odometer_km end,
        -- Campos de cartões e empréstimos (ADR-057): apps anteriores não os apagam.
        loan_id = case when v_data ? 'loan_id'
          then (v_data ->> 'loan_id')::uuid else t.loan_id end,
        loan_role = case when v_data ? 'loan_role'
          then (v_data ->> 'loan_role') else t.loan_role end,
        principal_amount = case when v_data ? 'principal_amount'
          then (v_data ->> 'principal_amount')::bigint else t.principal_amount end,
        interest_amount = case when v_data ? 'interest_amount'
          then (v_data ->> 'interest_amount')::bigint else t.interest_amount end,
        fees_amount = case when v_data ? 'fees_amount'
          then (v_data ->> 'fees_amount')::bigint else t.fees_amount end,
        -- Por classificar (ADR-082): apps anteriores não o enviam e não o apagam.
        needs_review = case when v_data ? 'needs_review'
          then coalesce((v_data ->> 'needs_review')::boolean, false) else t.needs_review end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
    -- Uma só compra marcada por veículo (ADR-054): a segunda é recusada, não adivinhada.
    if v_row ->> 'vehicle_cost_type' = 'purchase' and v_row ->> 'deleted_at' is null
      and exists (
        select 1 from public.entries e
         where e.user_id = v_user and e.id <> v_id
           and e.vehicle_id = (v_row ->> 'vehicle_id')::uuid
           and e.vehicle_cost_type = 'purchase' and e.deleted_at is null
      ) then
      raise exception 'purchase_already_linked' using errcode = 'CF422';
    end if;
  elsif v_entity = 'budgets' then
    if v_current is null then
      insert into public.budgets as t
        (user_id, id, category_id, amount, currency, period, starts_on, last_op_id, created_at,
         deleted_at)
      values
        (v_user, v_id, (v_data ->> 'category_id')::uuid, (v_data ->> 'amount')::bigint,
         v_data ->> 'currency', v_data ->> 'period', (v_data ->> 'starts_on')::date, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.budgets as t set
        category_id = (v_data ->> 'category_id')::uuid,
        amount = (v_data ->> 'amount')::bigint,
        currency = v_data ->> 'currency',
        period = v_data ->> 'period',
        starts_on = (v_data ->> 'starts_on')::date,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'subscriptions' then
    if v_current is null then
      insert into public.subscriptions as t
        (user_id, id, name, amount, currency, period, status, starts_on, next_on, category_id,
         previous_amount, amount_changed_on, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', (v_data ->> 'amount')::bigint,
         v_data ->> 'currency', v_data ->> 'period', v_data ->> 'status',
         (v_data ->> 'starts_on')::date, (v_data ->> 'next_on')::date,
         (v_data ->> 'category_id')::uuid, (v_data ->> 'previous_amount')::bigint,
         (v_data ->> 'amount_changed_on')::date, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.subscriptions as t set
        name = v_data ->> 'name',
        amount = (v_data ->> 'amount')::bigint,
        currency = v_data ->> 'currency',
        period = v_data ->> 'period',
        status = v_data ->> 'status',
        starts_on = (v_data ->> 'starts_on')::date,
        next_on = (v_data ->> 'next_on')::date,
        category_id = (v_data ->> 'category_id')::uuid,
        -- Apps anteriores não enviam estes campos: sem a chave, o valor guardado mantém-se.
        previous_amount = case when v_data ? 'previous_amount'
          then (v_data ->> 'previous_amount')::bigint else t.previous_amount end,
        amount_changed_on = case when v_data ? 'amount_changed_on'
          then (v_data ->> 'amount_changed_on')::date else t.amount_changed_on end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'goals' then
    if v_current is null then
      insert into public.goals as t
        (user_id, id, name, target_amount, currency, target_on, icon, color, description,
         account_id, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', (v_data ->> 'target_amount')::bigint,
         v_data ->> 'currency', (v_data ->> 'target_on')::date, v_data ->> 'icon',
         v_data ->> 'color', v_data ->> 'description', (v_data ->> 'account_id')::uuid, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.goals as t set
        name = v_data ->> 'name',
        target_amount = (v_data ->> 'target_amount')::bigint,
        currency = v_data ->> 'currency',
        target_on = (v_data ->> 'target_on')::date,
        -- Objetivos redesenhados: apps anteriores não enviam estes campos e não os apagam.
        icon = case when v_data ? 'icon' then v_data ->> 'icon' else t.icon end,
        color = case when v_data ? 'color' then v_data ->> 'color' else t.color end,
        description = case when v_data ? 'description'
          then v_data ->> 'description' else t.description end,
        account_id = case when v_data ? 'account_id'
          then (v_data ->> 'account_id')::uuid else t.account_id end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'goal_contributions' then
    if v_current is null then
      insert into public.goal_contributions as t
        (user_id, id, goal_id, amount, date, entry_id, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, (v_data ->> 'goal_id')::uuid, (v_data ->> 'amount')::bigint,
         (v_data ->> 'date')::date, (v_data ->> 'entry_id')::uuid, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.goal_contributions as t set
        goal_id = (v_data ->> 'goal_id')::uuid,
        amount = (v_data ->> 'amount')::bigint,
        date = (v_data ->> 'date')::date,
        entry_id = case when v_data ? 'entry_id'
          then (v_data ->> 'entry_id')::uuid else t.entry_id end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'wealth_items' then
    if v_current is null then
      insert into public.wealth_items as t
        (user_id, id, name, type, amount, currency, valued_on, value_history, closed_on,
         loan_kind, institution, principal_amount, started_on, opening_debt, opening_on, interest_rate_bp, installment_amount, due_day, ends_on,
         integration, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'type', (v_data ->> 'amount')::bigint,
         v_data ->> 'currency', (v_data ->> 'valued_on')::date, v_data ->> 'value_history',
         (v_data ->> 'closed_on')::date, v_data ->> 'loan_kind', v_data ->> 'institution', (v_data ->> 'principal_amount')::bigint, (v_data ->> 'started_on')::date, (v_data ->> 'opening_debt')::bigint, (v_data ->> 'opening_on')::date, (v_data ->> 'interest_rate_bp')::int, (v_data ->> 'installment_amount')::bigint, (v_data ->> 'due_day')::smallint, (v_data ->> 'ends_on')::date,
         v_data ->> 'integration',
         v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.wealth_items as t set
        name = v_data ->> 'name',
        type = v_data ->> 'type',
        amount = (v_data ->> 'amount')::bigint,
        currency = v_data ->> 'currency',
        valued_on = (v_data ->> 'valued_on')::date,
        value_history = case when v_data ? 'value_history'
          then v_data ->> 'value_history' else t.value_history end,
        closed_on = case when v_data ? 'closed_on'
          then (v_data ->> 'closed_on')::date else t.closed_on end,
        -- Campos de cartões e empréstimos (ADR-057): apps anteriores não os apagam.
        loan_kind = case when v_data ? 'loan_kind'
          then (v_data ->> 'loan_kind') else t.loan_kind end,
        institution = case when v_data ? 'institution'
          then (v_data ->> 'institution') else t.institution end,
        principal_amount = case when v_data ? 'principal_amount'
          then (v_data ->> 'principal_amount')::bigint else t.principal_amount end,
        started_on = case when v_data ? 'started_on'
          then (v_data ->> 'started_on')::date else t.started_on end,
        opening_debt = case when v_data ? 'opening_debt'
          then (v_data ->> 'opening_debt')::bigint else t.opening_debt end,
        opening_on = case when v_data ? 'opening_on'
          then (v_data ->> 'opening_on')::date else t.opening_on end,
        interest_rate_bp = case when v_data ? 'interest_rate_bp'
          then (v_data ->> 'interest_rate_bp')::int else t.interest_rate_bp end,
        installment_amount = case when v_data ? 'installment_amount'
          then (v_data ->> 'installment_amount')::bigint else t.installment_amount end,
        due_day = case when v_data ? 'due_day'
          then (v_data ->> 'due_day')::smallint else t.due_day end,
        ends_on = case when v_data ? 'ends_on'
          then (v_data ->> 'ends_on')::date else t.ends_on end,
        -- Integração dona do item (ADR-079): apps anteriores não a enviam e não a apagam.
        integration = case when v_data ? 'integration'
          then (v_data ->> 'integration') else t.integration end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'vehicles' then
    if v_current is null then
      insert into public.vehicles as t
        (user_id, id, name, kind, plate, odometer_km, inspection_due, insurance_due, make, model,
         year, fuel_type, acquired_on, purchase_amount, currency, road_tax_due, service_due_on,
         service_due_km, notes, kind_label, icon, costs_paid_by, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'kind', v_data ->> 'plate',
         (v_data ->> 'odometer_km')::bigint, (v_data ->> 'inspection_due')::date,
         (v_data ->> 'insurance_due')::date, v_data ->> 'make', v_data ->> 'model',
         (v_data ->> 'year')::int, v_data ->> 'fuel_type', (v_data ->> 'acquired_on')::date,
         (v_data ->> 'purchase_amount')::bigint, v_data ->> 'currency',
         (v_data ->> 'road_tax_due')::date, (v_data ->> 'service_due_on')::date,
         (v_data ->> 'service_due_km')::bigint, v_data ->> 'notes', v_data ->> 'kind_label',
         v_data ->> 'icon', v_data ->> 'costs_paid_by', v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.vehicles as t set
        name = v_data ->> 'name',
        kind = v_data ->> 'kind',
        plate = v_data ->> 'plate',
        odometer_km = (v_data ->> 'odometer_km')::bigint,
        inspection_due = (v_data ->> 'inspection_due')::date,
        insurance_due = (v_data ->> 'insurance_due')::date,
        -- Campos da Fase 1 dos veículos: apps anteriores não os enviam e não os apagam.
        make = case when v_data ? 'make'
          then (v_data ->> 'make') else t.make end,
        model = case when v_data ? 'model'
          then (v_data ->> 'model') else t.model end,
        year = case when v_data ? 'year'
          then (v_data ->> 'year')::int else t.year end,
        fuel_type = case when v_data ? 'fuel_type'
          then (v_data ->> 'fuel_type') else t.fuel_type end,
        acquired_on = case when v_data ? 'acquired_on'
          then (v_data ->> 'acquired_on')::date else t.acquired_on end,
        purchase_amount = case when v_data ? 'purchase_amount'
          then (v_data ->> 'purchase_amount')::bigint else t.purchase_amount end,
        currency = case when v_data ? 'currency'
          then (v_data ->> 'currency') else t.currency end,
        road_tax_due = case when v_data ? 'road_tax_due'
          then (v_data ->> 'road_tax_due')::date else t.road_tax_due end,
        service_due_on = case when v_data ? 'service_due_on'
          then (v_data ->> 'service_due_on')::date else t.service_due_on end,
        service_due_km = case when v_data ? 'service_due_km'
          then (v_data ->> 'service_due_km')::bigint else t.service_due_km end,
        notes = case when v_data ? 'notes'
          then (v_data ->> 'notes') else t.notes end,
        kind_label = case when v_data ? 'kind_label'
          then (v_data ->> 'kind_label') else t.kind_label end,
        icon = case when v_data ? 'icon'
          then (v_data ->> 'icon') else t.icon end,
        -- Quem paga as despesas (ADR-081): apps anteriores não o enviam e não o apagam.
        costs_paid_by = case when v_data ? 'costs_paid_by'
          then (v_data ->> 'costs_paid_by') else t.costs_paid_by end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'documents' then
    if v_current is null then
      insert into public.documents as t
        (user_id, id, title, category, expires_on, notes, vehicle_id, attachments, acquired_on,
         amount, currency, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'title', v_data ->> 'category',
         (v_data ->> 'expires_on')::date, v_data ->> 'notes', (v_data ->> 'vehicle_id')::uuid,
         v_data ->> 'attachments', (v_data ->> 'acquired_on')::date,
         (v_data ->> 'amount')::bigint, v_data ->> 'currency', v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.documents as t set
        title = v_data ->> 'title',
        category = v_data ->> 'category',
        expires_on = (v_data ->> 'expires_on')::date,
        notes = v_data ->> 'notes',
        vehicle_id = case when v_data ? 'vehicle_id'
          then (v_data ->> 'vehicle_id')::uuid else t.vehicle_id end,
        -- Anexos e compra (ADR-056): apps anteriores não os enviam e não os apagam.
        attachments = case when v_data ? 'attachments'
          then v_data ->> 'attachments' else t.attachments end,
        acquired_on = case when v_data ? 'acquired_on'
          then (v_data ->> 'acquired_on')::date else t.acquired_on end,
        amount = case when v_data ? 'amount'
          then (v_data ->> 'amount')::bigint else t.amount end,
        currency = case when v_data ? 'currency'
          then v_data ->> 'currency' else t.currency end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'user_settings' then
    if v_current is null then
      insert into public.user_settings as t
        (user_id, id, key, value, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'key', v_data ->> 'value', v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.user_settings as t set
        key = v_data ->> 'key',
        value = v_data ->> 'value',
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'vehicle_external_costs' then
    if v_current is null then
      insert into public.vehicle_external_costs as t
        (user_id, id, vehicle_id, date, amount, currency, cost_type, quantity_milli, odometer_km,
         description, payer, notes, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, (v_data ->> 'vehicle_id')::uuid, (v_data ->> 'date')::date,
         (v_data ->> 'amount')::bigint, v_data ->> 'currency', v_data ->> 'cost_type',
         (v_data ->> 'quantity_milli')::bigint, (v_data ->> 'odometer_km')::bigint,
         coalesce(v_data ->> 'description', ''), v_data ->> 'payer', v_data ->> 'notes', v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.vehicle_external_costs as t set
        vehicle_id = (v_data ->> 'vehicle_id')::uuid,
        date = (v_data ->> 'date')::date,
        amount = (v_data ->> 'amount')::bigint,
        currency = v_data ->> 'currency',
        cost_type = v_data ->> 'cost_type',
        quantity_milli = (v_data ->> 'quantity_milli')::bigint,
        odometer_km = (v_data ->> 'odometer_km')::bigint,
        description = coalesce(v_data ->> 'description', ''),
        payer = v_data ->> 'payer',
        notes = v_data ->> 'notes',
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  else
    raise exception 'invalid_entity' using errcode = 'CF422';
  end if;

  return jsonb_build_object('status', 'applied', 'row', v_row - 'user_id');
end;
$$;

create or replace function public.sync_pull_v3(p_since bigint, p_limit int default 500)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_meta record;
  v_changes jsonb;
  v_limit int := least(greatest(coalesce(p_limit, 500), 1), 1000);
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select last_seq, purged_through_seq into v_meta
    from public.sync_metadata where user_id = v_user;
  if not found then
    raise exception 'sync_metadata_missing' using errcode = 'CF422';
  end if;
  if p_since > 0 and p_since < v_meta.purged_through_seq then
    return jsonb_build_object('reset_required', true, 'last_seq', v_meta.last_seq);
  end if;

  select coalesce(jsonb_agg(c order by (c ->> 'server_seq')::bigint), '[]'::jsonb)
    into v_changes
    from (
      select jsonb_build_object('entity', entity, 'server_seq', server_seq, 'row', payload) as c
        from (
          select 'accounts' as entity, t.server_seq, to_jsonb(t) - 'user_id' as payload
            from public.accounts t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'categories', t.server_seq, to_jsonb(t) - 'user_id'
            from public.categories t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'budgets', t.server_seq, to_jsonb(t) - 'user_id'
            from public.budgets t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'subscriptions', t.server_seq, to_jsonb(t) - 'user_id'
            from public.subscriptions t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'goals', t.server_seq, to_jsonb(t) - 'user_id'
            from public.goals t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'goal_contributions', t.server_seq, to_jsonb(t) - 'user_id'
            from public.goal_contributions t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'wealth_items', t.server_seq, to_jsonb(t) - 'user_id'
            from public.wealth_items t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'vehicles', t.server_seq, to_jsonb(t) - 'user_id'
            from public.vehicles t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'documents', t.server_seq, to_jsonb(t) - 'user_id'
            from public.documents t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'entries', t.server_seq, to_jsonb(t) - 'user_id'
            from public.entries t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'user_settings', t.server_seq, to_jsonb(t) - 'user_id'
            from public.user_settings t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'vehicle_external_costs', t.server_seq, to_jsonb(t) - 'user_id'
            from public.vehicle_external_costs t where t.user_id = v_user and t.server_seq > p_since
          order by 2
          limit v_limit
        ) ordered
    ) batch;

  return jsonb_build_object(
    'reset_required', false,
    'changes', v_changes,
    'has_more', jsonb_array_length(v_changes) = v_limit,
    'last_seq', v_meta.last_seq);
end;
$$;

create or replace function public.sync_verify(p_records jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'entity', r.entity,
    'id', r.id,
    'version', coalesce(a.version, c.version, b.version, s.version, g.version, k.version, w.version, vh.version, dc.version, e.version),
    'deleted', coalesce(a.deleted_at, c.deleted_at, b.deleted_at, s.deleted_at, g.deleted_at, k.deleted_at, w.deleted_at, vh.deleted_at, dc.deleted_at, e.deleted_at) is not null
  )), '[]'::jsonb)
  from jsonb_to_recordset(p_records) as r(entity text, id uuid)
  left join public.accounts a
    on r.entity = 'accounts' and a.user_id = auth.uid() and a.id = r.id
  left join public.categories c
    on r.entity = 'categories' and c.user_id = auth.uid() and c.id = r.id
  left join public.budgets b
    on r.entity = 'budgets' and b.user_id = auth.uid() and b.id = r.id
  left join public.subscriptions s
    on r.entity = 'subscriptions' and s.user_id = auth.uid() and s.id = r.id
  left join public.goals g
    on r.entity = 'goals' and g.user_id = auth.uid() and g.id = r.id
  left join public.goal_contributions k
    on r.entity = 'goal_contributions' and k.user_id = auth.uid() and k.id = r.id
  left join public.wealth_items w
    on r.entity = 'wealth_items' and w.user_id = auth.uid() and w.id = r.id
  left join public.vehicles vh
    on r.entity = 'vehicles' and vh.user_id = auth.uid() and vh.id = r.id
  left join public.documents dc
    on r.entity = 'documents' and dc.user_id = auth.uid() and dc.id = r.id
  left join public.entries e
    on r.entity = 'entries' and e.user_id = auth.uid() and e.id = r.id
  left join public.user_settings us
    on r.entity = 'user_settings' and us.user_id = auth.uid() and us.id = r.id
  left join public.vehicle_external_costs vx
    on r.entity = 'vehicle_external_costs' and vx.user_id = auth.uid() and vx.id = r.id;
$$;

create or replace function public.sync_counts()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'accounts', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.accounts where user_id = auth.uid()),
    'categories', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.categories where user_id = auth.uid()),
    'budgets', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.budgets where user_id = auth.uid()),
    'subscriptions', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.subscriptions where user_id = auth.uid()),
    'goals', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.goals where user_id = auth.uid()),
    'goal_contributions', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.goal_contributions where user_id = auth.uid()),
    'wealth_items', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.wealth_items where user_id = auth.uid()),
    'vehicles', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.vehicles where user_id = auth.uid()),
    'documents', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.documents where user_id = auth.uid()),
    'entries', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.entries where user_id = auth.uid()),
    'user_settings', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.user_settings where user_id = auth.uid()),
    'vehicle_external_costs', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.vehicle_external_costs where user_id = auth.uid()),
    'last_seq', (select last_seq from public.sync_metadata where user_id = auth.uid()));
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
  v_budgets int;
  v_subscriptions int;
  v_contributions int;
  v_goals int;
  v_wealth int;
  v_vehicles int;
  v_documents int;
  v_settings int;
  v_external int;
  v_categories int;
  v_accounts int;
begin
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
    delete from public.budgets where deleted_at < v_cutoff returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_budgets = row_count;

  with d as (
    delete from public.subscriptions where deleted_at < v_cutoff returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_subscriptions = row_count;

  with d as (
    delete from public.goal_contributions where deleted_at < v_cutoff returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_contributions = row_count;

  with d as (
    delete from public.goals where deleted_at < v_cutoff returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_goals = row_count;

  with d as (
    delete from public.wealth_items where deleted_at < v_cutoff returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_wealth = row_count;

  with d as (
    delete from public.vehicles where deleted_at < v_cutoff returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_vehicles = row_count;

  with d as (
    delete from public.documents where deleted_at < v_cutoff returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_documents = row_count;

  with d as (
    delete from public.user_settings where deleted_at < v_cutoff returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_settings = row_count;

  with d as (
    delete from public.vehicle_external_costs where deleted_at < v_cutoff
    returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_external = row_count;

  with d as (
    delete from public.categories c
     where c.deleted_at < v_cutoff
       and not exists (select 1 from public.entries e
                        where e.user_id = c.user_id and e.category_id = c.id)
       and not exists (select 1 from public.budgets b
                        where b.user_id = c.user_id and b.category_id = c.id)
       and not exists (select 1 from public.subscriptions s
                        where s.user_id = c.user_id and s.category_id = c.id)
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
    'entries', v_entries,
    'budgets', v_budgets,
    'subscriptions', v_subscriptions,
    'goal_contributions', v_contributions,
    'goals', v_goals,
    'wealth_items', v_wealth,
    'vehicles', v_vehicles,
    'documents', v_documents,
    'user_settings', v_settings,
    'vehicle_external_costs', v_external,
    'categories', v_categories,
    'accounts', v_accounts);
end;
$$;

revoke all on function public.sync_pull_v3(bigint, int) from public, anon;
grant execute on function public.sync_pull_v3(bigint, int) to authenticated;
