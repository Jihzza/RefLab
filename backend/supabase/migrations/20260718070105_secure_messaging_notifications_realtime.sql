-- Secure and complete direct messaging, notifications, and Realtime.
--
-- This migration intentionally keeps Postgres Changes for the launch. It:
--   * removes direct participant/message mutations from browser roles;
--   * binds all privileged messaging RPCs to auth.uid();
--   * makes message delivery idempotent with a client-generated UUID;
--   * creates new-message notifications through the preference-aware helper;
--   * publishes the three user-facing Realtime tables;
--   * makes message media private and participant-only; and
--   * restores notification triggers lost by the 0035 table rebuild.

-- ---------------------------------------------------------------------------
-- 1. Idempotent message identity
-- ---------------------------------------------------------------------------

alter table public.messages
  add column if not exists client_id uuid;

-- Existing messages predate the client id. Their database id is already unique
-- and is a safe deterministic backfill value.
update public.messages
set client_id = id
where client_id is null;

alter table public.messages
  alter column client_id set default gen_random_uuid(),
  alter column client_id set not null;

create unique index if not exists messages_sender_client_id_uidx
  on public.messages(sender_id, client_id);

-- Deleting one profile must not cascade through the shared conversation and
-- erase the counterpart's own messages. Endpoints become tombstones; message
-- ownership deliberately remains NOT NULL / ON DELETE CASCADE so the deleted
-- account's content is removed rather than anonymised and retained.
alter table public.conversations
  alter column user_a_id drop not null,
  alter column user_b_id drop not null;

alter table public.conversations
  drop constraint if exists conversations_user_a_id_fkey,
  drop constraint if exists conversations_user_b_id_fkey,
  drop constraint if exists conversations_unique_pair;

alter table public.conversations
  add constraint conversations_user_a_id_fkey
    foreign key (user_a_id) references public.profiles(id) on delete set null,
  add constraint conversations_user_b_id_fkey
    foreign key (user_b_id) references public.profiles(id) on delete set null;

create unique index if not exists conversations_active_pair_uidx
  on public.conversations(user_a_id, user_b_id)
  where user_a_id is not null and user_b_id is not null;

create or replace function public.cleanup_empty_tombstone_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_a_id is null and new.user_b_id is null then
    delete from public.conversations c where c.id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_conversation_endpoints_tombstoned
  on public.conversations;
create trigger on_conversation_endpoints_tombstoned
  after update of user_a_id, user_b_id on public.conversations
  for each row execute function public.cleanup_empty_tombstone_conversation();

revoke all on function public.cleanup_empty_tombstone_conversation()
  from public, anon, authenticated;

-- Remove participant rows manufactured through the historical self-insert
-- policy, then repair either legitimate participant that may be missing. This
-- closes the IDOR for existing data, not only for writes after this migration.
delete from public.conversation_participants cp
using public.conversations c
where c.id = cp.conversation_id
  and cp.user_id not in (c.user_a_id, c.user_b_id);

insert into public.conversation_participants (
  conversation_id,
  user_id,
  last_read_at
)
select
  c.id,
  participant.user_id,
  c.created_at
from public.conversations c
cross join lateral (
  values (c.user_a_id), (c.user_b_id)
) as participant(user_id)
on conflict (conversation_id, user_id) do nothing;

create or replace function public.enforce_conversation_participant_pair()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.conversations c
    where c.id = new.conversation_id
      and new.user_id in (c.user_a_id, c.user_b_id)
  ) then
    raise exception 'Conversation participant does not belong to the pair'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists on_conversation_participant_validate_pair
  on public.conversation_participants;
create trigger on_conversation_participant_validate_pair
  before insert or update on public.conversation_participants
  for each row execute function public.enforce_conversation_participant_pair();

revoke all on function public.enforce_conversation_participant_pair()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Browser roles may read their participant/message rows, but may not create
--    or move participant rows or insert messages outside the authenticated RPC.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can insert own conversation participants"
  on public.conversation_participants;
drop policy if exists "Users can update own conversation read status"
  on public.conversation_participants;
drop policy if exists "Participants can send own messages"
  on public.messages;

revoke insert, update, delete on table public.conversation_participants
  from anon, authenticated;
revoke insert, update, delete on table public.messages
  from anon, authenticated;

grant select on table public.conversation_participants to authenticated;
grant select on table public.messages to authenticated;
grant select on table public.notifications to authenticated;
revoke update on table public.notifications from anon, authenticated;
grant update (read, dismissed_permanently, next_reminder_at)
  on table public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Conversation creation: caller-bound and block/privacy aware
-- ---------------------------------------------------------------------------

create or replace function public.get_or_create_conversation(
  p_user_id uuid,
  p_other_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_user_a uuid;
  v_user_b uuid;
  v_conversation_id uuid;
  v_privacy public.messaging_privacy;
  v_is_following boolean;
  v_is_followed_by boolean;
begin
  if v_caller_id is null or v_caller_id is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(v_caller_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if p_other_user_id is null or p_other_user_id = v_caller_id then
    raise exception 'A different recipient is required' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = p_other_user_id
  ) then
    raise exception 'Recipient not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.user_blocks ub
    where (ub.blocker_id = v_caller_id and ub.blocked_id = p_other_user_id)
       or (ub.blocker_id = p_other_user_id and ub.blocked_id = v_caller_id)
  ) then
    raise exception 'Message not sent' using errcode = 'P0001';
  end if;

  select us.messaging_privacy
  into v_privacy
  from public.user_settings us
  where us.user_id = p_other_user_id;

  v_privacy := coalesce(v_privacy, 'everyone'::public.messaging_privacy);

  if v_privacy = 'nobody'::public.messaging_privacy then
    raise exception 'This user has disabled direct messages'
      using errcode = 'P0001';
  end if;

  if v_privacy in (
    'following'::public.messaging_privacy,
    'mutual'::public.messaging_privacy
  ) then
    select exists (
      select 1
      from public.user_follows uf
      where uf.follower_id = p_other_user_id
        and uf.following_id = v_caller_id
    ) into v_is_following;

    if not v_is_following then
      raise exception 'This user only accepts messages from people they follow'
        using errcode = 'P0001';
    end if;
  end if;

  if v_privacy = 'mutual'::public.messaging_privacy then
    select exists (
      select 1
      from public.user_follows uf
      where uf.follower_id = v_caller_id
        and uf.following_id = p_other_user_id
    ) into v_is_followed_by;

    if not v_is_followed_by then
      raise exception 'This user only accepts messages from mutual followers'
        using errcode = 'P0001';
    end if;
  end if;

  v_user_a := least(v_caller_id, p_other_user_id);
  v_user_b := greatest(v_caller_id, p_other_user_id);

  insert into public.conversations (user_a_id, user_b_id)
  values (v_user_a, v_user_b)
  on conflict (user_a_id, user_b_id)
    where user_a_id is not null and user_b_id is not null
    do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select c.id
    into v_conversation_id
    from public.conversations c
    where c.user_a_id = v_user_a
      and c.user_b_id = v_user_b
    limit 1;
  end if;

  insert into public.conversation_participants (
    conversation_id,
    user_id,
    last_read_at
  )
  values
    (v_conversation_id, v_caller_id, statement_timestamp()),
    (v_conversation_id, p_other_user_id, statement_timestamp())
  on conflict (conversation_id, user_id) do nothing;

  return v_conversation_id;
end;
$$;

revoke all on function public.get_or_create_conversation(uuid, uuid)
  from public, anon;
grant execute on function public.get_or_create_conversation(uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Defence-in-depth trigger for existing conversations
-- ---------------------------------------------------------------------------

create or replace function public.enforce_messaging_privacy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other_user_id uuid;
  v_privacy public.messaging_privacy;
  v_is_following boolean;
  v_is_followed_by boolean;
begin
  select case
    when c.user_a_id = new.sender_id then c.user_b_id
    when c.user_b_id = new.sender_id then c.user_a_id
    else null
  end
  into v_other_user_id
  from public.conversations c
  where c.id = new.conversation_id;

  if v_other_user_id is null or not exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.user_id = new.sender_id
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.user_blocks ub
    where (ub.blocker_id = new.sender_id and ub.blocked_id = v_other_user_id)
       or (ub.blocker_id = v_other_user_id and ub.blocked_id = new.sender_id)
  ) then
    raise exception 'Message not sent' using errcode = 'P0001';
  end if;

  select us.messaging_privacy
  into v_privacy
  from public.user_settings us
  where us.user_id = v_other_user_id;

  v_privacy := coalesce(v_privacy, 'everyone'::public.messaging_privacy);

  if v_privacy = 'nobody'::public.messaging_privacy then
    raise exception 'This user has disabled direct messages'
      using errcode = 'P0001';
  end if;

  if v_privacy in (
    'following'::public.messaging_privacy,
    'mutual'::public.messaging_privacy
  ) then
    select exists (
      select 1
      from public.user_follows uf
      where uf.follower_id = v_other_user_id
        and uf.following_id = new.sender_id
    ) into v_is_following;

    if not v_is_following then
      raise exception 'This user only accepts messages from people they follow'
        using errcode = 'P0001';
    end if;
  end if;

  if v_privacy = 'mutual'::public.messaging_privacy then
    select exists (
      select 1
      from public.user_follows uf
      where uf.follower_id = new.sender_id
        and uf.following_id = v_other_user_id
    ) into v_is_followed_by;

    if not v_is_followed_by then
      raise exception 'This user only accepts messages from mutual followers'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_message_check_privacy on public.messages;
create trigger on_message_check_privacy
  before insert on public.messages
  for each row execute function public.enforce_messaging_privacy();

revoke all on function public.enforce_messaging_privacy()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Idempotent, caller-bound send RPC
-- ---------------------------------------------------------------------------

-- Remove the legacy surface which inferred the sender only after entering the
-- request. The explicit expected sender prevents a queued operation created by
-- account A from being committed as account B during an auth-session switch.
drop function if exists public.send_message(
  uuid,
  uuid,
  text,
  public.message_media_type,
  text
);

create or replace function public.send_message(
  p_conversation_id uuid,
  p_expected_sender_id uuid,
  p_client_id uuid,
  p_content text default null,
  p_media_type public.message_media_type default 'text'::public.message_media_type,
  p_media_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_content text := nullif(btrim(coalesce(p_content, '')), '');
  v_result jsonb;
  v_existing public.messages%rowtype;
begin
  if v_sender_id is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_expected_sender_id is null
     or p_expected_sender_id is distinct from v_sender_id then
    raise exception 'Authenticated sender changed before delivery'
      using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(v_sender_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if p_conversation_id is null or p_client_id is null then
    raise exception 'Conversation and client message id are required'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = v_sender_id
  ) then
    raise exception 'Conversation not found or not accessible'
      using errcode = '42501';
  end if;

  if v_content is null and p_media_url is null then
    raise exception 'Message content or media is required'
      using errcode = '22023';
  end if;

  if p_media_url is null
     and p_media_type <> 'text'::public.message_media_type then
    raise exception 'Media messages require a media path'
      using errcode = '22023';
  end if;

  if p_media_url is not null and (
    (storage.foldername(p_media_url))[1] is distinct from p_conversation_id::text
    or (storage.foldername(p_media_url))[2] is distinct from v_sender_id::text
    or split_part(storage.filename(p_media_url), '.', 1)
      is distinct from p_client_id::text
  ) then
    raise exception 'Invalid message media path' using errcode = '22023';
  end if;

  if p_media_url is not null and not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'message-media'
      and o.name = p_media_url
  ) then
    raise exception 'Message media upload was not found' using errcode = '22023';
  end if;

  insert into public.messages (
    id,
    conversation_id,
    sender_id,
    client_id,
    content,
    media_type,
    media_url
  )
  values (
    p_client_id,
    p_conversation_id,
    v_sender_id,
    p_client_id,
    v_content,
    p_media_type,
    p_media_url
  )
  -- Catch either the client-id index or the deterministic primary key. The
  -- validation below only returns a row owned by this sender with identical
  -- payload, so an unrelated UUID collision cannot disclose another message.
  on conflict do nothing
  returning jsonb_build_object(
    'id', id,
    'conversation_id', conversation_id,
    'sender_id', sender_id,
    'client_id', client_id,
    'content', content,
    'media_type', media_type,
    'media_url', media_url,
    'created_at', created_at
  ) into v_result;

  if v_result is not null then
    return v_result;
  end if;

  select m.*
  into v_existing
  from public.messages m
  where m.sender_id = v_sender_id
    and m.client_id = p_client_id;

  if not found
     or v_existing.conversation_id is distinct from p_conversation_id
     or v_existing.content is distinct from v_content
     or v_existing.media_type is distinct from p_media_type
     or v_existing.media_url is distinct from p_media_url then
    raise exception 'Client message id has already been used'
      using errcode = '23505';
  end if;

  return jsonb_build_object(
    'id', v_existing.id,
    'conversation_id', v_existing.conversation_id,
    'sender_id', v_existing.sender_id,
    'client_id', v_existing.client_id,
    'content', v_existing.content,
    'media_type', v_existing.media_type,
    'media_url', v_existing.media_url,
    'created_at', v_existing.created_at
  );
end;
$$;

revoke all on function public.send_message(
  uuid,
  uuid,
  uuid,
  text,
  public.message_media_type,
  text
) from public, anon;
grant execute on function public.send_message(
  uuid,
  uuid,
  uuid,
  text,
  public.message_media_type,
  text
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Server-authoritative read cursor. p_read_through must exactly match a
--    message timestamp in this conversation. Legacy future browser timestamps
--    are clamped when the participant cursor is updated.
-- ---------------------------------------------------------------------------

drop function if exists public.mark_conversation_read(uuid, timestamptz);

create or replace function public.mark_conversation_read(
  p_conversation_id uuid,
  p_expected_reader_id uuid,
  p_read_through timestamptz default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_server_now timestamptz := statement_timestamp();
  v_read_through timestamptz;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_expected_reader_id is null
     or p_expected_reader_id is distinct from v_user_id then
    raise exception 'Reader identity changed before the read cursor was saved'
      using errcode = '42501';
  end if;

  if p_read_through is null then
    raise exception 'A message read cursor is required' using errcode = '22023';
  end if;

  select m.created_at
  into v_read_through
  from public.messages m
  where m.conversation_id = p_conversation_id
    and m.created_at = p_read_through
  order by m.id
  limit 1;

  if v_read_through is null then
    raise exception 'Read cursor is not a message in this conversation'
      using errcode = '22023';
  end if;

  v_read_through := least(v_read_through, v_server_now);

  update public.conversation_participants cp
  set last_read_at = greatest(
    least(
      coalesce(cp.last_read_at, '-infinity'::timestamptz),
      v_server_now
    ),
    v_read_through
  )
  where cp.conversation_id = p_conversation_id
    and cp.user_id = v_user_id
  returning cp.last_read_at into v_updated_at;

  if v_updated_at is null then
    raise exception 'Conversation not found or not accessible'
      using errcode = '42501';
  end if;

  return v_updated_at;
end;
$$;

revoke all on function public.mark_conversation_read(uuid, uuid, timestamptz)
  from public, anon;
grant execute on function public.mark_conversation_read(uuid, uuid, timestamptz)
  to authenticated, service_role;

-- Tombstone-aware conversation listing. The return signature stays stable;
-- `other_user.is_deleted` tells clients not to expose a profile action or a
-- composer. The conversation id is used only as a non-PII placeholder id.
create or replace function public.get_conversations(
  p_user_id uuid
)
returns table (
  id uuid,
  updated_at timestamptz,
  other_user jsonb,
  last_message jsonb,
  unread_count integer
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.updated_at,
    jsonb_build_object(
      'id', coalesce(op.id, c.id),
      'username', coalesce(op.username, 'deleted-account'),
      'name', op.name,
      'photo_url', op.photo_url,
      'is_deleted', op.id is null
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
  left join public.profiles op
    on op.id = case
      when c.user_a_id = p_user_id then c.user_b_id
      when c.user_b_id = p_user_id then c.user_a_id
      else null
    end
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
    and p_user_id in (c.user_a_id, c.user_b_id)
  order by coalesce(lm.created_at, c.updated_at) desc;
end;
$$;

revoke all on function public.get_conversations(uuid) from public, anon;
grant execute on function public.get_conversations(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. One canonical, preference-aware notification helper. Historical schemas
--    may have trigger dependencies on a five-argument overload, so retain it as
--    a safe wrapper rather than dropping it. Revoke every overload that may
--    exist due to historical/manual schema drift.
-- ---------------------------------------------------------------------------

create or replace function public.create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_reference_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_enabled boolean;
begin
  if p_user_id is null then
    raise exception 'Notification recipient is required' using errcode = '22023';
  end if;

  if p_actor_id is not null and p_actor_id = p_user_id then
    return null;
  end if;

  select np.enabled
  into v_enabled
  from public.notification_preferences np
  where np.user_id = p_user_id
    and np.notification_type = p_type;

  if v_enabled is false then
    return null;
  end if;

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    title,
    message,
    reference_id
  )
  values (
    p_user_id,
    p_actor_id,
    p_type,
    p_title,
    p_message,
    p_reference_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Dependency-safe legacy wrapper. Existing trigger functions that resolved to
-- this exact overload now receive the canonical preference enforcement.
create or replace function public.create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_message text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.create_notification(
    p_user_id,
    p_actor_id,
    p_type,
    p_title,
    p_message,
    null
  );
$$;

do $$
declare
  v_function record;
begin
  for v_function in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_notification'
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      v_function.signature
    );
    execute format(
      'grant execute on function %s to service_role',
      v_function.signature
    );
  end loop;
end;
$$;

grant execute on function public.create_notification(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid
) to service_role;

-- ---------------------------------------------------------------------------
-- 8. New-message notification producer. The canonical helper provides the
--    self-notification guard and honours notification_preferences.
-- ---------------------------------------------------------------------------

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient_id uuid;
begin
  select case
    when c.user_a_id = new.sender_id then c.user_b_id
    when c.user_b_id = new.sender_id then c.user_a_id
    else null
  end
  into v_recipient_id
  from public.conversations c
  where c.id = new.conversation_id;

  if v_recipient_id is null or v_recipient_id = new.sender_id then
    return new;
  end if;

  perform public.create_notification(
    v_recipient_id,
    new.sender_id,
    'new_message',
    'New Message',
    'sent you a message',
    new.conversation_id
  );

  return new;
end;
$$;

-- Live has used both this canonical trigger name and
-- trigger_notify_new_message. Drop those names plus any non-internal messages
-- trigger backed by a historical notify_new_message function before creating
-- exactly one producer.
drop trigger if exists on_new_message_notification on public.messages;
drop trigger if exists trigger_notify_new_message on public.messages;

do $$
declare
  v_trigger record;
begin
  for v_trigger in
    select t.tgname
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'public.messages'::regclass
      and not t.tgisinternal
      and p.proname in ('notify_new_message', 'handle_new_message_notification')
  loop
    execute format(
      'drop trigger if exists %I on public.messages',
      v_trigger.tgname
    );
  end loop;
end;
$$;

create trigger on_new_message_notification
  after insert on public.messages
  for each row execute function public.notify_new_message();

revoke all on function public.notify_new_message()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Restore the two notification producers removed when 0035 rebuilt their
--    source tables with DROP ... CASCADE. Use fully-qualified, fixed-path
--    definitions rather than reviving the historical unsafe definitions.
-- ---------------------------------------------------------------------------

create or replace function public.handle_streak_track_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'submitted' or old.status = 'submitted' then
    return new;
  end if;

  if exists (
    select 1
    from public.notifications n
    where n.user_id = new.user_id
      and n.type = 'streak_track'
      and n.created_at >= date_trunc('day', statement_timestamp())
  ) then
    return new;
  end if;

  perform public.create_notification(
    new.user_id,
    null,
    'streak_track',
    'Learning Streak',
    'You completed a learning activity today. Keep it up!',
    null
  );

  return new;
end;
$$;

drop trigger if exists on_test_submitted_streak_notification
  on public.test_attempts;
create trigger on_test_submitted_streak_notification
  after update on public.test_attempts
  for each row execute function public.handle_streak_track_notification();

create or replace function public.handle_new_test_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active is not true then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    reference_id
  )
  select
    p.id,
    'new_content_available',
    'New Content Available',
    'A new test "' || new.title || '" is now available. Check it out!',
    new.id
  from public.profiles p
  where not exists (
    select 1
    from public.notification_preferences np
    where np.user_id = p.id
      and np.notification_type = 'new_content_available'
      and np.enabled is false
  );

  return new;
end;
$$;

drop trigger if exists on_new_test_notification on public.tests;
create trigger on_new_test_notification
  after insert on public.tests
  for each row execute function public.handle_new_test_notification();

revoke all on function public.handle_streak_track_notification()
  from public, anon, authenticated;
revoke all on function public.handle_new_test_notification()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. Realtime publication. RLS on all four tables remains the authorization
--     boundary for Postgres Changes.
-- ---------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  if not exists (
    select 1 from pg_publication p where p.pubname = 'supabase_realtime'
  ) then
    raise exception 'Required publication supabase_realtime does not exist';
  end if;

  foreach v_table in array array[
    'messages',
    'conversations',
    'conversation_participants',
    'notifications'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables pt
      where pt.pubname = 'supabase_realtime'
        and pt.schemaname = 'public'
        and pt.tablename = v_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        v_table
      );
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Private, participant-only message media. New object paths are
--     <conversation-id>/<sender-id>/<client-id>.<extension>. The SELECT policy
--     also supports legacy paths when an existing message references them.
-- ---------------------------------------------------------------------------

update storage.buckets
set public = false
where id = 'message-media';

drop policy if exists "Authenticated users can upload message media"
  on storage.objects;
drop policy if exists "Anyone can read message media"
  on storage.objects;
drop policy if exists "Users can delete own message media"
  on storage.objects;
drop policy if exists "Message participants can read message media"
  on storage.objects;
drop policy if exists "Message participants can upload own message media"
  on storage.objects;
drop policy if exists "Message participants can update own message media"
  on storage.objects;
drop policy if exists "Message senders can delete own message media"
  on storage.objects;

create policy "Message participants can upload own message media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-media'
    and public.account_accepts_uploads((select auth.uid()))
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1
      from public.conversation_participants cp
      where cp.user_id = (select auth.uid())
        and cp.conversation_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Message participants can read message media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-media'
    and (
      -- Pending/retrying upload owned by a current participant.
      (
        (storage.foldername(name))[2] = (select auth.uid())::text
        and exists (
          select 1
          from public.conversation_participants cp
          where cp.user_id = (select auth.uid())
            and cp.conversation_id::text = (storage.foldername(name))[1]
        )
      )
      or exists (
        -- Sent object, including legacy paths, referenced by an accessible DM.
        select 1
        from public.messages m
        join public.conversation_participants cp
          on cp.conversation_id = m.conversation_id
        where m.media_url = storage.objects.name
          and cp.user_id = (select auth.uid())
      )
    )
  );

create policy "Message senders can delete own message media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'message-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1
      from public.conversation_participants cp
      where cp.user_id = (select auth.uid())
        and cp.conversation_id::text = (storage.foldername(name))[1]
    )
    and not exists (
      -- Committed message history is immutable to browser clients. Service-role
      -- account deletion remains able to purge all objects after data teardown.
      select 1
      from public.messages m
      where m.media_url = storage.objects.name
    )
  );

-- ---------------------------------------------------------------------------
-- 12. Remove browser execution from historical privileged notification and
--     message trigger helpers. Fixed search paths preserve their trigger/cron
--     behavior; owner and explicitly granted service_role execution remain.
-- ---------------------------------------------------------------------------

do $$
declare
  v_function record;
begin
  for v_function in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'create_profile_reminder',
        'handle_message_insert_update_conversation',
        'handle_post_like_notification',
        'handle_post_comment_notification',
        'handle_repost_notification',
        'handle_follow_notification',
        'handle_streak_track_notification',
        'handle_subscription_welcome_notification',
        'handle_subscription_expired_notification',
        'handle_new_test_notification',
        'notify_new_message',
        'handle_new_message_notification',
        'cleanup_empty_tombstone_conversation',
        'enforce_conversation_participant_pair',
        'enforce_messaging_privacy',
        'check_plan_expiration_reminders'
      ])
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      v_function.signature
    );

    -- Older helpers use unqualified object names. Pin their resolution instead
    -- of inheriting a caller-controlled search_path.
    execute format(
      'alter function %s set search_path = pg_catalog, public',
      v_function.signature
    );
  end loop;
end;
$$;

-- The canonical functions above are fully qualified and keep an empty path.
alter function public.create_notification(uuid, uuid, text, text, text, uuid)
  set search_path = '';
alter function public.notify_new_message() set search_path = '';
alter function public.cleanup_empty_tombstone_conversation()
  set search_path = '';
alter function public.enforce_conversation_participant_pair()
  set search_path = '';
alter function public.enforce_messaging_privacy() set search_path = '';
alter function public.handle_streak_track_notification() set search_path = '';
alter function public.handle_new_test_notification() set search_path = '';

-- Read-only messaging RPCs also run as definer. Their bodies use qualified
-- relations, so pin resolution and remove any explicit anonymous grants that
-- may exist on a drifted live schema.
alter function public.search_users(text, uuid, integer) set search_path = '';
alter function public.get_conversations(uuid) set search_path = '';
alter function public.get_messages(uuid, uuid, timestamptz, integer)
  set search_path = '';
alter function public.get_total_unread_count(uuid) set search_path = '';

revoke all on function public.search_users(text, uuid, integer) from anon;
revoke all on function public.get_conversations(uuid) from anon;
revoke all on function public.get_messages(uuid, uuid, timestamptz, integer)
  from anon;
revoke all on function public.get_total_unread_count(uuid) from anon;

grant execute on function public.create_notification(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid
) to service_role;

do $$
begin
  if to_regprocedure('public.check_plan_expiration_reminders()') is not null then
    execute 'grant execute on function public.check_plan_expiration_reminders() to service_role';
  end if;
end;
$$;
