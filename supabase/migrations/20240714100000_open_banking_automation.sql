-- Open Banking — automação (sync cron, consentimento, digest de notificações)

alter table public.bank_connections
  add column if not exists consent_expires_at timestamptz,
  add column if not exists last_auto_sync_at timestamptz,
  add column if not exists last_sync_source text
    check (last_sync_source is null or last_sync_source in ('manual', 'auto')),
  add column if not exists consent_expiry_notified_at timestamptz;

alter table public.bank_connection_accounts
  add column if not exists last_auto_sync_at timestamptz,
  add column if not exists last_auto_sync_status text
    check (last_auto_sync_status is null or last_auto_sync_status in ('success', 'failed', 'skipped'));

create index if not exists bank_connections_consent_expires_at_idx
  on public.bank_connections (consent_expires_at)
  where status = 'linked' and consent_expires_at is not null;

create index if not exists bank_connections_last_auto_sync_at_idx
  on public.bank_connections (last_auto_sync_at)
  where status = 'linked';

-- Resumo de importações automáticas e avisos de consentimento para push no cliente
create table if not exists public.open_banking_sync_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid references public.bank_connections (id) on delete set null,
  kind text not null default 'import'
    check (kind in ('import', 'consent_expiry')),
  imported_count int not null default 0 check (imported_count >= 0),
  low_confidence_count int not null default 0 check (low_confidence_count >= 0),
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

create index if not exists open_banking_sync_digests_user_pending_idx
  on public.open_banking_sync_digests (user_id, created_at desc)
  where notified_at is null;

alter table public.open_banking_sync_digests enable row level security;

create policy "open_banking_sync_digests_select_own"
  on public.open_banking_sync_digests for select using (auth.uid() = user_id);

create policy "open_banking_sync_digests_update_own"
  on public.open_banking_sync_digests for update using (auth.uid() = user_id);
