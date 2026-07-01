-- Mês financeiro opcional para receitas (ex.: salário dia 30 para o mês seguinte)
alter table public.transactions
  add column if not exists budget_month text;

create index if not exists transactions_user_budget_month_idx
  on public.transactions (user_id, budget_month)
  where budget_month is not null;
