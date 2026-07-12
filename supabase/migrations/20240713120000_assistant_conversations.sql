-- Histórico do assistente financeiro conversacional
create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  intent text,
  created_at timestamptz not null default now()
);

create index if not exists assistant_conversations_user_id_idx
  on public.assistant_conversations (user_id, updated_at desc);

create index if not exists assistant_messages_conversation_id_idx
  on public.assistant_messages (conversation_id, created_at asc);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

create policy assistant_conversations_select_own
  on public.assistant_conversations for select
  using (auth.uid() = user_id);

create policy assistant_conversations_insert_own
  on public.assistant_conversations for insert
  with check (auth.uid() = user_id);

create policy assistant_conversations_update_own
  on public.assistant_conversations for update
  using (auth.uid() = user_id);

create policy assistant_messages_select_own
  on public.assistant_messages for select
  using (auth.uid() = user_id);

create policy assistant_messages_insert_own
  on public.assistant_messages for insert
  with check (auth.uid() = user_id);

comment on table public.assistant_conversations is 'Conversas do assistente financeiro CentFlow';
comment on table public.assistant_messages is 'Mensagens do assistente — sem dados financeiros brutos nos logs';
