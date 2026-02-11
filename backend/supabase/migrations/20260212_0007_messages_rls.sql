-- Migration: messages RLS policies
-- Row Level Security for messaging tables and message-media storage

-- ============================================
-- 1. Enable RLS on messaging tables
-- ============================================
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- ============================================
-- 2. Conversations policies
-- ============================================
drop policy if exists "Participants can read conversations" on public.conversations;
create policy "Participants can read conversations"
  on public.conversations for select
  using (auth.uid() in (user_a_id, user_b_id));

-- ============================================
-- 3. Conversation participants policies
-- ============================================
drop policy if exists "Users can read own conversation participants" on public.conversation_participants;
create policy "Users can read own conversation participants"
  on public.conversation_participants for select
  using (user_id = auth.uid());

drop policy if exists "Users can update own conversation read status" on public.conversation_participants;
create policy "Users can update own conversation read status"
  on public.conversation_participants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can insert own conversation participants" on public.conversation_participants;
create policy "Users can insert own conversation participants"
  on public.conversation_participants for insert
  with check (user_id = auth.uid());

-- ============================================
-- 4. Messages policies
-- ============================================
drop policy if exists "Participants can read messages" on public.messages;
create policy "Participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can send own messages" on public.messages;
create policy "Participants can send own messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. Storage policies for message-media bucket
-- ============================================
drop policy if exists "Authenticated users can upload message media" on storage.objects;
create policy "Authenticated users can upload message media"
  on storage.objects for insert
  with check (
    bucket_id = 'message-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Anyone can read message media" on storage.objects;
create policy "Anyone can read message media"
  on storage.objects for select
  using (bucket_id = 'message-media');

drop policy if exists "Users can delete own message media" on storage.objects;
create policy "Users can delete own message media"
  on storage.objects for delete
  using (
    bucket_id = 'message-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
