-- Migration: messages RPC functions
-- Server-side functions for conversations, messages, search, and unread counters

-- NOTE:
-- `create or replace function` cannot change an existing function return type.
-- We drop prior signatures first so this migration can be re-run safely in SQL Editor.
drop function if exists public.get_or_create_conversation(uuid, uuid);
drop function if exists public.search_users(text, uuid, integer);
drop function if exists public.get_conversations(uuid);
drop function if exists public.get_messages(uuid, uuid, timestamptz, integer);
drop function if exists public.get_total_unread_count(uuid);

-- ============================================
-- 1. get_or_create_conversation
-- ============================================
create or replace function public.get_or_create_conversation(
  p_user_id uuid,
  p_other_user_id uuid
)
returns uuid as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_conversation_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_user_id is null or p_other_user_id is null then
    raise exception 'Both user IDs are required';
  end if;

  if p_user_id = p_other_user_id then
    raise exception 'Cannot create a conversation with yourself';
  end if;

  v_user_a := least(p_user_id, p_other_user_id);
  v_user_b := greatest(p_user_id, p_other_user_id);

  insert into public.conversations (user_a_id, user_b_id)
  values (v_user_a, v_user_b)
  on conflict (user_a_id, user_b_id) do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select c.id
    into v_conversation_id
    from public.conversations c
    where c.user_a_id = v_user_a
      and c.user_b_id = v_user_b
    limit 1;
  end if;

  insert into public.conversation_participants (conversation_id, user_id, last_read_at)
  values
    (v_conversation_id, p_user_id, now()),
    (v_conversation_id, p_other_user_id, now())
  on conflict (conversation_id, user_id) do nothing;

  return v_conversation_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================
-- 2. search_users
-- ============================================
create or replace function public.search_users(
  p_query text,
  p_current_user_id uuid,
  p_limit integer default 10
)
returns table (
  id uuid,
  username text,
  name text,
  photo_url text
) as $$
declare
  v_query text;
  v_limit integer;
begin
  if auth.uid() is distinct from p_current_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_query := trim(coalesce(p_query, ''));
  if v_query = '' then
    return;
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 10), 20));

  return query
  select
    p.id,
    p.username,
    p.name,
    p.photo_url
  from public.public_profiles p
  where p.id <> p_current_user_id
    and p.id not in (
      select blocked_id from public.user_blocks where blocker_id = p_current_user_id
      union all
      select blocker_id from public.user_blocks where blocked_id = p_current_user_id
    )
    and (
      p.username ilike '%' || v_query || '%'
      or coalesce(p.name, '') ilike '%' || v_query || '%'
    )
  order by
    case
      when lower(p.username) = lower(v_query) then 0
      when lower(p.username) like lower(v_query) || '%' then 1
      when lower(coalesce(p.name, '')) like lower(v_query) || '%' then 2
      else 3
    end,
    p.username asc
  limit v_limit;
end;
$$ language plpgsql security definer stable set search_path = public;

-- ============================================
-- 3. get_conversations
-- ============================================
create or replace function public.get_conversations(
  p_user_id uuid
)
returns table (
  id uuid,
  updated_at timestamptz,
  other_user jsonb,
  last_message jsonb,
  unread_count integer
) as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.updated_at,
    jsonb_build_object(
      'id', op.id,
      'username', op.username,
      'name', op.name,
      'photo_url', op.photo_url
    ) as other_user,
    case
      when lm.id is null then null
      else jsonb_build_object(
        'id', lm.id,
        'conversation_id', lm.conversation_id,
        'sender_id', lm.sender_id,
        'content', lm.content,
        'media_type', lm.media_type,
        'media_url', lm.media_url,
        'created_at', lm.created_at
      )
    end as last_message,
    coalesce(uc.unread_count, 0)::integer as unread_count
  from public.conversation_participants cp
  join public.conversations c on c.id = cp.conversation_id
  join public.profiles op
    on op.id = case when c.user_a_id = p_user_id then c.user_b_id else c.user_a_id end
  left join lateral (
    select
      m.id,
      m.conversation_id,
      m.sender_id,
      m.content,
      m.media_type,
      m.media_url,
      m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*)::integer as unread_count
    from public.messages m2
    where m2.conversation_id = c.id
      and m2.sender_id <> p_user_id
      and m2.created_at > coalesce(cp.last_read_at, 'epoch'::timestamptz)
  ) uc on true
  where cp.user_id = p_user_id
  order by coalesce(lm.created_at, c.updated_at) desc;
end;
$$ language plpgsql security definer stable set search_path = public;

-- ============================================
-- 4. get_messages
-- ============================================
create or replace function public.get_messages(
  p_conversation_id uuid,
  p_user_id uuid,
  p_cursor timestamptz default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  media_type public.message_media_type,
  media_url text,
  created_at timestamptz,
  sender jsonb
) as $$
declare
  v_limit integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = p_user_id
  ) then
    raise exception 'Conversation not found or not accessible' using errcode = '42501';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 50), 100));

  return query
  select
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.media_type,
    m.media_url,
    m.created_at,
    jsonb_build_object(
      'id', sp.id,
      'username', sp.username,
      'name', sp.name,
      'photo_url', sp.photo_url
    ) as sender
  from public.messages m
  join public.profiles sp on sp.id = m.sender_id
  where m.conversation_id = p_conversation_id
    and (p_cursor is null or m.created_at < p_cursor)
  order by m.created_at desc
  limit v_limit;
end;
$$ language plpgsql security definer stable set search_path = public;

-- ============================================
-- 5. get_total_unread_count
-- ============================================
create or replace function public.get_total_unread_count(
  p_user_id uuid
)
returns integer as $$
declare
  v_total integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select coalesce(count(m.id), 0)::integer
  into v_total
  from public.conversation_participants cp
  join public.messages m on m.conversation_id = cp.conversation_id
  where cp.user_id = p_user_id
    and m.sender_id <> p_user_id
    and m.created_at > coalesce(cp.last_read_at, 'epoch'::timestamptz);

  return coalesce(v_total, 0);
end;
$$ language plpgsql security definer stable set search_path = public;

-- ============================================
-- 6. Execute grants
-- ============================================
revoke all on function public.get_or_create_conversation(uuid, uuid) from public;
revoke all on function public.search_users(text, uuid, integer) from public;
revoke all on function public.get_conversations(uuid) from public;
revoke all on function public.get_messages(uuid, uuid, timestamptz, integer) from public;
revoke all on function public.get_total_unread_count(uuid) from public;

grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;
grant execute on function public.search_users(text, uuid, integer) to authenticated;
grant execute on function public.get_conversations(uuid) to authenticated;
grant execute on function public.get_messages(uuid, uuid, timestamptz, integer) to authenticated;
grant execute on function public.get_total_unread_count(uuid) to authenticated;
