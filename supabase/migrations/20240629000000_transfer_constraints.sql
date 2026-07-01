-- Integridade de transferências entre contas (ledger via transactions)
-- Não criamos account_transfers: o modelo usa uma linha type=transfer.

alter table public.transactions
  drop constraint if exists transactions_transfer_accounts_check;

alter table public.transactions
  add constraint transactions_transfer_accounts_check
  check (
    type <> 'transfer'
    or (
      account_id is not null
      and destination_account_id is not null
      and account_id <> destination_account_id
    )
  );
