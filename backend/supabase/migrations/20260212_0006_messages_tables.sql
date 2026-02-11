-- Migration: messages tables
-- Creates messaging tables, media bucket, and update trigger

-- ============================================
-- 1. Message media enum
-- ============================================
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'message_media_type'
      and n.nspname = 'public'
  ) then
    create type public.message_media_type as enum ('text', 'image', 'video', 'audio');
  end if;
end $$;

-- ============================================
-- 2. Conversations table
-- ============================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Prevent self-DM and enforce canonical ordering for unique pairs
  constraint conversations_distinct_users check (user_a_id <> user_b_id),
  constraint conversations_canonical_pair check (user_a_id < user_b_id),
  constraint conversations_unique_pair unique (user_a_id, user_b_id)
);

create index if not exists conversations_user_a_id_idx
  on public.conversations(user_a_id);

create index if not exists conversations_user_b_id_idx
  on public.conversations(user_b_id);

create index if not exists conversations_updated_at_idx
  on public.conversations(updated_at desc);

drop trigger if exists on_conversations_updated on public.conversations;
create trigger on_conversations_updated
  before update on public.conversations
  for each row execute function public.handle_updated_at();

-- ============================================
-- 3. Conversation participants
-- ============================================
create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_participants_user_id_idx
  on public.conversation_participants(user_id);

create index if not exists conversation_participants_user_conversation_idx
  on public.conversation_participants(user_id, conversation_id);

-- ============================================
-- 4. Messages table
-- ============================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  media_type public.message_media_type not null default 'text',
  media_url text,
  created_at timestamptz not null default now(),

  -- At least one payload channel must exist
  constraint messages_has_payload check (content is not null or media_url is not null),

  -- Non-text messages must include media
  constraint messages_media_url_required check (media_type = 'text' or media_url is not null)
);

create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at desc);

create index if not exists messages_conversation_sender_created_idx
  on public.messages(conversation_id, sender_id, created_at desc);

create index if not exists messages_created_at_idx
  on public.messages(created_at desc);

-- ============================================
-- 5. Conversation updated_at bump on new message
-- ============================================
create or replace function public.handle_message_insert_update_conversation()
returns trigger as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_insert_update_conversation on public.messages;
create trigger on_message_insert_update_conversation
  after insert on public.messages
  for each row execute function public.handle_message_insert_update_conversation();

-- ============================================
-- 6. Storage bucket for message media
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'message-media',
  'message-media',
  true,
  52428800, -- 50MB
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'
  ]
where not exists (
  select 1 from storage.buckets where id = 'message-media'
);
