-- Tipos canónicos de cartão + reembolsos + movimento original associado

alter table public.transactions
  add column if not exists related_transaction_id uuid references public.transactions (id) on delete set null;

create index if not exists transactions_related_transaction_id_idx
  on public.transactions (related_transaction_id)
  where related_transaction_id is not null;

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in (
    'expense',
    'income',
    'transfer',
    'credit_payment',
    'credit_card_purchase',
    'credit_card_payment',
    'credit_card_refund',
    'balance_adjustment'
  ));

-- Migrar legado
update public.transactions
  set type = 'credit_card_purchase'
  where type = 'expense' and credit_id is not null;

update public.transactions
  set type = 'credit_card_payment'
  where type = 'credit_payment';

alter table public.transactions drop constraint if exists transactions_credit_payment_check;
alter table public.transactions drop constraint if exists transactions_credit_card_payment_check;
alter table public.transactions add constraint transactions_credit_card_payment_check
  check (
    type not in ('credit_payment', 'credit_card_payment')
    or (
      account_id is not null
      and credit_id is not null
      and amount > 0
    )
  );

alter table public.transactions drop constraint if exists transactions_credit_card_purchase_check;
alter table public.transactions add constraint transactions_credit_card_purchase_check
  check (
    type <> 'credit_card_purchase'
    or (
      credit_id is not null
      and account_id is null
      and amount > 0
    )
  );

alter table public.transactions drop constraint if exists transactions_credit_card_refund_check;
alter table public.transactions add constraint transactions_credit_card_refund_check
  check (
    type <> 'credit_card_refund'
    or (
      credit_id is not null
      and account_id is null
      and amount > 0
    )
  );

alter table public.transactions drop constraint if exists transactions_expense_payment_source_check;
alter table public.transactions add constraint transactions_expense_payment_source_check
  check (
    type <> 'expense'
    or not (account_id is not null and credit_id is not null)
  );
