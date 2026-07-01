-- Cartões de crédito no ledger: compras (expense + credit_id) e pagamentos (credit_payment)

alter table public.transactions
  add column if not exists credit_id uuid references public.credits (id) on delete set null;

create index if not exists transactions_credit_id_idx
  on public.transactions (credit_id)
  where credit_id is not null;

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in ('expense', 'income', 'transfer', 'credit_payment'));

-- Pagamento de cartão: debita conta, reduz dívida do cartão
alter table public.transactions drop constraint if exists transactions_credit_payment_check;
alter table public.transactions add constraint transactions_credit_payment_check
  check (
    type <> 'credit_payment'
    or (
      account_id is not null
      and credit_id is not null
      and amount > 0
    )
  );

-- Despesa no cartão: não pode ter conta e cartão ao mesmo tempo
alter table public.transactions drop constraint if exists transactions_expense_payment_source_check;
alter table public.transactions add constraint transactions_expense_payment_source_check
  check (
    type <> 'expense'
    or not (account_id is not null and credit_id is not null)
  );
