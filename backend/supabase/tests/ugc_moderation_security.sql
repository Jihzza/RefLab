-- Final UGC/moderation launch contract.
-- Run on a disposable database only after both 20260718103637 and
-- 20260718105035. All fixtures and state changes are rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select plan(142);

-- Stable fixtures do not require matching GoTrue rows. Origin triggers are
-- restored before any browser-role/RPC behaviour is exercised.
set local session_replication_role = replica;

insert into public.profiles (
  id, username, name, photo_url, role, deletion_started_at
)
values
  (
    '61000000-0000-4000-8000-000000000001',
    'ugc_reporter', 'UGC Reporter', null, 'user', null
  ),
  (
    '61000000-0000-4000-8000-000000000002',
    'ugc_target', 'UGC Target', null, 'user', null
  ),
  (
    '61000000-0000-4000-8000-000000000003',
    'ugc_signed_admin', 'Signed Admin', null, 'user', null
  ),
  (
    '61000000-0000-4000-8000-000000000004',
    'ugc_spoofed_admin', 'Spoofed Admin',
    'https://tracker.invalid/avatar.png', 'admin', null
  ),
  (
    '61000000-0000-4000-8000-000000000005',
    'ugc_deleting_admin', 'Deleting Admin', null, 'admin',
    statement_timestamp()
  ),
  (
    '61000000-0000-4000-8000-000000000006',
    'ugc_marker_target', 'Marker Deletion Target', null, 'user',
    statement_timestamp()
  ),
  (
    '61000000-0000-4000-8000-000000000007',
    'ugc_job_target', 'Job Deletion Target', null, 'user', null
  ),
  (
    '61000000-0000-4000-8000-000000000008',
    'ugc_lifecycle_author', 'Lifecycle Author', null, 'user', null
  ),
  (
    '61000000-0000-4000-8000-000000000009',
    'ugc_second_reporter', 'Second Reporter', null, 'user', null
  ),
  (
    '61000000-0000-4000-8000-000000000010',
    'ugc_rate_actor', 'Durable Rate Actor', null, 'user', null
  );

insert into public.account_deletion_jobs (user_id, phase)
values (
  '61000000-0000-4000-8000-000000000007',
  'requested'
);

insert into public.posts (
  id, user_id, content, moderation_state, moderation_updated_at,
  moderation_updated_by, moderation_source_report_id, created_at
)
values
  (
    '62000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000002',
    'Post used for reversible moderation',
    'visible', null, null, null, '2026-07-18 10:00:00+00'
  ),
  (
    '62000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000002',
    'Post whose report evidence survives deletion',
    'visible', null, null, null, '2026-07-18 09:00:00+00'
  ),
  (
    '62000000-0000-4000-8000-000000000003',
    '61000000-0000-4000-8000-000000000001',
    'Reporter owned post',
    'visible', null, null, null, '2026-07-18 08:00:00+00'
  ),
  (
    '62000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000006',
    'Deletion marker must hide this post',
    'visible', null, null, null, '2026-07-18 07:00:00+00'
  ),
  (
    '62000000-0000-4000-8000-000000000005',
    '61000000-0000-4000-8000-000000000007',
    'Deletion job must hide this post',
    'visible', null, null, null, '2026-07-18 06:00:00+00'
  ),
  (
    '62000000-0000-4000-8000-000000000006',
    '61000000-0000-4000-8000-000000000002',
    'Original deleted directly',
    'visible', null, null, null, '2026-07-18 05:00:00+00'
  ),
  (
    '62000000-0000-4000-8000-000000000007',
    '61000000-0000-4000-8000-000000000001',
    null, 'visible', null, null, null, '2026-07-18 04:59:00+00'
  ),
  (
    '62000000-0000-4000-8000-000000000008',
    '61000000-0000-4000-8000-000000000008',
    'Original removed with its author account',
    'visible', null, null, null, '2026-07-18 04:00:00+00'
  ),
  (
    '62000000-0000-4000-8000-000000000009',
    '61000000-0000-4000-8000-000000000001',
    null, 'visible', null, null, null, '2026-07-18 03:59:00+00'
  ),
  (
    '62000000-0000-4000-8000-000000000011',
    '61000000-0000-4000-8000-000000000001',
    'Comment counter regression target',
    'visible', null, null, null, '2026-07-18 03:00:00+00'
  ),
  (
    '62000000-0000-4000-8000-000000000012',
    '61000000-0000-4000-8000-000000000001',
    'Repost counter regression target',
    'visible', null, null, null, '2026-07-18 02:00:00+00'
  );

update public.posts
   set original_post_id = '62000000-0000-4000-8000-000000000006'
 where id = '62000000-0000-4000-8000-000000000007';
update public.posts
   set original_post_id = '62000000-0000-4000-8000-000000000008'
 where id = '62000000-0000-4000-8000-000000000009';

insert into public.post_comments (
  id, post_id, user_id, parent_comment_id, content,
  moderation_state, moderation_updated_at, moderation_updated_by,
  moderation_source_report_id, created_at
)
values
  (
    '63000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000002',
    null, 'Comment used for reversible moderation',
    'visible', null, null, null, '2026-07-18 10:01:00+00'
  ),
  (
    '63000000-0000-4000-8000-000000000002',
    '62000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000002',
    null, 'Comment used for report RPC coverage',
    'visible', null, null, null, '2026-07-18 10:02:00+00'
  ),
  (
    '63000000-0000-4000-8000-000000000003',
    '62000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000006',
    null, 'Marker-deleting author comment',
    'visible', null, null, null, '2026-07-18 07:01:00+00'
  ),
  (
    '63000000-0000-4000-8000-000000000004',
    '62000000-0000-4000-8000-000000000005',
    '61000000-0000-4000-8000-000000000007',
    null, 'Job-deleting author comment',
    'visible', null, null, null, '2026-07-18 06:01:00+00'
  ),
  (
    '63000000-0000-4000-8000-000000000005',
    '62000000-0000-4000-8000-000000000003',
    '61000000-0000-4000-8000-000000000006',
    null, 'Marker-deleting reply parent',
    'visible', null, null, null, '2026-07-18 05:01:00+00'
  ),
  (
    '63000000-0000-4000-8000-000000000006',
    '62000000-0000-4000-8000-000000000003',
    '61000000-0000-4000-8000-000000000007',
    null, 'Job-deleting reply parent',
    'visible', null, null, null, '2026-07-18 05:02:00+00'
  ),
  (
    '63000000-0000-4000-8000-000000000007',
    '62000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000001',
    null, 'Active comment on marker-deleting post author',
    'visible', null, null, null, '2026-07-18 05:03:00+00'
  ),
  (
    '63000000-0000-4000-8000-000000000008',
    '62000000-0000-4000-8000-000000000005',
    '61000000-0000-4000-8000-000000000001',
    null, 'Active comment on job-deleting post author',
    'visible', null, null, null, '2026-07-18 05:04:00+00'
  );

insert into public.post_reports (
  id, reporter_id, post_id, target_snapshot_id, reason_code,
  reason_details, status, review_revision, created_at
)
values (
  '64000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000001',
  'harassment_bullying', 'Moderation fixture', 'pending', 0,
  '2026-07-18 10:03:00+00'
);

insert into public.comment_reports (
  id, reporter_id, comment_id, target_snapshot_id, context_snapshot_id,
  reason_code, reason_details, status, review_revision, created_at
)
values (
  '64000000-0000-4000-8000-000000000002',
  '61000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000001',
  '63000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000001',
  'inappropriate_content', 'Comment moderation fixture', 'pending', 0,
  '2026-07-18 10:04:00+00'
);

insert into public.user_reports (
  id, reporter_id, reported_user_id, target_snapshot_id, reason_code,
  reason_details, status, review_revision, created_at
)
values (
  '64000000-0000-4000-8000-000000000003',
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002',
  '61000000-0000-4000-8000-000000000002',
  'other', 'User moderation fixture', 'pending', 0,
  '2026-07-18 10:05:00+00'
);

insert into public.post_reports (
  id, reporter_id, post_id, target_snapshot_id, reason_code,
  reason_details, status, review_revision, created_at
)
values (
  '64000000-0000-4000-8000-000000000004',
  '61000000-0000-4000-8000-000000000009',
  '62000000-0000-4000-8000-000000000001',
  '62000000-0000-4000-8000-000000000001',
  'spam_scam', 'Same-target concurrency fixture', 'pending', 0,
  '2026-07-18 10:06:00+00'
);

insert into public.conversations (
  id, user_a_id, user_b_id, created_at, updated_at
)
values (
  '65000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002',
  '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
);

insert into public.conversation_participants (
  conversation_id, user_id, last_read_at, created_at
)
values
  (
    '65000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001',
    '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
  ),
  (
    '65000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000002',
    '2026-07-18 11:00:00+00', '2026-07-18 11:00:00+00'
  );

insert into public.messages (
  id, conversation_id, sender_id, client_id, content, media_type,
  media_url, created_at
)
values (
  '65100000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '65100000-0000-4000-8000-000000000001',
  'Deletion-bound message fixture', 'image',
  '65000000-0000-4000-8000-000000000001/'
    || '61000000-0000-4000-8000-000000000001/'
    || '65100000-0000-4000-8000-000000000001.jpg',
  '2026-07-18 11:01:00+00'
);

insert into storage.objects (
  bucket_id, name, owner_id, metadata, created_at, updated_at
)
values (
  'message-media',
  '65000000-0000-4000-8000-000000000001/'
    || '61000000-0000-4000-8000-000000000001/'
    || '65100000-0000-4000-8000-000000000001.jpg',
  '61000000-0000-4000-8000-000000000001',
  jsonb_build_object('size', 1024),
  '2026-07-18 11:01:00+00', '2026-07-18 11:01:00+00'
);

update public.profiles
   set photo_url =
     '61000000-0000-4000-8000-000000000001/avatars/referenced.jpg'
 where id = '61000000-0000-4000-8000-000000000001';
update public.posts
   set media_type = 'image',
       media_url = '61000000-0000-4000-8000-000000000001/referenced.jpg'
 where id = '62000000-0000-4000-8000-000000000003';

insert into storage.objects (
  bucket_id, name, owner_id, metadata, created_at, updated_at
)
values
  (
    'profile-media',
    '61000000-0000-4000-8000-000000000001/avatars/referenced.jpg',
    '61000000-0000-4000-8000-000000000001',
    jsonb_build_object('size', 1024, 'mimetype', 'image/jpeg'),
    '2026-07-18 11:01:00+00', '2026-07-18 11:01:00+00'
  ),
  (
    'profile-media',
    '61000000-0000-4000-8000-000000000001/avatars/orphan.jpg',
    '61000000-0000-4000-8000-000000000001',
    jsonb_build_object('size', 1024, 'mimetype', 'image/jpeg'),
    '2026-07-18 11:01:00+00', '2026-07-18 11:01:00+00'
  ),
  (
    'post-media',
    '61000000-0000-4000-8000-000000000001/referenced.jpg',
    '61000000-0000-4000-8000-000000000001',
    jsonb_build_object('size', 1024, 'mimetype', 'image/jpeg'),
    '2026-07-18 11:01:00+00', '2026-07-18 11:01:00+00'
  ),
  (
    'post-media',
    '61000000-0000-4000-8000-000000000001/orphan.jpg',
    '61000000-0000-4000-8000-000000000001',
    jsonb_build_object('size', 1024, 'mimetype', 'image/jpeg'),
    '2026-07-18 11:01:00+00', '2026-07-18 11:01:00+00'
  );

insert into public.notifications (
  id, user_id, actor_id, type, title, message, read,
  dismissed_permanently, created_at, updated_at
)
values (
  '65200000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002',
  'new_follower', 'Fixture', 'Notification read/update boundary', false,
  false, '2026-07-18 11:02:00+00', '2026-07-18 11:02:00+00'
);

set local session_replication_role = origin;

-- The restrictive phase removes every old browser mutation/read shortcut.
select ok(
  not has_table_privilege('authenticated', 'public.posts', 'INSERT')
    and not has_table_privilege('authenticated', 'public.posts', 'UPDATE'),
  'posts must be created and edited only through the reviewed RPC contract'
);
select ok(
  not has_table_privilege('authenticated', 'public.post_comments', 'INSERT')
    and not has_table_privilege('authenticated', 'public.post_comments', 'UPDATE'),
  'comments must be created and edited only through the reviewed RPC contract'
);
select ok(
  not has_table_privilege('authenticated', 'public.post_reports', 'SELECT')
    and not has_table_privilege('authenticated', 'public.post_reports', 'INSERT')
    and not has_table_privilege('authenticated', 'public.comment_reports', 'SELECT')
    and not has_table_privilege('authenticated', 'public.user_reports', 'SELECT'),
  'raw moderation evidence tables must remain private from browser roles'
);

select hasnt_function(
  'public',
  'create_social_post',
  array['uuid', 'text', 'post_media_type', 'text', 'uuid'],
  'the non-idempotent five-argument post compatibility wrapper is removed'
);

select has_function(
  'public',
  'create_social_post',
  array['uuid', 'uuid', 'text', 'post_media_type', 'text', 'uuid'],
  'the canonical six-argument idempotent post RPC remains available'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_social_post(uuid,uuid,text,public.post_media_type,text,uuid)',
    'EXECUTE'
  )
    and has_function_privilege(
      'authenticated',
    'public.report_social_post(uuid,uuid,text,text)',
    'EXECUTE'
  )
    and has_function_privilege(
      'authenticated',
      'public.admin_list_ugc_reports(text,integer,timestamptz,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.admin_list_ugc_reports(text,integer,timestamptz,uuid)',
      'EXECUTE'
    ),
  'authenticated users reach bounded RPCs while anonymous users cannot'
);

select ok(
  coalesce((
    select procedure.prosecdef
      and procedure.proconfig @> array['search_path=""']
      and position('app_metadata' in pg_get_functiondef(procedure.oid)) > 0
      and position('user_metadata' in pg_get_functiondef(procedure.oid)) = 0
      and position('profiles.role' in pg_get_functiondef(procedure.oid)) = 0
    from pg_proc as procedure
    where procedure.oid =
      'public.admin_list_ugc_reports(text,integer,timestamptz,uuid)'::regprocedure
  ), false),
  'moderation listing must use a fixed-path definer and signed app_metadata only'
);
select ok(
  coalesce((
    select procedure.prosecdef
      and procedure.proconfig @> array['search_path=""']
      and position('app_metadata' in pg_get_functiondef(procedure.oid)) > 0
      and position('user_metadata' in pg_get_functiondef(procedure.oid)) = 0
      and position('profiles.role' in pg_get_functiondef(procedure.oid)) = 0
    from pg_proc as procedure
    where procedure.oid =
      'public.admin_review_ugc_report(text,uuid,uuid,bigint,text,text)'::regprocedure
  ), false),
  'moderation review must use a fixed-path definer and signed app_metadata only'
);
select ok(
  position(
    'moderation_state'
    in pg_get_functiondef(
      'reflab_private.enforce_report_reason_write()'::regprocedure
    )
  ) = 0
    and position(
      'reason_details'
      in pg_get_functiondef(
        'reflab_private.enforce_report_reason_write()'::regprocedure
      )
    ) > 0,
  'the shared report trigger references only fields common to all report tables'
);
select ok(
  position(
    'pg_advisory_xact_lock'
    in pg_get_functiondef(
      'public.admin_review_ugc_report(text,uuid,uuid,bigint,text,text)'::regprocedure
    )
  ) > 0
    and position(
      'reflab:ugc-moderation:'
      in pg_get_functiondef(
        'public.admin_review_ugc_report(text,uuid,uuid,bigint,text,text)'::regprocedure
      )
    ) > 0,
  'moderation reviews serialize by report type and immutable target snapshot'
);
select ok(
  to_regprocedure(
    'public.admin_review_ugc_report(text,uuid,bigint,text,text)'
  ) is null,
  'the reviewer-implicit moderation overload is removed after cutover'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'reflab_private.account_is_active(uuid)',
    'EXECUTE'
  )
    and position(
      'account_deletion_jobs'
      in pg_get_functiondef(
        'reflab_private.account_is_active(uuid)'::regprocedure
      )
    ) > 0,
  'the private target-active helper covers the durable deletion job signal'
);
select ok(
  exists (
    select 1
      from pg_constraint as constraint_row
     where constraint_row.conrelid = 'public.posts'::regclass
       and constraint_row.conname = 'posts_original_post_id_fkey'
       and constraint_row.confdeltype = 'c'
  ),
  'pure reposts cascade with their original instead of becoming empty posts'
);
select ok(
  (
    select count(*)
      from pg_constraint as constraint_row
      join pg_attribute as attribute_row
        on attribute_row.attrelid = constraint_row.conrelid
       and attribute_row.attnum = constraint_row.conkey[1]
     where constraint_row.conrelid in (
       'public.post_reports'::regclass,
       'public.comment_reports'::regclass,
       'public.user_reports'::regclass
     )
       and constraint_row.contype = 'f'
       and attribute_row.attname = 'reporter_id'
       and constraint_row.confrelid = 'public.profiles'::regclass
       and constraint_row.confdeltype = 'n'
  ) = 3,
  'all report authors become nullable provenance instead of cascading evidence'
);
select ok(
  position(
    'for update'
    in pg_get_functiondef(
      'reflab_private.recompute_post_comment_count(uuid)'::regprocedure
    )
  ) > 0
    and position(
      'for update'
      in pg_get_functiondef(
        'reflab_private.recompute_post_repost_count(uuid)'::regprocedure
      )
    ) > 0,
  'comment and repost counters lock their parent before taking a fresh count snapshot'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'reflab_private.rate_limit_events',
    'SELECT'
  )
    and not has_table_privilege(
      'authenticated',
      'reflab_private.rate_limit_events',
      'DELETE'
    )
    and not has_function_privilege(
      'authenticated',
      'reflab_private.consume_rate_limit_event(uuid,text,integer,interval)',
      'EXECUTE'
    ),
  'durable abuse-window events are private and cannot be erased by browsers'
);
select ok(
  position(
    'consume_rate_limit_event'
    in pg_get_functiondef(
      'reflab_private.enforce_ugc_rate_limit()'::regprocedure
    )
  ) > 0
    and position(
      'consume_rate_limit_event'
      in pg_get_functiondef(
        'reflab_private.enforce_social_interaction_write()'::regprocedure
      )
    ) > 0,
  'UGC writes and toggleable interactions consume the non-deletable rate ledger'
);
select ok(
  exists (
    select 1 from pg_indexes
     where schemaname = 'public'
       and tablename = 'notifications'
       and indexname = 'notifications_relational_event_uidx'
       and indexdef ilike 'create unique index%'
       and indexdef like '%COALESCE(reference_id%'
       and indexdef like '%mentioned_in_comment%'
  )
    and position(
      'account_is_active'
      in pg_get_functiondef(
        'public.create_notification(uuid,uuid,text,text,text,uuid)'::regprocedure
      )
    ) > 0
    and position(
      'public.user_blocks'
      in pg_get_functiondef(
        'public.create_notification(uuid,uuid,text,text,text,uuid)'::regprocedure
      )
    ) > 0
    and position(
      'on conflict'
      in pg_get_functiondef(
        'public.create_notification(uuid,uuid,text,text,text,uuid)'::regprocedure
      )
    ) > 0,
  'relational notifications have a durable uniqueness boundary'
);

-- A profiles.role value and spoofed user_metadata claim never confer admin.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '61000000-0000-4000-8000-000000000004',
    'role', 'authenticated',
    'user_metadata', json_build_object('role', 'admin'),
    'app_metadata', json_build_object('role', 'user')
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000004',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.admin_list_ugc_reports(null, 50, null, null)$$,
  '42501', null,
  'user-editable metadata and profiles.role cannot open the moderation queue'
);
select throws_ok(
  $$select public.admin_review_ugc_report(
      'post', '64000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000004', 0,
      'dismissed', 'spoof attempt'
    )$$,
  '42501', null,
  'user-editable metadata cannot action a report'
);
select throws_ok(
  $$select count(*) from public.post_reports$$,
  '42501', null,
  'a normal browser session cannot directly inspect report evidence'
);

reset role;

-- Reporter-bound RPCs are idempotent and reject self-reporting or viewer-ID
-- spoofing even though their implementations are SECURITY DEFINER.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '61000000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'app_metadata', json_build_object('role', 'user')
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select ok(
  (public.create_social_post(
    '61000000-0000-4000-8000-000000000001',
    'Normal RPC post survives the moderation-default gate',
    'text', null, null
  ) ->> 'id')::uuid is not null,
  'a normal authenticated user can create a default-visible post through RPC'
);
select is(
  public.create_social_post(
    '61000000-0000-4000-8000-000000000001',
    '66000000-0000-4000-8000-000000000001',
    'Idempotent post response-loss fixture', 'text', null, null
  ) ->> 'id',
  public.create_social_post(
    '61000000-0000-4000-8000-000000000001',
    '66000000-0000-4000-8000-000000000001',
    'Idempotent post response-loss fixture', 'text', null, null
  ) ->> 'id',
  'the canonical six-argument RPC executes and reuses a repeated operation ID'
);
select is(
  (select count(*) from public.posts
    where user_id = '61000000-0000-4000-8000-000000000001'
      and client_id = '66000000-0000-4000-8000-000000000001'),
  1::bigint,
  'response-loss retry creates exactly one post'
);
select ok(
  public.create_social_comment(
    '61000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000003',
    'Normal RPC comment survives the moderation-default gate',
    null
  ) is not null,
  'a normal authenticated user can create a default-visible comment through RPC'
);

-- Deleting each accepted post cannot refund the abuse budget. Twenty
-- create/delete cycles fill the durable window and the next create is denied.
select set_config('request.jwt.claims', json_build_object('sub', '61000000-0000-4000-8000-000000000010', 'role', 'authenticated', 'app_metadata', json_build_object('role', 'user'))::text, true);
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000010', true);
do $durable_post_rate$
declare
  created_post_id uuid;
  iteration integer;
begin
  for iteration in 1..20 loop
    created_post_id := (
      public.create_social_post(
        '61000000-0000-4000-8000-000000000010',
        'durable rate create/delete cycle ' || iteration::text,
        'text', null, null
      ) ->> 'id'
    )::uuid;
    delete from public.posts where id = created_post_id;
  end loop;

  begin
    perform public.create_social_post(
      '61000000-0000-4000-8000-000000000010',
      'must be rate limited after deleted rows', 'text', null, null
    );
    raise exception 'durable post rate limit was bypassed' using errcode = 'XX000';
  exception when sqlstate 'P0001' then
    null;
  end;
end;
$durable_post_rate$;
select is(
  (select count(*) from public.posts
    where user_id = '61000000-0000-4000-8000-000000000010'),
  0::bigint,
  'source rows are gone while their recent-write budget remains consumed'
);
select set_config('request.jwt.claims', json_build_object('sub', '61000000-0000-4000-8000-000000000001', 'role', 'authenticated', 'app_metadata', json_build_object('role', 'user'))::text, true);
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.create_social_post(
      '61000000-0000-4000-8000-000000000001', null, 'text', null,
      '62000000-0000-4000-8000-000000000004'
    )$$,
  '42501', null,
  'a known post ID cannot repost an author with a deletion marker'
);
select throws_ok(
  $$select public.create_social_post(
      '61000000-0000-4000-8000-000000000001', null, 'text', null,
      '62000000-0000-4000-8000-000000000005'
    )$$,
  '42501', null,
  'a known post ID cannot repost an author with a durable deletion job'
);
select throws_ok(
  $$select public.create_social_comment(
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000004',
      'known-id marker comment attempt', null
    )$$,
  '42501', null,
  'a known post ID cannot comment on a marker-deleting author'
);
select throws_ok(
  $$select public.create_social_comment(
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000005',
      'known-id job comment attempt', null
    )$$,
  '42501', null,
  'a known post ID cannot comment on a job-deleting author'
);
select throws_ok(
  $$select public.create_social_comment(
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000003',
      'known-id marker reply attempt',
      '63000000-0000-4000-8000-000000000005'
    )$$,
  '42501', null,
  'a known comment ID cannot reply to a marker-deleting author'
);
select throws_ok(
  $$select public.create_social_comment(
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000003',
      'known-id job reply attempt',
      '63000000-0000-4000-8000-000000000006'
    )$$,
  '42501', null,
  'a known comment ID cannot reply to a job-deleting author'
);
select throws_ok(
  $$insert into public.post_likes (post_id, user_id) values
      ('62000000-0000-4000-8000-000000000004',
       '61000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'a known ID cannot like a marker-deleting post author'
);
select throws_ok(
  $$insert into public.post_likes (post_id, user_id) values
      ('62000000-0000-4000-8000-000000000005',
       '61000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'a known ID cannot like a job-deleting post author'
);
select throws_ok(
  $$insert into public.post_saves (post_id, user_id) values
      ('62000000-0000-4000-8000-000000000004',
       '61000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'a known ID cannot save a marker-deleting post author'
);
select throws_ok(
  $$insert into public.post_saves (post_id, user_id) values
      ('62000000-0000-4000-8000-000000000005',
       '61000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'a known ID cannot save a job-deleting post author'
);
select throws_ok(
  $$insert into public.comment_likes (comment_id, user_id) values
      ('63000000-0000-4000-8000-000000000005',
       '61000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'comment likes reject a marker-deleting comment author'
);
select throws_ok(
  $$insert into public.comment_likes (comment_id, user_id) values
      ('63000000-0000-4000-8000-000000000006',
       '61000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'comment likes reject a job-deleting comment author'
);
select throws_ok(
  $$insert into public.comment_likes (comment_id, user_id) values
      ('63000000-0000-4000-8000-000000000007',
       '61000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'comment likes reject an active comment on a marker-deleting post author'
);
select throws_ok(
  $$insert into public.comment_likes (comment_id, user_id) values
      ('63000000-0000-4000-8000-000000000008',
       '61000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'comment likes reject an active comment on a job-deleting post author'
);
select is(
  (
    select count(*)
      from public.notifications
     where actor_id = '61000000-0000-4000-8000-000000000001'
       and reference_id in (
         '62000000-0000-4000-8000-000000000004',
         '62000000-0000-4000-8000-000000000005',
         '63000000-0000-4000-8000-000000000005',
         '63000000-0000-4000-8000-000000000006',
         '63000000-0000-4000-8000-000000000007',
         '63000000-0000-4000-8000-000000000008'
       )
  ),
  0::bigint,
  'rejected interactions create no notification side effect'
);

do $relational_notification_cycles$
declare
  cycle integer;
  created_comment_id uuid;
begin
  for cycle in 1..10 loop
    insert into public.post_likes (post_id, user_id)
    values (
      '62000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000001'
    );
    delete from public.post_likes
     where post_id = '62000000-0000-4000-8000-000000000001'
       and user_id = '61000000-0000-4000-8000-000000000001';

    insert into public.user_follows (follower_id, following_id)
    values (
      '61000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000002'
    );
    delete from public.user_follows
     where follower_id = '61000000-0000-4000-8000-000000000001'
       and following_id = '61000000-0000-4000-8000-000000000002';

    created_comment_id := public.create_social_comment(
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      'coalesced comment cycle ' || cycle::text,
      null
    );
    delete from public.post_comments where id = created_comment_id;
  end loop;
end;
$relational_notification_cycles$;
reset role;
select is(
  (select count(*) from public.notifications
    where user_id = '61000000-0000-4000-8000-000000000002'
      and actor_id = '61000000-0000-4000-8000-000000000001'
      and type = 'liked_post'
      and reference_id = '62000000-0000-4000-8000-000000000001'),
  1::bigint,
  'ten like/unlike cycles coalesce into one relational notification'
);
select is(
  (select count(*) from public.notifications
    where user_id = '61000000-0000-4000-8000-000000000002'
      and actor_id = '61000000-0000-4000-8000-000000000001'
      and type = 'new_follower'
      and reference_id is null),
  1::bigint,
  'ten follow/unfollow cycles coalesce even with a NULL reference'
);
select is(
  (select count(*) from public.notifications
    where user_id = '61000000-0000-4000-8000-000000000002'
      and actor_id = '61000000-0000-4000-8000-000000000001'
      and type = 'comment_on_post'
      and reference_id = '62000000-0000-4000-8000-000000000001'),
  1::bigint,
  'recreated comments reopen one bounded post/actor notification row'
);

-- Exercise the trigger itself with owner privileges while retaining a normal
-- user's JWT. The production browser cannot reach this raw insert after cutover.
reset role;
select throws_ok(
  $$insert into public.posts (
      id, user_id, content, moderation_state, moderation_updated_at,
      moderation_updated_by, moderation_source_report_id
    ) values (
      '62000000-0000-4000-8000-000000000010',
      '61000000-0000-4000-8000-000000000001',
      'forged hidden post', 'hidden', statement_timestamp(),
      '61000000-0000-4000-8000-000000000001',
      '64000000-0000-4000-8000-000000000001'
    )$$,
  '42501', null,
  'a normal JWT cannot forge post moderation metadata'
);
select throws_ok(
  $$insert into public.post_comments (
      id, post_id, user_id, content, moderation_state,
      moderation_updated_at, moderation_updated_by,
      moderation_source_report_id
    ) values (
      '63000000-0000-4000-8000-000000000010',
      '62000000-0000-4000-8000-000000000003',
      '61000000-0000-4000-8000-000000000001',
      'forged hidden comment', 'hidden', statement_timestamp(),
      '61000000-0000-4000-8000-000000000001',
      '64000000-0000-4000-8000-000000000002'
    )$$,
  '42501', null,
  'a normal JWT cannot forge comment moderation metadata'
);
set local role authenticated;

select ok(
  (select created from public.report_social_post(
    '61000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000002',
    'spam_scam', 'first post report'
  )),
  'first post report is created'
);
select ok(
  not (select created from public.report_social_post(
    '61000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000002',
    'spam_scam', 'idempotent retry'
  )),
  'post report retry returns the existing report'
);
select ok(
  (select created from public.report_social_comment(
    '61000000-0000-4000-8000-000000000001',
    '63000000-0000-4000-8000-000000000002',
    'spam_scam', 'comment report'
  )),
  'comment reports use the same bounded RPC path'
);
select ok(
  (select created from public.report_social_user(
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000004',
    'other', 'user report'
  )),
  'user reports use the same bounded RPC path'
);

select throws_ok(
  $$select * from public.report_social_post(
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000003',
      'spam_scam', null
    )$$,
  '22023', null,
  'a user cannot report their own post'
);
select throws_ok(
  $$select * from public.report_social_user(
      '61000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000001',
      'spam_scam', null
    )$$,
  '22023', null,
  'a user cannot report their own account'
);
select throws_ok(
  $$select public.get_social_feed(
      '61000000-0000-4000-8000-000000000004', null, null, 20
    )$$,
  '42501', null,
  'a caller-supplied feed viewer ID cannot spoof another account'
);
select is(
  (
    select count(*)
      from public.search_users(
        'ugc_deleting_admin',
        '61000000-0000-4000-8000-000000000001',
        20
      )
  ),
  0::bigint,
  'messaging user search excludes deletion-started targets'
);
select ok(
  (
    select searched.photo_url is null
      from public.search_users(
        'ugc_spoofed_admin',
        '61000000-0000-4000-8000-000000000001',
        20
      ) as searched
     limit 1
  ),
  'messaging user search never returns an arbitrary legacy avatar URL'
);

select is(
  (
    select count(*)
      from public.profiles
     where id in (
       '61000000-0000-4000-8000-000000000006',
       '61000000-0000-4000-8000-000000000007'
     )
  ),
  0::bigint,
  'direct profile RLS hides both marker-only and durable-job deletion targets'
);
select is(
  (
    select count(*)
      from public.posts
     where id in (
       '62000000-0000-4000-8000-000000000004',
       '62000000-0000-4000-8000-000000000005'
     )
  ),
  0::bigint,
  'direct post RLS hides authors with either durable deletion signal'
);
select is(
  (
    select count(*) from public.get_public_profile_view(
      '61000000-0000-4000-8000-000000000001', 'ugc_marker_target'
    )
  ) + (
    select count(*) from public.get_public_profile_view(
      '61000000-0000-4000-8000-000000000001', 'ugc_job_target'
    )
  ),
  0::bigint,
  'profile RPCs hide marker and job-only deletion targets'
);
select is(
  json_array_length(public.get_profile_feed(
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000006', null, null, 20
  )) + json_array_length(public.get_profile_feed(
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000007', null, null, 20
  )),
  0,
  'profile-feed RPCs hide both forms of deleting target'
);
select ok(
  not exists (
    select 1
      from json_array_elements(public.get_social_feed(
        '61000000-0000-4000-8000-000000000001', null, null, 50
      )) as item
     where item ->> 'id' in (
       '62000000-0000-4000-8000-000000000004',
       '62000000-0000-4000-8000-000000000005'
     )
  ),
  'the global feed omits posts from marker and job-only deletion targets'
);
select ok(
  public.get_post_by_id(
    '62000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000001'
  ) is null
  and public.get_post_by_id(
    '62000000-0000-4000-8000-000000000005',
    '61000000-0000-4000-8000-000000000001'
  ) is null,
  'post-detail RPCs return null for both forms of deleting author'
);
select is(
  json_array_length(public.get_post_comments(
    '62000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000001'
  )) + json_array_length(public.get_post_comments(
    '62000000-0000-4000-8000-000000000005',
    '61000000-0000-4000-8000-000000000001'
  )),
  0,
  'comment RPCs reveal no thread for marker or job-only deleting authors'
);

reset role;

-- Only a signed app_metadata admin can review. Content actions are concrete,
-- reversible soft-hides and optimistic revisions prevent lost updates.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '61000000-0000-4000-8000-000000000003',
    'role', 'authenticated',
    'app_metadata', json_build_object('role', 'admin')
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000003',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.admin_review_ugc_report(
      'post', '64000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000004', 0,
      'actioned', 'cross-account queued review'
    )$$,
  '42501', null,
  'an account A admin session rejects a review queued for account B'
);
select is(
  public.admin_review_ugc_report(
    'post', '64000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000003', 0,
    'actioned', 'Hide while reviewed'
  ),
  1::bigint,
  'actioning a post report advances its optimistic revision'
);
select throws_ok(
  $$select public.admin_review_ugc_report(
      'post', '64000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000003', 0,
      'dismissed', 'stale moderator write'
    )$$,
  '40001', null,
  'a stale moderator revision is rejected'
);
select is(
  public.admin_review_ugc_report(
    'post', '64000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000003', 0,
    'actioned', 'Second report for the same target'
  ),
  1::bigint,
  'a second report for the same post can independently action the target'
);
select is(
  public.admin_review_ugc_report(
    'comment', '64000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000003', 0,
    'actioned', 'Hide comment while reviewed'
  ),
  1::bigint,
  'actioning a comment report advances its optimistic revision'
);
select throws_ok(
  $$select public.admin_review_ugc_report(
      'user', '64000000-0000-4000-8000-000000000003',
      '61000000-0000-4000-8000-000000000003', 0,
      'actioned', 'unsupported account action'
    )$$,
  '0A000', null,
  'user reports cannot pretend to enforce an absent suspension workflow'
);

reset role;
select is(
  (select moderation_state::text from public.posts
    where id = '62000000-0000-4000-8000-000000000001'),
  'hidden',
  'an actioned post report soft-hides its target'
);
select is(
  (select moderation_state::text from public.post_comments
    where id = '63000000-0000-4000-8000-000000000001'),
  'hidden',
  'an actioned comment report soft-hides its target'
);

-- The authenticated read surfaces omit hidden content.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '61000000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'app_metadata', json_build_object('role', 'user')
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;
select ok(
  not exists (
    select 1
      from json_array_elements(public.get_social_feed(
        '61000000-0000-4000-8000-000000000001', null, null, 50
      )) as item
     where item ->> 'id' = '62000000-0000-4000-8000-000000000001'
  ),
  'soft-hidden posts are absent from the feed RPC'
);
select is(
  json_array_length(public.get_post_comments(
    '62000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  )),
  1,
  'soft-hidden comments are absent from the comments RPC'
);
reset role;

-- Clearing the final actioned report restores visibility.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '61000000-0000-4000-8000-000000000003',
    'role', 'authenticated',
    'app_metadata', json_build_object('role', 'admin')
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000003',
  true
);
set local role authenticated;
select is(
  public.admin_review_ugc_report(
    'post', '64000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000003', 1,
    'dismissed', 'Another actioned report still controls visibility'
  ),
  2::bigint,
  'dismissing one of two post actions advances only that report revision'
);
select is(
  (select moderation_state::text from public.posts
    where id = '62000000-0000-4000-8000-000000000001'),
  'hidden',
  'dismissing one report cannot restore a target with another actioned report'
);
select is(
  public.admin_review_ugc_report(
    'post', '64000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000003', 1,
    'dismissed', 'Final action cleared'
  ),
  2::bigint,
  'dismissing the final actioned report advances its own revision'
);
select is(
  public.admin_review_ugc_report(
    'comment', '64000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000003', 1,
    'dismissed', 'Comment restored after review'
  ),
  2::bigint,
  'dismissing the final comment action advances the revision again'
);
reset role;
select is(
  (select moderation_state::text from public.posts
    where id = '62000000-0000-4000-8000-000000000001'),
  'visible',
  'post visibility is restored after the final action is cleared'
);
select is(
  (select moderation_state::text from public.post_comments
    where id = '63000000-0000-4000-8000-000000000001'),
  'visible',
  'comment visibility is restored after the final action is cleared'
);

-- A deleted target nulls only the live FK; immutable report evidence remains.
select set_config('request.jwt.claims', '{}'::json::text, true);
select set_config('request.jwt.claim.sub', '', true);
delete from public.posts
 where id = '62000000-0000-4000-8000-000000000002';
select ok(
  exists (
    select 1
      from public.post_reports
     where reporter_id = '61000000-0000-4000-8000-000000000001'
       and target_snapshot_id = '62000000-0000-4000-8000-000000000002'
       and post_id is null
  ),
  'post-report evidence survives target deletion with its snapshot ID'
);
delete from public.post_comments
 where id = '63000000-0000-4000-8000-000000000002';
select ok(
  exists (
    select 1
      from public.comment_reports
     where reporter_id = '61000000-0000-4000-8000-000000000001'
       and target_snapshot_id = '63000000-0000-4000-8000-000000000002'
       and context_snapshot_id = '62000000-0000-4000-8000-000000000001'
       and comment_id is null
  ),
  'comment-report evidence survives target deletion with both snapshot IDs'
);
delete from public.profiles
 where id = '61000000-0000-4000-8000-000000000004';
select ok(
  exists (
    select 1
      from public.user_reports
     where reporter_id = '61000000-0000-4000-8000-000000000001'
       and target_snapshot_id = '61000000-0000-4000-8000-000000000004'
       and reported_user_id is null
  ),
  'user-report evidence survives target profile deletion with its snapshot ID'
);

-- Counters reflect only effectively visible rows. Hiding a parent excludes
-- its visible replies, while deleting hidden/cascaded rows cannot underflow.
insert into public.post_comments (
  id, post_id, user_id, parent_comment_id, content, created_at
)
values
  ('63000000-0000-4000-8000-000000000011', '62000000-0000-4000-8000-000000000011', '61000000-0000-4000-8000-000000000008', null, 'Counter parent', '2026-07-18 12:01:00+00'),
  ('63000000-0000-4000-8000-000000000012', '62000000-0000-4000-8000-000000000011', '61000000-0000-4000-8000-000000000008', '63000000-0000-4000-8000-000000000011', 'Counter reply one', '2026-07-18 12:02:00+00'),
  ('63000000-0000-4000-8000-000000000013', '62000000-0000-4000-8000-000000000011', '61000000-0000-4000-8000-000000000008', '63000000-0000-4000-8000-000000000011', 'Counter reply two', '2026-07-18 12:03:00+00'),
  ('63000000-0000-4000-8000-000000000014', '62000000-0000-4000-8000-000000000011', '61000000-0000-4000-8000-000000000008', '63000000-0000-4000-8000-000000000011', 'Counter reply three', '2026-07-18 12:04:00+00'),
  ('63000000-0000-4000-8000-000000000015', '62000000-0000-4000-8000-000000000011', '61000000-0000-4000-8000-000000000001', null, 'Independent visible comment', '2026-07-18 12:05:00+00');
select is((select comment_count from public.posts where id = '62000000-0000-4000-8000-000000000011'), 5, 'visible parent, replies and independent root are counted');

insert into public.posts (id, user_id, content, original_post_id, created_at)
values ('62000000-0000-4000-8000-000000000013', '61000000-0000-4000-8000-000000000008', null, '62000000-0000-4000-8000-000000000012', '2026-07-18 12:06:00+00');
select is((select repost_count from public.posts where id = '62000000-0000-4000-8000-000000000012'), 1, 'visible repost is counted');

select set_config('request.jwt.claims', json_build_object('sub', '61000000-0000-4000-8000-000000000003', 'role', 'authenticated', 'app_metadata', json_build_object('role', 'admin'))::text, true);
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
update public.post_comments set moderation_state = 'hidden', moderation_updated_at = statement_timestamp(), moderation_updated_by = '61000000-0000-4000-8000-000000000003', moderation_source_report_id = '64000000-0000-4000-8000-000000000002' where id = '63000000-0000-4000-8000-000000000011';
select is((select comment_count from public.posts where id = '62000000-0000-4000-8000-000000000011'), 1, 'hidden parent and its replies are excluded');
update public.post_comments set moderation_state = 'visible', moderation_updated_at = null, moderation_updated_by = null, moderation_source_report_id = null where id = '63000000-0000-4000-8000-000000000011';
select is((select comment_count from public.posts where id = '62000000-0000-4000-8000-000000000011'), 5, 'restored parent restores visible replies');
update public.post_comments set moderation_state = 'hidden', moderation_updated_at = statement_timestamp(), moderation_updated_by = '61000000-0000-4000-8000-000000000003', moderation_source_report_id = '64000000-0000-4000-8000-000000000002' where id = '63000000-0000-4000-8000-000000000011';
update public.posts set moderation_state = 'hidden', moderation_updated_at = statement_timestamp(), moderation_updated_by = '61000000-0000-4000-8000-000000000003', moderation_source_report_id = '64000000-0000-4000-8000-000000000001' where id = '62000000-0000-4000-8000-000000000013';
select is((select repost_count from public.posts where id = '62000000-0000-4000-8000-000000000012'), 0, 'hidden repost is excluded');
update public.posts set moderation_state = 'visible', moderation_updated_at = null, moderation_updated_by = null, moderation_source_report_id = null where id = '62000000-0000-4000-8000-000000000013';
select is((select repost_count from public.posts where id = '62000000-0000-4000-8000-000000000012'), 1, 'restored repost is counted again');
update public.posts set moderation_state = 'hidden', moderation_updated_at = statement_timestamp(), moderation_updated_by = '61000000-0000-4000-8000-000000000003', moderation_source_report_id = '64000000-0000-4000-8000-000000000001' where id = '62000000-0000-4000-8000-000000000013';

select set_config('request.jwt.claims', '{}'::json::text, true);
select set_config('request.jwt.claim.sub', '', true);
delete from public.posts where id = '62000000-0000-4000-8000-000000000013';
select is((select repost_count from public.posts where id = '62000000-0000-4000-8000-000000000012'), 0, 'deleting hidden repost cannot underflow');
insert into public.posts (id, user_id, content, original_post_id, created_at)
values ('62000000-0000-4000-8000-000000000014', '61000000-0000-4000-8000-000000000008', null, '62000000-0000-4000-8000-000000000012', '2026-07-18 12:07:00+00');

delete from public.posts
 where id = '62000000-0000-4000-8000-000000000006';
select is(
  (
    select count(*) from public.posts
     where id in (
       '62000000-0000-4000-8000-000000000006',
       '62000000-0000-4000-8000-000000000007'
     )
  ),
  0::bigint,
  'deleting an original cascades its contentless repost'
);
delete from public.profiles
 where id = '61000000-0000-4000-8000-000000000008';
select is((select comment_count from public.posts where id = '62000000-0000-4000-8000-000000000011'), 1, 'account cascade preserves the independent visible comment count');
select is((select repost_count from public.posts where id = '62000000-0000-4000-8000-000000000012'), 0, 'account cascade removes the final visible repost count');
select is(
  (
    select count(*) from public.posts
     where id in (
       '62000000-0000-4000-8000-000000000008',
       '62000000-0000-4000-8000-000000000009'
     )
  ),
  0::bigint,
  'author account deletion cascades originals and dependent reposts coherently'
);

-- Reporter deletion keeps the private evidence row and active action. The
-- evidence remains reviewable after reporter provenance becomes NULL.
select set_config('request.jwt.claims', json_build_object('sub', '61000000-0000-4000-8000-000000000003', 'role', 'authenticated', 'app_metadata', json_build_object('role', 'admin'))::text, true);
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select is(
  public.admin_review_ugc_report(
    'post', '64000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000003', 2,
    'actioned', 'Reporter deletion evidence fixture'
  ),
  3::bigint,
  'a report is actioned before its reporter account is removed'
);
reset role;
select set_config('request.jwt.claims', '{}'::json::text, true);
select set_config('request.jwt.claim.sub', '', true);
delete from public.profiles
 where id = '61000000-0000-4000-8000-000000000009';
select ok(
  exists (
    select 1 from public.post_reports
     where id = '64000000-0000-4000-8000-000000000004'
       and reporter_id is null
       and post_id = '62000000-0000-4000-8000-000000000001'
       and target_snapshot_id = '62000000-0000-4000-8000-000000000001'
       and status = 'actioned'
       and review_revision = 3
  ),
  'reporter deletion preserves the actioned report and target evidence'
);
select ok(
  exists (
    select 1 from public.posts
     where id = '62000000-0000-4000-8000-000000000001'
       and moderation_state = 'hidden'
       and moderation_source_report_id = '64000000-0000-4000-8000-000000000004'
  ),
  'reporter deletion preserves the moderation action on its live target'
);

select set_config('request.jwt.claims', json_build_object('sub', '61000000-0000-4000-8000-000000000003', 'role', 'authenticated', 'app_metadata', json_build_object('role', 'admin'))::text, true);
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select is(
  public.admin_review_ugc_report(
    'post', '64000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000003', 3,
    'dismissed', 'Reporter removed; action explicitly cleared'
  ),
  4::bigint,
  'moderation evidence remains operable after reporter deletion'
);
reset role;
select set_config('request.jwt.claims', '{}'::json::text, true);
select set_config('request.jwt.claim.sub', '', true);

-- Queue keyset pagination must not duplicate or skip a 101-row status slice.
set local session_replication_role = replica;
insert into public.post_reports (
  id, reporter_id, post_id, target_snapshot_id, reason_code,
  reason_details, status, review_revision, created_at
)
select
  gen_random_uuid(),
  '61000000-0000-4000-8000-000000000001'::uuid,
  '62000000-0000-4000-8000-000000000001'::uuid,
  '62000000-0000-4000-8000-000000000001'::uuid,
  'spam_scam'::public.report_reason_code,
  'pagination fixture',
  'reviewing'::public.ugc_report_status,
  0,
  '2030-01-01 00:00:00+00'::timestamptz - (series * interval '1 millisecond')
from generate_series(1, 101) as series;
set local session_replication_role = origin;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '61000000-0000-4000-8000-000000000003',
    'role', 'authenticated',
    'app_metadata', json_build_object('role', 'admin')
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000003',
  true
);

create temporary table ugc_admin_page_one on commit drop as
select * from public.admin_list_ugc_reports('reviewing', 51, null, null);

create temporary table ugc_admin_page_two on commit drop as
select next_page.*
  from (
    select created_at, report_id
      from ugc_admin_page_one
     order by created_at asc, report_id asc
     limit 1
  ) as cursor
  cross join lateral public.admin_list_ugc_reports(
    'reviewing', 51, cursor.created_at, cursor.report_id
  ) as next_page;

select is(
  (select count(*) from ugc_admin_page_one),
  51::bigint,
  'the first moderation page returns the requested look-ahead row'
);
select is(
  (select count(*) from ugc_admin_page_two),
  50::bigint,
  'the second moderation page returns every remaining row exactly once'
);
select is(
  (
    select count(*)
      from ugc_admin_page_one as first_page
      join ugc_admin_page_two as second_page
        using (report_type, report_id)
  ),
  0::bigint,
  'moderation keyset pages do not overlap'
);

-- Removing a former moderator must not deadlock account deletion on nullable
-- provenance FKs. The action/evidence remain valid without retaining a profile.
select is(
  public.admin_review_ugc_report(
    'post', '64000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000003', 2,
    'actioned', 'Reviewer deletion provenance fixture'
  ),
  3::bigint,
  'the reviewer actions content before their account is removed'
);
select set_config('request.jwt.claims', '{}'::json::text, true);
select set_config('request.jwt.claim.sub', '', true);
delete from public.profiles
 where id = '61000000-0000-4000-8000-000000000003';
select ok(
  exists (
    select 1
      from public.posts
     where id = '62000000-0000-4000-8000-000000000001'
       and moderation_state = 'hidden'
       and moderation_updated_at is not null
       and moderation_updated_by is null
       and moderation_source_report_id =
         '64000000-0000-4000-8000-000000000001'
  ),
  'deleting a reviewer preserves hidden content with nullable former-moderator provenance'
);
select ok(
  exists (
    select 1
      from public.post_reports
     where id = '64000000-0000-4000-8000-000000000001'
       and status = 'actioned'
       and reviewed_at is not null
       and reviewed_by is null
       and review_revision = 3
  ),
  'deleting a reviewer preserves the actioned report evidence and revision'
);

-- Reverse-direction blocks remove identities and content from direct RLS and
-- every signed viewer read helper, while preserving the underlying data.
set local session_replication_role = replica;
insert into public.user_blocks (blocker_id, blocked_id)
values (
  '61000000-0000-4000-8000-000000000002',
  '61000000-0000-4000-8000-000000000001'
);
set local session_replication_role = origin;

select is(
  public.create_notification(
    '61000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000001',
    'mentioned_in_comment', 'Mention', 'blocked mention must not deliver',
    '62000000-0000-4000-8000-000000000003'
  ),
  null::uuid,
  'central notification delivery rejects mentions across a block in either direction'
);
select is(
  public.create_notification(
    '61000000-0000-4000-8000-000000000006',
    '61000000-0000-4000-8000-000000000001',
    'mentioned_in_comment', 'Mention', 'deleting recipient must not receive',
    '62000000-0000-4000-8000-000000000003'
  ),
  null::uuid,
  'central notification delivery rejects a deletion-started mention recipient'
);
select is(
  (
    select count(*)
      from public.notifications
     where type = 'mentioned_in_comment'
       and actor_id = '61000000-0000-4000-8000-000000000001'
       and reference_id = '62000000-0000-4000-8000-000000000003'
       and user_id in (
         '61000000-0000-4000-8000-000000000002',
         '61000000-0000-4000-8000-000000000006'
       )
  ),
  0::bigint,
  'blocked and deleting mention recipients leave no durable notification row'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '61000000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'app_metadata', json_build_object('role', 'user')
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;
select is(
  (select count(*) from public.profiles
    where id = '61000000-0000-4000-8000-000000000002'),
  0::bigint,
  'a reverse block hides the blocker profile from direct RLS reads'
);
select is(
  (select count(*) from public.posts
    where id = '62000000-0000-4000-8000-000000000001'),
  0::bigint,
  'a reverse block hides the blocker post from direct RLS reads'
);
select is(
  (select count(*) from public.get_search_history_profiles(array[
    '61000000-0000-4000-8000-000000000002'::uuid
  ])),
  0::bigint,
  'local search-history hydration cannot reveal a blocked identity'
);
select is(
  (
    select count(*)
      from public.search_users(
        'ugc_target',
        '61000000-0000-4000-8000-000000000001',
        20
      )
  ),
  0::bigint,
  'messaging user search enforces the block in either direction'
);
select ok(
  not exists (
    select 1
      from json_array_elements(public.get_social_feed(
        '61000000-0000-4000-8000-000000000001', null, null, 50
      )) as item
     where item ->> 'id' = '62000000-0000-4000-8000-000000000001'
  ),
  'reverse-blocked content is absent from the feed RPC'
);
reset role;

-- Storage/write helpers enforce server-side limits even if a client bypasses
-- the UI. Static function checks cover advisory-lock burst serialization.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '61000000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'app_metadata', json_build_object('role', 'user')
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
select ok(
  not public.can_upload_profile_media(
    '61000000-0000-4000-8000-000000000001/avatars/oversized.jpg',
    '61000000-0000-4000-8000-000000000001',
    jsonb_build_object('size', 5242881)
  ),
  'profile-media helper rejects objects over 5 MiB'
);
select ok(
  not public.can_upload_post_media(
    '61000000-0000-4000-8000-000000000001/oversized.jpg',
    '61000000-0000-4000-8000-000000000001',
    jsonb_build_object('size', 20971521)
  ),
  'post-media helper rejects objects over 20 MiB'
);
select ok(
  position(
    'pg_advisory_xact_lock'
    in pg_get_functiondef(
      'public.can_upload_message_media(text,text,jsonb)'::regprocedure
    )
  ) > 0
    and position(
      'consume_rate_limit_event'
      in pg_get_functiondef(
        'public.can_upload_message_media(text,text,jsonb)'::regprocedure
      )
    ) > 0,
  'message-media helper serializes and bounds aggregate owner quota decisions'
);
select ok(
  position(
    'pg_advisory_xact_lock'
    in pg_get_functiondef(
      'public.can_upload_profile_media(text,text,jsonb)'::regprocedure
    )
  ) > 0
    and position(
      'pg_advisory_xact_lock'
      in pg_get_functiondef(
        'public.can_upload_profile_media(text,text,jsonb)'::regprocedure
      )
    ) < position(
      'account_accepts_uploads'
      in pg_get_functiondef(
        'public.can_upload_profile_media(text,text,jsonb)'::regprocedure
      )
    )
    and position(
      'pg_advisory_xact_lock'
      in pg_get_functiondef(
        'public.can_upload_post_media(text,text,jsonb)'::regprocedure
      )
    ) > 0
    and position(
      'pg_advisory_xact_lock'
      in pg_get_functiondef(
        'public.can_upload_post_media(text,text,jsonb)'::regprocedure
      )
    ) < position(
      'account_accepts_uploads'
      in pg_get_functiondef(
        'public.can_upload_post_media(text,text,jsonb)'::regprocedure
      )
    )
    and position(
      'pg_advisory_xact_lock'
      in pg_get_functiondef(
        'public.can_upload_message_media(text,text,jsonb)'::regprocedure
      )
    ) > 0
    and position(
      'pg_advisory_xact_lock'
      in pg_get_functiondef(
        'public.can_upload_message_media(text,text,jsonb)'::regprocedure
      )
    ) < position(
      'account_accepts_uploads'
      in pg_get_functiondef(
        'public.can_upload_message_media(text,text,jsonb)'::regprocedure
      )
    ),
  'all upload helpers recheck deletion acceptance only after taking their quota lock'
);
select ok(
  position(
    'reflab:profile-media-reference:'
    in pg_get_functiondef(
      'public.can_delete_profile_media(text,text)'::regprocedure
    )
  ) > 0
    and position(
      'reflab:profile-media-reference:'
      in pg_get_functiondef(
        'reflab_private.enforce_profile_public_write()'::regprocedure
      )
    ) > 0
    and position(
      'reflab:post-media-reference:'
      in pg_get_functiondef(
        'public.can_delete_post_media(text,text)'::regprocedure
      )
    ) > 0
    and position(
      'reflab:post-media-reference:'
      in pg_get_functiondef(
        'reflab_private.enforce_post_content_write()'::regprocedure
      )
    ) > 0,
  'reference writers and direct Storage delete tokens share object-specific locks'
);
select ok(
  not public.can_delete_profile_media(
    '61000000-0000-4000-8000-000000000001/avatars/referenced.jpg',
    '61000000-0000-4000-8000-000000000001'
  )
    and not public.can_delete_post_media(
      '61000000-0000-4000-8000-000000000001/referenced.jpg',
      '61000000-0000-4000-8000-000000000001'
    ),
  'reference-aware helpers reject direct delete tokens for committed media'
);

set local role authenticated;
select is(
  (
    with removed as (
      delete from storage.objects
       where bucket_id = 'profile-media'
         and name =
           '61000000-0000-4000-8000-000000000001/avatars/referenced.jpg'
      returning name
    )
    select count(*) from removed
  ),
  0::bigint,
  'a direct profile-media DELETE token cannot remove a committed avatar reference'
);
select is(
  (
    with removed as (
      delete from storage.objects
       where bucket_id = 'post-media'
         and name =
           '61000000-0000-4000-8000-000000000001/referenced.jpg'
      returning name
    )
    select count(*) from removed
  ),
  0::bigint,
  'a direct post-media DELETE token cannot remove a committed post reference'
);
select is(
  (
    with removed as (
      delete from storage.objects
       where bucket_id = 'profile-media'
         and name =
           '61000000-0000-4000-8000-000000000001/avatars/orphan.jpg'
      returning name
    )
    select count(*) from removed
  ),
  1::bigint,
  'an unreferenced owned avatar can be deleted through the direct Storage path'
);
select is(
  (
    with removed as (
      delete from storage.objects
       where bucket_id = 'post-media'
         and name =
           '61000000-0000-4000-8000-000000000001/orphan.jpg'
      returning name
    )
    select count(*) from removed
  ),
  1::bigint,
  'unreferenced owned post media can be deleted through the direct Storage path'
);
select throws_ok(
  $$update public.profiles
       set photo_url =
         '61000000-0000-4000-8000-000000000001/avatars/orphan.jpg'
     where id = '61000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'if avatar deletion wins first, a later profile reference cannot commit'
);
select throws_ok(
  $$select public.create_social_post(
      '61000000-0000-4000-8000-000000000001',
      '66000000-0000-4000-8000-000000000099',
      'delete-first post-media ordering', 'image',
      '61000000-0000-4000-8000-000000000001/orphan.jpg', null
    )$$,
  'P0002', null,
  'if post-media deletion wins first, a later post reference cannot commit'
);
reset role;

update public.profiles
   set photo_url = null
 where id = '61000000-0000-4000-8000-000000000001';
update public.posts
   set media_type = 'text', media_url = null
 where id = '62000000-0000-4000-8000-000000000003';
set local role authenticated;
select is(
  (
    with removed as (
      delete from storage.objects
       where bucket_id = 'profile-media'
         and name =
           '61000000-0000-4000-8000-000000000001/avatars/referenced.jpg'
      returning name
    )
    select count(*) from removed
  ),
  1::bigint,
  'profile media becomes deletable only after its committed reference is released'
);
select is(
  (
    with removed as (
      delete from storage.objects
       where bucket_id = 'post-media'
         and name =
           '61000000-0000-4000-8000-000000000001/referenced.jpg'
      returning name
    )
    select count(*) from removed
  ),
  1::bigint,
  'post media becomes deletable only after its committed reference is released'
);
reset role;

-- A deletion-started session is denied at both RLS and every definer read
-- boundary even before the external session revocation completes.
set local session_replication_role = replica;
update public.profiles
   set deletion_started_at = statement_timestamp()
 where id = '61000000-0000-4000-8000-000000000001';
set local session_replication_role = origin;

set local role authenticated;
select is(
  (select count(*) from public.profiles),
  0::bigint,
  'deletion-started callers cannot read profiles through direct RLS'
);
select is(
  (select count(*) from public.posts),
  0::bigint,
  'deletion-started callers cannot read posts, including their own, through RLS'
);
select is(
  (select count(*) from public.post_likes),
  0::bigint,
  'deletion-started callers cannot read social interaction rows'
);
select is(
  (select count(*) from public.conversations),
  0::bigint,
  'deletion-started callers cannot read conversation rows through Realtime RLS'
);
select is(
  (select count(*) from public.conversation_participants),
  0::bigint,
  'deletion-started callers cannot read participant rows through Realtime RLS'
);
select is(
  (select count(*) from public.messages),
  0::bigint,
  'deletion-started callers cannot read message rows through Realtime RLS'
);
select is(
  (select count(*) from public.notifications),
  0::bigint,
  'deletion-started callers cannot read notification rows'
);
select is(
  (
    with changed as (
      update public.notifications
         set read = true
       where id = '65200000-0000-4000-8000-000000000001'
      returning id
    )
    select count(*) from changed
  ),
  0::bigint,
  'deletion-started callers cannot update notification state'
);
select is(
  (
    select count(*)
      from storage.objects
     where bucket_id = 'message-media'
  ),
  0::bigint,
  'deletion-started callers cannot read private message-media objects'
);
select throws_ok(
  $$select public.get_social_feed(
      '61000000-0000-4000-8000-000000000001', null, null, 20
    )$$,
  '42501', null,
  'deletion-started callers cannot read the UGC feed RPC'
);
select throws_ok(
  $$select * from public.get_search_history_profiles(array[
      '61000000-0000-4000-8000-000000000002'::uuid
    ])$$,
  '42501', null,
  'deletion-started callers cannot hydrate local search-history PII'
);
select throws_ok(
  $$select * from public.search_users(
      'ugc_target',
      '61000000-0000-4000-8000-000000000001',
      20
    )$$,
  '42501', null,
  'deletion-started callers cannot use messaging user search'
);
select throws_ok(
  $$select * from public.get_conversations(
      '61000000-0000-4000-8000-000000000001'
    )$$,
  '42501', null,
  'deletion-started callers cannot read messaging history'
);
reset role;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '61000000-0000-4000-8000-000000000005',
    'role', 'authenticated',
    'app_metadata', json_build_object('role', 'admin')
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000005',
  true
);
set local role authenticated;
select ok(
  not public.is_admin(),
  'a signed admin claim loses authority after account deletion starts'
);
select is(
  (select count(*) from public.profiles),
  0::bigint,
  'a deletion-started admin cannot bypass consolidated profile read RLS'
);
select is(
  (
    with changed as (
      update public.profiles
         set name = 'Deletion bypass attempt'
       where id = '61000000-0000-4000-8000-000000000005'
      returning id
    )
    select count(*) from changed
  ),
  0::bigint,
  'a deletion-started admin cannot bypass consolidated profile update RLS'
);
select throws_ok(
  $$select * from public.admin_list_ugc_reports(null, 20, null, null)$$,
  '42501', null,
  'a deletion-started signed admin cannot read the moderation queue'
);
select throws_ok(
  $$select * from public.search_users(
      'ugc_target',
      '61000000-0000-4000-8000-000000000005',
      20
    )$$,
  '42501', null,
  'a deletion-started signed admin cannot use definer user search'
);
reset role;

select * from finish();
rollback;
