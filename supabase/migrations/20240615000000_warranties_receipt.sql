-- Associação de garantias a talões / movimentos
alter table public.warranties
  add column if not exists receipt_transaction_id uuid,
  add column if not exists receipt_id uuid,
  add column if not exists receipt_label text;

create index if not exists warranties_receipt_tx_idx
  on public.warranties (receipt_transaction_id)
  where receipt_transaction_id is not null;
