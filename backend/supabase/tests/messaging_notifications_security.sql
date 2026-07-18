-- Messaging / notifications launch security contract.
-- Run against a disposable/local database after all migrations, for example:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--     -f backend/supabase/tests/messaging_notifications_security.sql

begin;

-- Stable deletion-lock fixture without depending on the current GoTrue
-- auth.users shape. Everything is rolled back at the end.
set local session_replication_role = replica;
insert into public.profiles (
  id,
  username,
  role,
  deletion_started_at
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'MessagingDeletingUser',
    'user',
    statement_timestamp()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'MessagingNotificationActor',
    'user',
    null
  ),
  (
    '20000000-0000-4000-8000-000000000010',
    'MessagingPairA',
    'user',
    null
  ),
  (
    '20000000-0000-4000-8000-000000000020',
    'MessagingPairB',
    'user',
    null
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'MessagingDeletionJobRecipient',
    'user',
    null
  );

insert into public.account_deletion_jobs (user_id, phase)
values (
  '20000000-0000-4000-8000-000000000003',
  'requested'
);

insert into public.conversations (
  id, user_a_id, user_b_id, created_at, updated_at
)
values (
  '21000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000010',
  '20000000-0000-4000-8000-000000000020',
  '2026-07-18 12:00:00+00',
  '2026-07-18 12:00:00+00'
), (
  '21000000-0000-4000-8000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-4000-8000-000000000010',
  '2026-07-18 12:00:00+00',
  '2026-07-18 12:00:00+00'
), (
  '21000000-0000-4000-8000-000000000003',
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-4000-8000-000000000010',
  '2026-07-18 12:00:00+00',
  '2026-07-18 12:00:00+00'
), (
  '21000000-0000-4000-8000-000000000004',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-4000-8000-000000000020',
  '2026-07-18 12:00:00+00',
  '2026-07-18 12:00:00+00'
);

insert into public.conversation_participants (
  conversation_id, user_id, last_read_at, created_at
)
values
  (
    '21000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000010',
    '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
  ),
  (
    '21000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000020',
    '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000010',
    '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
  ),
  (
    '21000000-0000-4000-8000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
  ),
  (
    '21000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000010',
    '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
  ),
  (
    '21000000-0000-4000-8000-000000000004',
    '20000000-0000-0000-0000-000000000002',
    '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
  ),
  (
    '21000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000020',
    '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
  );

insert into public.messages (
  id, conversation_id, sender_id, client_id, content, media_type,
  media_url, created_at
)
values
  (
    '22000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000010',
    '22000000-0000-4000-8000-000000000001',
    'same timestamp one', 'text', null, '2026-07-18 12:01:00+00'
  ),
  (
    '22000000-0000-4000-8000-000000000002',
    '21000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000020',
    '22000000-0000-4000-8000-000000000002',
    'same timestamp two', 'text', null, '2026-07-18 12:01:00+00'
  ),
  (
    '22000000-0000-4000-8000-000000000003',
    '21000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000020',
    '22000000-0000-4000-8000-000000000003',
    'same timestamp three', 'text', null, '2026-07-18 12:01:00+00'
  );

insert into public.messages (
  id, conversation_id, sender_id, client_id, content, media_type,
  media_url, created_at
)
values (
  '22000000-0000-4000-8000-000000000004',
  '21000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000010',
  '24000000-0000-4000-8000-000000000001',
  null, 'image',
  '21000000-0000-4000-8000-000000000002/'
    || '20000000-0000-4000-8000-000000000010/'
    || '24000000-0000-4000-8000-000000000001.jpg',
  '2026-07-18 12:00:30+00'
);

insert into public.messages (
  id, conversation_id, sender_id, client_id, content, media_type,
  media_url, created_at
)
values (
  '22000000-0000-4000-8000-000000000100',
  '21000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000020',
  '22000000-0000-4000-8000-000000000100',
  'idempotent rate-boundary fixture', 'text', null, statement_timestamp()
);
insert into public.messages (
  conversation_id, sender_id, client_id, content, media_type,
  media_url, created_at
)
select
  '21000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000020',
  gen_random_uuid(), 'rate-boundary fixture', 'text', null,
  statement_timestamp()
from generate_series(1, 59);

insert into reflab_private.rate_limit_events (actor_id, scope, created_at)
select
  '20000000-0000-4000-8000-000000000020',
  'message',
  statement_timestamp()
from generate_series(1, 60);

insert into reflab_private.rate_limit_events (actor_id, scope, created_at)
select
  '20000000-0000-4000-8000-000000000010',
  'upload_message',
  statement_timestamp()
from generate_series(1, 20);

insert into public.user_blocks (blocker_id, blocked_id)
values (
  '20000000-0000-4000-8000-000000000020',
  '20000000-0000-4000-8000-000000000010'
);

insert into storage.objects (
  bucket_id, name, owner_id, metadata, created_at, updated_at
)
select
  'message-media',
  '21000000-0000-4000-8000-000000000002/'
    || '20000000-0000-4000-8000-000000000010/'
    || gen_random_uuid()::text || '.jpg',
  '20000000-0000-4000-8000-000000000010',
  jsonb_build_object('size', 1024),
  statement_timestamp(),
  statement_timestamp()
from generate_series(1, 20);

insert into storage.objects (
  bucket_id, name, owner_id, metadata, created_at, updated_at
)
values (
  'message-media',
  '21000000-0000-4000-8000-000000000003/'
    || '20000000-0000-4000-8000-000000000010/'
    || '23000000-0000-4000-8000-000000000001.jpg',
  '20000000-0000-4000-8000-000000000010',
  jsonb_build_object('size', 1024),
  statement_timestamp(), statement_timestamp()
);

insert into storage.objects (
  bucket_id, name, owner_id, metadata, created_at, updated_at
)
values
  (
    'message-media',
    '21000000-0000-4000-8000-000000000002/'
      || '20000000-0000-4000-8000-000000000010/'
      || '24000000-0000-4000-8000-000000000001.jpg',
    '20000000-0000-4000-8000-000000000010',
    jsonb_build_object('size', 1024, 'mimetype', 'image/jpeg'),
    statement_timestamp(), statement_timestamp()
  ),
  (
    'message-media',
    '21000000-0000-4000-8000-000000000002/'
      || '20000000-0000-4000-8000-000000000010/'
      || '24000000-0000-4000-8000-000000000002.jpg',
    '20000000-0000-4000-8000-000000000010',
    jsonb_build_object('size', 1024, 'mimetype', 'image/jpeg'),
    statement_timestamp(), statement_timestamp()
  );
set local session_replication_role = origin;

create or replace function pg_temp.assert_true(
  p_condition boolean,
  p_message text
)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'assertion failed: %', p_message;
  end if;
end;
$$;

do $$
declare
  v_count integer;
  v_definition text;
  v_function record;
  v_cycle integer;
begin
  -- Idempotency column and unique sender/client contract.
  perform pg_temp.assert_true(
    exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'messages'
        and c.column_name = 'client_id'
        and c.is_nullable = 'NO'
    ),
    'messages.client_id must exist and be NOT NULL'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_indexes i
      where i.schemaname = 'public'
        and i.tablename = 'messages'
        and i.indexname = 'messages_sender_client_id_uidx'
        and i.indexdef ilike 'create unique index%'
    ),
    'messages(sender_id, client_id) must be unique'
  );

  -- Browser roles cannot manufacture participants or bypass send_message().
  perform pg_temp.assert_true(
    not has_table_privilege(
      'authenticated',
      'public.conversation_participants',
      'INSERT'
    ),
    'authenticated must not INSERT conversation participants directly'
  );
  perform pg_temp.assert_true(
    not has_table_privilege(
      'authenticated',
      'public.conversation_participants',
      'UPDATE'
    ),
    'authenticated must not UPDATE conversation participants directly'
  );
  perform pg_temp.assert_true(
    not has_table_privilege('authenticated', 'public.messages', 'INSERT'),
    'authenticated must not INSERT messages directly'
  );

  select count(*)
  into v_count
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename = 'conversation_participants'
    and p.cmd in ('INSERT', 'UPDATE');

  perform pg_temp.assert_true(
    v_count = 0,
    'conversation_participants must not expose INSERT/UPDATE RLS policies'
  );

  select count(*)
  into v_count
  from public.conversation_participants cp
  join public.conversations c on c.id = cp.conversation_id
  where cp.user_id not in (c.user_a_id, c.user_b_id);

  perform pg_temp.assert_true(
    v_count = 0,
    'historical non-pair conversation participants must be removed'
  );

  select count(*)
  into v_count
  from public.conversations c
  where not exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = c.id
      and cp.user_id = c.user_a_id
  )
  or not exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = c.id
      and cp.user_id = c.user_b_id
  );

  perform pg_temp.assert_true(
    v_count = 0,
    'both canonical participants must exist for every conversation'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_trigger t
      where t.tgrelid = 'public.conversation_participants'::regclass
        and t.tgname = 'on_conversation_participant_validate_pair'
        and not t.tgisinternal
    ),
    'conversation participant pair integrity trigger must exist'
  );

  perform pg_temp.assert_true(
    not (
      select a.attnotnull
      from pg_attribute a
      where a.attrelid = 'public.conversations'::regclass
        and a.attname = 'user_a_id'
    )
      and not (
        select a.attnotnull
        from pg_attribute a
        where a.attrelid = 'public.conversations'::regclass
          and a.attname = 'user_b_id'
      ),
    'conversation endpoints must be nullable tombstones'
  );

  select count(*)
  into v_count
  from pg_constraint c
  where c.conrelid = 'public.conversations'::regclass
    and c.conname in (
      'conversations_user_a_id_fkey',
      'conversations_user_b_id_fkey'
    )
    and c.confdeltype = 'n';

  perform pg_temp.assert_true(
    v_count = 2,
    'conversation endpoint foreign keys must use ON DELETE SET NULL'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid
       and a.attnum = any(c.conkey)
      where c.conrelid = 'public.messages'::regclass
        and c.contype = 'f'
        and a.attname = 'sender_id'
        and c.confdeltype = 'c'
        and a.attnotnull
    ),
    'message sender must remain NOT NULL with ON DELETE CASCADE'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_indexes i
      where i.schemaname = 'public'
        and i.tablename = 'conversations'
        and i.indexname = 'conversations_active_pair_uidx'
        and i.indexdef ilike '%unique index%'
        and i.indexdef ilike '%where%user_a_id is not null%'
        and i.indexdef ilike '%user_b_id is not null%'
    ),
    'active conversation pairs must use a partial unique index'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_trigger t
      where t.tgrelid = 'public.conversations'::regclass
        and t.tgname = 'on_conversation_endpoints_tombstoned'
        and not t.tgisinternal
    ),
    'fully empty tombstone conversations must be cleaned up'
  );

  select p.qual
  into v_definition
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename = 'conversations'
    and p.policyname = 'Active participants can read conversations';

  perform pg_temp.assert_true(
    v_definition like '%account_accepts_uploads%auth.uid()%'
      and v_definition like '%user_a_id%user_b_id%',
    'Realtime conversation reads must be active-account participant-only'
  );

  select pg_get_expr(p.polqual, p.polrelid)
  into v_definition
  from pg_policy p
  where p.polrelid = 'public.messages'::regclass
    and p.polname = 'Active participants can read messages';
  perform pg_temp.assert_true(
    v_definition like '%account_accepts_uploads%auth.uid()%'
      and v_definition like '%conversation_participants%',
    'Realtime message reads must fail closed for deletion-started callers'
  );

  -- Authenticated RPC surface is explicit and anon is excluded.
  perform pg_temp.assert_true(
    has_function_privilege(
      'authenticated',
      'public.send_message(uuid,uuid,uuid,text,public.message_media_type,text)',
      'EXECUTE'
    ),
    'authenticated must execute send_message'
  );
  perform pg_temp.assert_true(
    not has_function_privilege(
      'anon',
      'public.send_message(uuid,uuid,uuid,text,public.message_media_type,text)',
      'EXECUTE'
    )
      and to_regprocedure(
        'public.send_message(uuid,uuid,text,public.message_media_type,text)'
      ) is null,
    'anon is excluded and the sender-implicit send_message surface is removed'
  );
  perform pg_temp.assert_true(
    has_function_privilege(
      'authenticated',
      'public.mark_conversation_read(uuid,uuid,timestamptz)',
      'EXECUTE'
    ),
    'authenticated must execute mark_conversation_read'
  );
  perform pg_temp.assert_true(
    not has_function_privilege(
      'anon',
      'public.mark_conversation_read(uuid,uuid,timestamptz)',
      'EXECUTE'
    ),
    'anon must not execute mark_conversation_read'
  );
  perform pg_temp.assert_true(
    to_regprocedure('public.mark_conversation_read(uuid,timestamptz)') is null,
    'the reader-implicit mark_conversation_read overload must be removed'
  );
  perform pg_temp.assert_true(
    has_function_privilege(
      'authenticated',
      'public.get_messages(uuid,uuid,text,integer)',
      'EXECUTE'
    )
      and to_regprocedure(
        'public.get_messages(uuid,uuid,timestamptz,integer)'
      ) is null,
    'message history must use the composite text cursor contract only'
  );

  select pg_get_functiondef(
    'public.get_or_create_conversation(uuid,uuid)'::regprocedure
  ) into v_definition;
  perform pg_temp.assert_true(
    v_definition like '%auth.uid()%'
      and v_definition like '%public.user_blocks%'
      and v_definition like '%public.account_accepts_uploads%',
    'conversation creation must bind auth.uid, deletion lock, and blocks'
  );
  perform pg_temp.assert_true(
    exists (
      select 1
        from pg_trigger as trigger_row
       where trigger_row.tgrelid = 'public.conversations'::regclass
         and trigger_row.tgname = 'enforce_active_conversation_pair'
         and not trigger_row.tgisinternal
    )
      and position(
        'account_is_active'
        in pg_get_functiondef(
          'reflab_private.enforce_active_conversation_pair()'::regprocedure
        )
      ) > 0,
    'get_or_create rejects existing and new pairs with a deleting recipient'
  );

  select pg_get_functiondef('public.get_conversations(uuid)'::regprocedure)
  into v_definition;
  perform pg_temp.assert_true(
    v_definition like '%''is_deleted''%'
      and v_definition like '%left join public.profiles%'
      and v_definition like '%p_user_id in (c.user_a_id, c.user_b_id)%',
    'conversation listing must expose a non-PII deleted-account tombstone'
  );

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '20000000-0000-4000-8000-000000000010',
      'role', 'authenticated'
    )::text,
    true
  );
  perform set_config(
    'request.jwt.claim.sub',
    '20000000-0000-4000-8000-000000000010',
    true
  );

  begin
    perform public.get_or_create_conversation(
      '20000000-0000-4000-8000-000000000010'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid
    );
    raise exception
      'assertion failed: existing conversation accepted marker-deleting target';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    perform public.get_or_create_conversation(
      '20000000-0000-4000-8000-000000000010'::uuid,
      '20000000-0000-4000-8000-000000000003'::uuid
    );
    raise exception
      'assertion failed: new conversation accepted job-deleting target';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    perform public.send_message(
      gen_random_uuid(),
      '20000000-0000-4000-8000-000000000020'::uuid,
      gen_random_uuid(),
      'cross-account queued write',
      'text'::public.message_media_type,
      null
    );
    raise exception 'assertion failed: send_message accepted a stale sender owner';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    perform public.send_message(
      '21000000-0000-4000-8000-000000000003'::uuid,
      '20000000-0000-4000-8000-000000000010'::uuid,
      '23000000-0000-4000-8000-000000000002'::uuid,
      'text to deleting recipient',
      'text'::public.message_media_type,
      null
    );
    raise exception 'assertion failed: text reached marker-deleting recipient';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    perform public.send_message(
      '21000000-0000-4000-8000-000000000003'::uuid,
      '20000000-0000-4000-8000-000000000010'::uuid,
      '23000000-0000-4000-8000-000000000001'::uuid,
      null,
      'image'::public.message_media_type,
      '21000000-0000-4000-8000-000000000003/'
        || '20000000-0000-4000-8000-000000000010/'
        || '23000000-0000-4000-8000-000000000001.jpg'
    );
    raise exception
      'assertion failed: attachment reached marker-deleting recipient';
  exception when sqlstate '42501' then
    null;
  end;

  perform pg_temp.assert_true(
    not public.can_upload_message_media(
      '21000000-0000-4000-8000-000000000003/'
        || '20000000-0000-4000-8000-000000000010/'
        || '23000000-0000-4000-8000-000000000099.jpg',
      '20000000-0000-4000-8000-000000000010',
      jsonb_build_object('size', 1024)
    ),
    'message-media upload admission rejects a deleting recipient'
  );

  select count(*)
    into v_count
    from public.messages as message
   where message.client_id in (
     '23000000-0000-4000-8000-000000000001',
     '23000000-0000-4000-8000-000000000002'
   );
  perform pg_temp.assert_true(
    v_count = 0,
    'rejected text and attachment sends persist no message row'
  );

  select count(*)
    into v_count
    from public.notifications as notification
   where notification.type = 'new_message'
     and notification.reference_id =
       '21000000-0000-4000-8000-000000000003'::uuid;
  perform pg_temp.assert_true(
    v_count = 0,
    'a rejected send cannot reach the after-insert notification producer'
  );

  select count(*)
    into v_count
    from public.get_messages(
      '21000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000010',
      null,
      2
    );
  perform pg_temp.assert_true(
    v_count = 2,
    'first message page must retain both rows at a tied timestamp'
  );

  select count(*)
    into v_count
    from public.get_messages(
      '21000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000010',
      null,
      10
    ) as message
   where message.id = '22000000-0000-4000-8000-000000000001'
     and message.client_id = '22000000-0000-4000-8000-000000000001';
  perform pg_temp.assert_true(
    v_count = 1,
    'message pages preserve client_id for delivered-outbox reconciliation'
  );

  select count(*)
    into v_count
    from public.get_messages(
      '21000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000010',
      '2026-07-18 12:01:00+00|22000000-0000-4000-8000-000000000002',
      2
    ) as message
   where message.id = '22000000-0000-4000-8000-000000000001';
  perform pg_temp.assert_true(
    v_count = 1,
    'composite cursor must return the remaining tied-timestamp message'
  );

  select count(*)
    into v_count
    from public.get_messages(
      '21000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000010',
      null,
      10
    ) as message
   where message.sender_id = '20000000-0000-4000-8000-000000000020'
     and message.sender ->> 'username' = 'blocked_account'
     and message.sender ->> 'photo_url' is null;
  perform pg_temp.assert_true(
    v_count = 2,
    'blocker identity must be tombstoned in existing history'
  );

  select count(*)
    into v_count
    from public.get_conversations(
      '20000000-0000-4000-8000-000000000010'
    ) as conversation
   where conversation.id = '21000000-0000-4000-8000-000000000001'
     and conversation.other_user ->> 'username' = 'blocked_account'
     and (conversation.other_user ->> 'is_blocked')::boolean;
  perform pg_temp.assert_true(
    v_count = 1,
    'blocker identity must be tombstoned in conversation listing'
  );

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '20000000-0000-4000-8000-000000000020',
      'role', 'authenticated'
    )::text,
    true
  );
  perform set_config(
    'request.jwt.claim.sub',
    '20000000-0000-4000-8000-000000000020',
    true
  );

  select count(*)
    into v_count
    from public.get_messages(
      '21000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000020',
      null,
      10
    ) as message
   where message.sender_id = '20000000-0000-4000-8000-000000000010'
     and message.sender ->> 'username' = 'blocked_account';
  perform pg_temp.assert_true(
    v_count = 1,
    'blocked identity must also be tombstoned for the blocker'
  );

  -- At a full sender window, an exact client-id retry must still converge to
  -- the existing row, while a genuinely new operation remains rate-limited.
  insert into public.messages (
    conversation_id, sender_id, client_id, content, media_type, media_url
  ) values (
    '21000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000020',
    '22000000-0000-4000-8000-000000000100',
    'lost-response retry', 'text', null
  ) on conflict (sender_id, client_id) do nothing;
  select count(*) into v_count
    from public.messages
   where sender_id = '20000000-0000-4000-8000-000000000020'
     and client_id = '22000000-0000-4000-8000-000000000100';
  perform pg_temp.assert_true(
    v_count = 1,
    'same-client retry remains idempotent at the full rate boundary'
  );
  begin
    insert into public.messages (
      conversation_id, sender_id, client_id, content, media_type, media_url
    ) values (
      '21000000-0000-4000-8000-000000000004',
      '20000000-0000-4000-8000-000000000020',
      '22000000-0000-4000-8000-000000000101',
      'new operation at boundary', 'text', null
    );
    raise exception 'assertion failed: new client id bypassed the rate boundary';
  exception when sqlstate 'P0001' then
    null;
  end;

  select pg_get_functiondef(
    'public.send_message(uuid,uuid,uuid,text,public.message_media_type,text)'::regprocedure
  ) into v_definition;
  perform pg_temp.assert_true(
    v_definition like '%auth.uid()%'
      and v_definition like '%p_expected_sender_id%'
      and v_definition like '%is distinct from v_sender_id%'
      and v_definition like '%on conflict do nothing%'
      and v_definition like '%public.account_accepts_uploads%'
      and v_definition like '%storage.filename(p_media_url)%'
      and v_definition like '%from storage.objects%'
      and v_definition like '%p_client_id%',
    'send_message must bind the expected auth owner, validate media, and be idempotent'
  );

  select pg_get_functiondef(
    'public.mark_conversation_read(uuid,uuid,timestamptz)'::regprocedure
  ) into v_definition;
  perform pg_temp.assert_true(
    v_definition like '%p_expected_reader_id%'
      and v_definition like '%is distinct from v_user_id%'
      and v_definition like '%from public.messages%'
      and v_definition like '%m.conversation_id = p_conversation_id%'
      and v_definition like '%m.created_at = p_read_through%'
      and v_definition like '%coalesce(cp.last_read_at, ''-infinity''::timestamp with time zone)%',
    'read cursor must match a real message and tolerate a legacy NULL cursor'
  );

  select pg_get_functiondef(
    'public.enforce_messaging_privacy()'::regprocedure
  ) into v_definition;
  perform pg_temp.assert_true(
    v_definition like '%public.user_blocks%'
      and v_definition like '%account_is_active%',
    'existing conversations enforce blocks and active-recipient status'
  );

  -- Every historical create_notification overload must be private. The one
  -- canonical overload remains available to service_role and trigger owners.
  v_count := 0;
  for v_function in
    select p.oid, p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_notification'
  loop
    v_count := v_count + 1;
    perform pg_temp.assert_true(
      not has_function_privilege('anon', v_function.oid, 'EXECUTE'),
      format('anon must not execute %s', v_function.signature)
    );
    perform pg_temp.assert_true(
      not has_function_privilege('authenticated', v_function.oid, 'EXECUTE'),
      format('authenticated must not execute %s', v_function.signature)
    );
  end loop;

  perform pg_temp.assert_true(v_count >= 1, 'create_notification must exist');
  perform pg_temp.assert_true(
    has_function_privilege(
      'service_role',
      'public.create_notification(uuid,uuid,text,text,text,uuid)',
      'EXECUTE'
    ),
    'service_role must retain canonical create_notification access'
  );

  select pg_get_functiondef(
    'public.create_notification(uuid,uuid,text,text,text,uuid)'::regprocedure
  ) into v_definition;
  perform pg_temp.assert_true(
    v_definition like '%on conflict (user_id, type, reference_id)%'
      and v_definition like '%read = false%'
      and v_definition like '%dismissed_permanently = false%',
    'new-message notifications must atomically reopen one durable row'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
        from pg_indexes as notification_index
       where notification_index.schemaname = 'public'
         and notification_index.tablename = 'notifications'
         and notification_index.indexname = 'notifications_new_message_conversation_uidx'
         and notification_index.indexdef ilike 'create unique index%'
    ),
    'new-message delivery must be unique per user and conversation'
  );

  perform public.create_notification(
    '20000000-0000-4000-8000-000000000010'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid,
    'new_message',
    'New Message',
    'first delivery',
    '20000000-0000-0000-0000-000000000099'::uuid
  );
  update public.notifications
     set read = true,
         dismissed_permanently = true
   where user_id = '20000000-0000-4000-8000-000000000010'::uuid
     and type = 'new_message'
     and reference_id = '20000000-0000-0000-0000-000000000099'::uuid;
  perform public.create_notification(
    '20000000-0000-4000-8000-000000000010'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid,
    'new_message',
    'New Message',
    'second delivery',
    '20000000-0000-0000-0000-000000000099'::uuid
  );

  select count(*)
    into v_count
    from public.notifications as notification
   where notification.user_id = '20000000-0000-4000-8000-000000000010'::uuid
     and notification.type = 'new_message'
     and notification.reference_id = '20000000-0000-0000-0000-000000000099'::uuid
     and not notification.read
     and not notification.dismissed_permanently
     and notification.message = 'second delivery';
  perform pg_temp.assert_true(
    v_count = 1,
    'a delivery after mark-read must reuse and reopen the same notification row'
  );

  perform pg_temp.assert_true(
    public.create_notification(
      '20000000-0000-0000-0000-000000000001'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      'new_message',
      'New Message',
      'must not reach a deleting recipient',
      '20000000-0000-0000-0000-000000000098'::uuid
    ) is null,
    'central notification delivery rejects a deletion-started recipient'
  );
  select count(*)
    into v_count
    from public.notifications as notification
   where notification.user_id = '20000000-0000-0000-0000-000000000001'::uuid
     and notification.reference_id = '20000000-0000-0000-0000-000000000098'::uuid;
  perform pg_temp.assert_true(
    v_count = 0,
    'a deleting recipient receives no durable notification row'
  );

  for v_function in
    select p.oid, p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'notify_new_message',
        'handle_new_message_notification',
        'enforce_conversation_participant_pair',
        'enforce_messaging_privacy'
      )
  loop
    perform pg_temp.assert_true(
      not has_function_privilege('anon', v_function.oid, 'EXECUTE')
        and not has_function_privilege(
          'authenticated',
          v_function.oid,
          'EXECUTE'
        ),
      format('browser roles must not execute trigger helper %s', v_function.signature)
    );
  end loop;

  select pg_get_functiondef('public.notify_new_message()'::regprocedure)
  into v_definition;
  perform pg_temp.assert_true(
    v_definition like '%''new_message''%'
      and v_definition like '%new.conversation_id%',
    'new-message producer must set type and conversation reference'
  );

  select count(*)
  into v_count
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
  where t.tgrelid = 'public.messages'::regclass
    and not t.tgisinternal
    and p.proname in ('notify_new_message', 'handle_new_message_notification');

  perform pg_temp.assert_true(
    v_count = 1,
    'exactly one new-message notification producer must exist'
  );

  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_trigger t
      where t.tgrelid = 'public.messages'::regclass
        and t.tgname = 'on_new_message_notification'
        and not t.tgisinternal
    ),
    'the canonical new-message notification trigger must exist'
  );

  -- Triggers removed by the destructive 0035 rebuild are restored.
  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_trigger t
      where t.tgrelid = 'public.test_attempts'::regclass
        and t.tgname = 'on_test_submitted_streak_notification'
        and not t.tgisinternal
    ),
    'streak notification trigger must be restored'
  );
  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_trigger t
      where t.tgrelid = 'public.tests'::regclass
        and t.tgname = 'on_new_test_notification'
        and not t.tgisinternal
    ),
    'new-content notification trigger must be restored'
  );

  -- All state needed by other tabs/devices is in the Realtime publication.
  select count(*)
  into v_count
  from pg_publication_tables pt
  where pt.pubname = 'supabase_realtime'
    and pt.schemaname = 'public'
    and pt.tablename in (
      'messages',
      'conversations',
      'conversation_participants',
      'notifications'
    );

  perform pg_temp.assert_true(
    v_count = 4,
    'messages, conversations, participants and notifications must be published'
  );

  -- The recent-upload budget is independent of deletable Storage rows.
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '20000000-0000-0000-0000-000000000002',
      'role', 'authenticated'
    )::text,
    true
  );
  perform set_config(
    'request.jwt.claim.sub',
    '20000000-0000-0000-0000-000000000002',
    true
  );
  for v_cycle in 1..5 loop
    perform pg_temp.assert_true(
      public.can_upload_profile_media(
        '20000000-0000-0000-0000-000000000002/avatars/rate-cycle.jpg',
        '20000000-0000-0000-0000-000000000002',
        jsonb_build_object('size', 1024)
      ),
      'each in-budget profile upload admission must succeed'
    );
    insert into storage.objects (
      bucket_id, name, owner_id, metadata, created_at, updated_at
    ) values (
      'profile-media',
      '20000000-0000-0000-0000-000000000002/avatars/rate-cycle.jpg',
      '20000000-0000-0000-0000-000000000002',
      jsonb_build_object('size', 1024),
      statement_timestamp(), statement_timestamp()
    );
    delete from storage.objects
     where bucket_id = 'profile-media'
       and name = '20000000-0000-0000-0000-000000000002/avatars/rate-cycle.jpg';
  end loop;
  perform pg_temp.assert_true(
    not public.can_upload_profile_media(
      '20000000-0000-0000-0000-000000000002/avatars/rate-cycle.jpg',
      '20000000-0000-0000-0000-000000000002',
      jsonb_build_object('size', 1024)
    ),
    'upload/delete cycles cannot refund the five-upload abuse window'
  );
  perform pg_temp.assert_true(
    (
      select count(*)
        from reflab_private.rate_limit_events
       where actor_id = '20000000-0000-0000-0000-000000000002'
         and scope = 'upload_profile'
    ) = 5,
    'successful upload admissions remain in the private ledger after deletion'
  );

  -- DM assets are private, immutable after upload, and guarded by three
  -- operation policies. There is deliberately no browser UPDATE policy.
  perform pg_temp.assert_true(
    exists (
      select 1
      from storage.buckets b
      where b.id = 'message-media'
        and b.public is false
        and b.file_size_limit = 20971520
    ),
    'message-media bucket must be private with a 20 MiB ceiling'
  );

  select count(*)
  into v_count
  from pg_policies p
  where p.schemaname = 'storage'
    and p.tablename = 'objects'
    and p.policyname in (
      'Message participants can upload bounded message media',
      'Message participants can read message media',
      'Message senders can delete own message media'
    );

  perform pg_temp.assert_true(
    v_count = 3,
    'participant-only message-media policies must exist'
  );

  perform pg_temp.assert_true(
    has_function_privilege(
      'authenticated',
      'public.can_upload_message_media(text,text,jsonb)',
      'EXECUTE'
    )
      and not has_function_privilege(
        'anon',
        'public.can_upload_message_media(text,text,jsonb)',
        'EXECUTE'
      ),
    'only authenticated Storage writes may evaluate message-media quota'
  );
  perform pg_temp.assert_true(
    has_function_privilege(
      'authenticated',
      'public.can_delete_message_media(text,text)',
      'EXECUTE'
    )
      and not has_function_privilege(
        'anon',
        'public.can_delete_message_media(text,text)',
        'EXECUTE'
      )
      and (
        select procedure.provolatile = 'v'
          and procedure.prosecdef
          and procedure.proconfig @> array['search_path=""']
          from pg_proc as procedure
         where procedure.oid =
           'public.can_delete_message_media(text,text)'::regprocedure
      ),
    'message-media delete admission is authenticated-only, volatile and fixed-path'
  );

  select pg_get_functiondef(
    'public.can_upload_message_media(text,text,jsonb)'::regprocedure
  ) into v_definition;
  perform pg_temp.assert_true(
    v_definition like '%object.owner_id = caller_uid::text%'
      and v_definition like '%pg_advisory_xact_lock%'
      and v_definition like '%owned_object_count >= 500%'
      and v_definition like '%owned_total_bytes + object_size > 2147483648%'
      and v_definition like '%consume_rate_limit_event%upload_message%'
      and v_definition like '%public.user_blocks%'
      and v_definition like '%account_is_active%',
    'message-media uploads are owner-bound, recipient-active, block-safe and quota-serialized'
  );

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '20000000-0000-4000-8000-000000000010',
      'role', 'authenticated'
    )::text,
    true
  );
  perform set_config(
    'request.jwt.claim.sub',
    '20000000-0000-4000-8000-000000000010',
    true
  );
  perform pg_temp.assert_true(
    not public.can_upload_message_media(
      '21000000-0000-4000-8000-000000000002/'
        || '20000000-0000-4000-8000-000000000010/'
        || '23000000-0000-4000-8000-000000000001.jpg',
      '20000000-0000-4000-8000-000000000010',
      jsonb_build_object('size', 20971521)
    ),
    'message-media helper must reject a file above 20 MiB'
  );
  perform pg_temp.assert_true(
    not public.can_upload_message_media(
      '21000000-0000-4000-8000-000000000002/'
        || '20000000-0000-4000-8000-000000000010/'
        || '23000000-0000-4000-8000-000000000001.jpg',
      '20000000-0000-4000-8000-000000000020',
      jsonb_build_object('size', 1)
    ),
    'message-media helper must reject a mismatched Storage owner'
  );
  perform pg_temp.assert_true(
    not public.can_upload_message_media(
      '21000000-0000-4000-8000-000000000002/'
        || '20000000-0000-4000-8000-000000000010/'
        || '23000000-0000-4000-8000-000000000001.jpg',
      '20000000-0000-4000-8000-000000000010',
      jsonb_build_object('size', 1)
    ),
    'twenty recent orphanable uploads must close the burst window'
  );

  select pg_get_functiondef(
    'reflab_private.enforce_message_write_rate()'::regprocedure
  ) into v_definition;
  perform pg_temp.assert_true(
    v_definition like '%object.owner_id = caller_uid::text%'
      and v_definition like '%storage.filename(new.media_url)%'
      and v_definition like '%reflab:message-media-reference:%'
      and position('reflab:message-media-reference:' in v_definition)
        < position('from storage.objects' in v_definition)
      and position('pg_advisory_xact_lock' in v_definition)
        < position('existing.client_id = new.client_id' in v_definition),
    'send guard locks the media reference before its fresh existence check and rate decision'
  );

  select pg_get_functiondef(
    'public.can_delete_message_media(text,text)'::regprocedure
  ) into v_definition;
  perform pg_temp.assert_true(
    v_definition like '%reflab:message-media-reference:%'
      and v_definition like '%from public.messages%'
      and position('pg_advisory_xact_lock' in v_definition)
        < position('from public.messages' in v_definition),
    'message-media delete admission takes the same object lock before checking references'
  );

  perform pg_temp.assert_true(
    not public.can_delete_message_media(
      '21000000-0000-4000-8000-000000000002/'
        || '20000000-0000-4000-8000-000000000010/'
        || '24000000-0000-4000-8000-000000000001.jpg',
      '20000000-0000-4000-8000-000000000010'
    ),
    'a committed message reference rejects a direct attachment delete token'
  );
  perform pg_temp.assert_true(
    public.can_delete_message_media(
      '21000000-0000-4000-8000-000000000002/'
        || '20000000-0000-4000-8000-000000000010/'
        || '24000000-0000-4000-8000-000000000002.jpg',
      '20000000-0000-4000-8000-000000000010'
    ),
    'an owned unreferenced attachment receives a direct delete token'
  );
  delete from storage.objects
   where bucket_id = 'message-media'
     and name = '21000000-0000-4000-8000-000000000002/'
       || '20000000-0000-4000-8000-000000000010/'
       || '24000000-0000-4000-8000-000000000002.jpg';
  begin
    perform public.send_message(
      '21000000-0000-4000-8000-000000000002'::uuid,
      '20000000-0000-4000-8000-000000000010'::uuid,
      '24000000-0000-4000-8000-000000000002'::uuid,
      null, 'image'::public.message_media_type,
      '21000000-0000-4000-8000-000000000002/'
        || '20000000-0000-4000-8000-000000000010/'
        || '24000000-0000-4000-8000-000000000002.jpg'
    );
    raise exception 'assertion failed: message referenced a delete-first attachment';
  exception when sqlstate '42501' then
    null;
  end;
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.messages
       where sender_id = '20000000-0000-4000-8000-000000000010'
         and client_id = '24000000-0000-4000-8000-000000000002'
    ),
    'delete-first ordering leaves no broken message attachment reference'
  );

  perform pg_temp.assert_true(
    not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'storage'
        and p.tablename = 'objects'
        and p.policyname = 'Message participants can update own message media'
    ),
    'message-media objects must not expose a browser UPDATE policy'
  );

  perform pg_temp.assert_true(
    not has_column_privilege(
      'authenticated',
      'public.notifications',
      'user_id',
      'UPDATE'
    )
      and has_column_privilege(
        'authenticated',
        'public.notifications',
        'read',
        'UPDATE'
      ),
    'browser notification updates must be limited to owner-controlled state'
  );

  select count(*)
    into v_count
    from pg_policies as policy
   where policy.schemaname = 'public'
     and policy.tablename = 'notifications'
     and policy.policyname in (
       'Active users can read own notifications',
       'Active users can update own notifications'
     )
     and coalesce(policy.qual, '') like '%account_accepts_uploads%';
  perform pg_temp.assert_true(
    v_count = 2,
    'notification SELECT and UPDATE RLS must reject deletion-started sessions'
  );

  perform pg_temp.assert_true(
    not has_column_privilege(
      'authenticated',
      'public.profiles',
      'deletion_started_at',
      'UPDATE'
    ),
    'authenticated must not write or clear the account deletion lock'
  );

  perform set_config(
    'request.jwt.claim.sub',
    '20000000-0000-0000-0000-000000000001',
    true
  );

  perform pg_temp.assert_true(
    not public.account_accepts_uploads(
      '20000000-0000-0000-0000-000000000001'::uuid
    ),
    'a deleting account must fail the shared write/upload guard'
  );

  begin
    perform public.get_or_create_conversation(
      '20000000-0000-0000-0000-000000000001'::uuid,
      gen_random_uuid()
    );
    raise exception 'assertion failed: deleting account created a conversation';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    perform public.send_message(
      gen_random_uuid(),
      '20000000-0000-0000-0000-000000000001'::uuid,
      gen_random_uuid(),
      'deleting account write',
      'text'::public.message_media_type,
      null
    );
    raise exception 'assertion failed: deleting account sent a message';
  exception when sqlstate '42501' then
    null;
  end;

  select pg_get_expr(p.polwithcheck, p.polrelid)
  into v_definition
  from pg_policy p
  where p.polrelid = 'storage.objects'::regclass
    and p.polname = 'Message participants can upload bounded message media';

  perform pg_temp.assert_true(
    v_definition like '%can_upload_message_media%owner_id%metadata%',
    'message-media INSERT policy must delegate owner and quota enforcement'
  );

  perform pg_temp.assert_true(
    not public.can_upload_message_media(
      '20000000-0000-0000-0000-000000000099/'
        || '20000000-0000-0000-0000-000000000001/'
        || '20000000-0000-0000-0000-000000000098.jpg',
      '20000000-0000-0000-0000-000000000001',
      jsonb_build_object('size', 1)
    ),
    'message-media helper must reject a deleting account before upload'
  );

  select pg_get_expr(p.polqual, p.polrelid)
  into v_definition
  from pg_policy p
  where p.polrelid = 'storage.objects'::regclass
    and p.polname = 'Message senders can delete own message media';

  perform pg_temp.assert_true(
    v_definition like '%can_delete_message_media%name%owner_id%',
    'message-media DELETE policy delegates to the serialized reference guard'
  );

  begin
    perform public.mark_conversation_read(
      gen_random_uuid(),
      '20000000-0000-0000-0000-000000000002'::uuid,
      statement_timestamp()
    );
    raise exception
      'assertion failed: account A accepted account B as the expected reader';
  exception when sqlstate '42501' then
    null;
  end;

  perform set_config('request.jwt.claim.sub', '', true);

  -- Direct/superuser invocation still exercises the auth.uid() guards. This
  -- catches accidental reliance on the browser role grant alone.
  begin
    perform public.send_message(
      gen_random_uuid(),
      gen_random_uuid(),
      gen_random_uuid(),
      'unauthorized',
      'text'::public.message_media_type,
      null
    );
    raise exception 'assertion failed: send_message accepted a null auth.uid()';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    perform public.mark_conversation_read(
      gen_random_uuid(),
      gen_random_uuid(),
      statement_timestamp()
    );
    raise exception 'assertion failed: mark_conversation_read accepted a null auth.uid()';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;

rollback;
