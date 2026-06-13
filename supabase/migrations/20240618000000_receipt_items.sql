-- Linhas de produto confirmadas pelo utilizador (pós-OCR)
-- Separadas de ocr_results.items (dados brutos do OCR)

create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete set null,
  name text not null,
  quantity numeric(12, 3),
  unit_price numeric(12, 2),
  total_price numeric(12, 2) not null check (total_price >= 0),
  category text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.receipt_items is 'Itens de linha confirmados pelo utilizador a partir de talões';

create index receipt_items_receipt_id_idx on public.receipt_items (receipt_id);
create index receipt_items_transaction_id_idx on public.receipt_items (transaction_id);
create index receipt_items_user_id_idx on public.receipt_items (user_id);
create index receipt_items_name_idx on public.receipt_items (user_id, name);

alter table public.receipt_items enable row level security;

create policy "receipt_items_select_own"
  on public.receipt_items for select
  using (auth.uid() = user_id);

create policy "receipt_items_insert_own"
  on public.receipt_items for insert
  with check (auth.uid() = user_id);

create policy "receipt_items_update_own"
  on public.receipt_items for update
  using (auth.uid() = user_id);

create policy "receipt_items_delete_own"
  on public.receipt_items for delete
  using (auth.uid() = user_id);
