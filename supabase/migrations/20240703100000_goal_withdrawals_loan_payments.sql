-- Objetivos: contribuição vs levantamento
alter table public.goal_contributions
  add column if not exists kind text not null default 'contribution';

alter table public.goal_contributions drop constraint if exists goal_contributions_kind_check;
alter table public.goal_contributions add constraint goal_contributions_kind_check
  check (kind in ('contribution', 'withdrawal'));

-- Pagamentos de crédito (mensalidade vs amortização extra)
create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  credit_id uuid references public.credits (id) on delete cascade not null,
  account_id uuid references public.accounts (id) on delete set null,
  type text not null check (type in ('monthly_payment', 'extra_principal_payment')),
  amount decimal(12, 2) not null check (amount > 0),
  principal_amount decimal(12, 2),
  interest_amount decimal(12, 2),
  fees_amount decimal(12, 2),
  paid_at timestamptz not null default now(),
  note text,
  created_at timestamptz default now()
);

create index if not exists loan_payments_user_id_idx on public.loan_payments (user_id);
create index if not exists loan_payments_credit_id_idx on public.loan_payments (credit_id);
create index if not exists loan_payments_paid_at_idx on public.loan_payments (paid_at);

alter table public.loan_payments enable row level security;

do $$ begin
  create policy "Users manage own loan payments"
    on public.loan_payments
    for all
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
