-- Migration: enforce messaging_privacy settings
-- Updates get_or_create_conversation + adds a message trigger to enforce
-- messaging privacy settings.

-- ============================================
-- 1. Update get_or_create_conversation with messaging privacy check
-- ============================================
-- Drop existing function to allow re-creation with same signature
drop function if exists public.get_or_create_conversation(uuid, uuid);

create or replace function public.get_or_create_conversation(
  p_user_id uuid,
  p_other_user_id uuid
)
returns uuid as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_conversation_id uuid;
  v_privacy messaging_privacy;
  v_is_following boolean;
  v_is_followed_by boolean;
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

  -- Check recipient's messaging privacy setting
  select us.messaging_privacy into v_privacy
  from public.user_settings us
  where us.user_id = p_other_user_id;

  -- Default to 'everyone' if no settings row exists
  v_privacy := coalesce(v_privacy, 'everyone');

  if v_privacy = 'nobody' then
    raise exception 'This user has disabled direct messages'
      using errcode = 'P0001';
  end if;

  if v_privacy = 'following' then
    -- Recipient must follow the sender
    select exists (
      select 1 from public.user_follows
      where follower_id = p_other_user_id and following_id = p_user_id
    ) into v_is_following;

    if not v_is_following then
      raise exception 'This user only accepts messages from people they follow'
        using errcode = 'P0001';
    end if;
  end if;

  if v_privacy = 'mutual' then
    -- Both must follow each other
    select exists (
      select 1 from public.user_follows
      where follower_id = p_other_user_id and following_id = p_user_id
    ) into v_is_following;

    select exists (
      select 1 from public.user_follows
      where follower_id = p_user_id and following_id = p_other_user_id
    ) into v_is_followed_by;

    if not (v_is_following and v_is_followed_by) then
      raise exception 'This user only accepts messages from mutual followers'
        using errcode = 'P0001';
    end if;
  end if;

  -- Privacy check passed, proceed with conversation creation
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
-- 3. Block messages to users who changed privacy after conversation was created
-- ============================================
create or replace function public.enforce_messaging_privacy()
returns trigger as $$
declare
  v_other_user_id uuid;
  v_privacy messaging_privacy;
  v_is_following boolean;
  v_is_followed_by boolean;
begin
  -- Find the other participant in this conversation
  select
    case
      when c.user_a_id = new.sender_id then c.user_b_id
      else c.user_a_id
    end into v_other_user_id
  from public.conversations c
  where c.id = new.conversation_id;

  if v_other_user_id is null then
    return new;
  end if;

  -- Check the recipient's messaging privacy
  select us.messaging_privacy into v_privacy
  from public.user_settings us
  where us.user_id = v_other_user_id;

  v_privacy := coalesce(v_privacy, 'everyone');

  if v_privacy = 'nobody' then
    raise exception 'This user has disabled direct messages'
      using errcode = 'P0001';
  end if;

  if v_privacy = 'following' then
    select exists (
      select 1 from public.user_follows
      where follower_id = v_other_user_id and following_id = new.sender_id
    ) into v_is_following;

    if not v_is_following then
      raise exception 'This user only accepts messages from people they follow'
        using errcode = 'P0001';
    end if;
  end if;

  if v_privacy = 'mutual' then
    select exists (
      select 1 from public.user_follows
      where follower_id = v_other_user_id and following_id = new.sender_id
    ) into v_is_following;

    select exists (
      select 1 from public.user_follows
      where follower_id = new.sender_id and following_id = v_other_user_id
    ) into v_is_followed_by;

    if not (v_is_following and v_is_followed_by) then
      raise exception 'This user only accepts messages from mutual followers'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_message_check_privacy
  before insert on public.messages
  for each row execute function public.enforce_messaging_privacy();

-- ============================================
-- 4. Re-grant execute permission (dropped with the function)
-- ============================================
revoke all on function public.get_or_create_conversation(uuid, uuid) from public;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;
