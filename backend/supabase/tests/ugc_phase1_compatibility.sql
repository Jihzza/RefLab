-- Run only after 20260718103637 and before 20260718105035 on a disposable DB.
-- Proves that the old direct-write frontend remains usable while phase-one
-- server guards enforce the launch contract.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select plan(21);

select has_function(
  'public',
  'create_social_post',
  array['uuid', 'text', 'post_media_type', 'text', 'uuid'],
  'phase one retains the legacy five-argument post compatibility wrapper'
);

set local session_replication_role = replica;

insert into public.profiles (id, username, name, role, deletion_started_at)
values
  ('51000000-0000-4000-8000-000000000001', 'ugc_phase_a', 'Phase A', 'user', null),
  ('51000000-0000-4000-8000-000000000002', 'ugc_phase_b', 'Phase B', 'user', null),
  ('51000000-0000-4000-8000-000000000003', 'ugc_phase_admin', 'Phase Admin', 'user', null),
  ('51000000-0000-4000-8000-000000000004', 'ugc_phase_deleting', 'Deleting', 'user', statement_timestamp());

insert into public.posts (
  id, user_id, content, moderation_state, moderation_updated_at,
  moderation_updated_by, moderation_source_report_id
)
values
  (
    '52000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000002',
    'Visible blocked-author post',
    'visible', null, null, null
  ),
  (
    '52000000-0000-4000-8000-000000000002',
    '51000000-0000-4000-8000-000000000003',
    'Hidden post',
    'hidden', statement_timestamp(),
    '51000000-0000-4000-8000-000000000003',
    '59000000-0000-4000-8000-000000000002'
  ),
  (
    '52000000-0000-4000-8000-000000000003',
    '51000000-0000-4000-8000-000000000001',
    repeat('L', 2500),
    'visible', null, null, null
  );

insert into public.post_comments (
  id, post_id, user_id, parent_comment_id, content,
  moderation_state, moderation_updated_at, moderation_updated_by,
  moderation_source_report_id
)
values
  (
    '53000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000002',
    null, 'Top-level comment', 'visible', null, null, null
  ),
  (
    '53000000-0000-4000-8000-000000000002',
    '52000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000002',
    '53000000-0000-4000-8000-000000000001',
    'Nested reply', 'visible', null, null, null
  );

insert into public.user_blocks (blocker_id, blocked_id)
values (
  '51000000-0000-4000-8000-000000000002',
  '51000000-0000-4000-8000-000000000001'
);

set local session_replication_role = origin;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '51000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '51000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select lives_ok(
  $$insert into public.posts (user_id, content)
    values ('51000000-0000-4000-8000-000000000001', 'Legacy direct post')$$,
  'phase one keeps a bounded legacy direct post insert usable'
);

select throws_ok(
  $$insert into public.posts (user_id, content)
    values ('51000000-0000-4000-8000-000000000001', repeat('x', 2001))$$,
  '22001', null,
  'legacy direct posts enforce the new length bound'
);

select throws_ok(
  $$insert into public.posts (user_id, content, media_type, media_url)
    values (
      '51000000-0000-4000-8000-000000000001', null, 'image',
      '51000000-0000-4000-8000-000000000002/stolen.jpg'
    )$$,
  '42501', null,
  'legacy direct posts cannot reference another owner media path'
);

select throws_ok(
  $$insert into public.posts (user_id, original_post_id)
    values (
      '51000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001'
    )$$,
  '42501', null,
  'legacy direct repost rejects a bidirectionally blocked author'
);

select throws_ok(
  $$insert into public.posts (user_id, original_post_id)
    values (
      '51000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000002'
    )$$,
  '42501', null,
  'legacy direct repost rejects hidden originals'
);

select throws_ok(
  $$insert into public.post_comments (post_id, user_id, content)
    values (
      '52000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000001',
      'Blocked comment attempt'
    )$$,
  '42501', null,
  'legacy direct comments reject a blocked post author'
);

select throws_ok(
  $$insert into public.post_comments (post_id, user_id, content)
    values (
      '52000000-0000-4000-8000-000000000002',
      '51000000-0000-4000-8000-000000000001',
      'Hidden comment attempt'
    )$$,
  '42501', null,
  'legacy direct comments reject hidden posts'
);

select throws_ok(
  $$insert into public.post_comments (
      post_id, user_id, parent_comment_id, content
    ) values (
      '52000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000001',
      '53000000-0000-4000-8000-000000000002',
      'Third level attempt'
    )$$,
  '22023', null,
  'legacy direct replies cannot nest below one level'
);

select throws_ok(
  $$insert into public.user_follows (follower_id, following_id)
    values (
      '51000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000002'
    )$$,
  '42501', null,
  'a follow cannot be recreated after either side blocks'
);

select throws_ok(
  $$insert into public.post_likes (user_id, post_id)
    values (
      '51000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001'
    )$$,
  '42501', null,
  'known post IDs cannot bypass block checks for likes'
);

select lives_ok(
  $$insert into public.post_reports (reporter_id, post_id, reason)
    values (
      '51000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      'Legacy report reason'
    )$$,
  'legacy report insert remains compatible'
);

select lives_ok(
  $$insert into public.post_reports (reporter_id, post_id, reason)
    values (
      '51000000-0000-4000-8000-000000000001',
      '52000000-0000-4000-8000-000000000001',
      'Duplicate legacy retry'
    )$$,
  'a legacy duplicate report retry is a successful no-op'
);

reset role;

select is(
  (
    select count(*)
      from public.post_reports
     where reporter_id = '51000000-0000-4000-8000-000000000001'
       and target_snapshot_id = '52000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'new reports are idempotent without a duplicate-breaking unique index'
);

select is(
  (
    select target_snapshot_id
      from public.post_reports
     where reporter_id = '51000000-0000-4000-8000-000000000001'
  ),
  '52000000-0000-4000-8000-000000000001'::uuid,
  'legacy report insert receives an immutable target snapshot'
);

select lives_ok(
  $$update public.posts
       set like_count = like_count + 1
     where id = '52000000-0000-4000-8000-000000000003'$$,
  'unrelated counter updates do not reject historical long content'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '51000000-0000-4000-8000-000000000004',
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '51000000-0000-4000-8000-000000000004',
  true
);
set local role authenticated;

select throws_ok(
  $$insert into public.posts (user_id, content)
    values ('51000000-0000-4000-8000-000000000004', 'Deleting actor')$$,
  '42501', null,
  'legacy writes stop when account deletion starts'
);

reset role;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '51000000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '51000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select lives_ok(
  $$update public.profiles
       set name = '  Trimmed phase name  '
     where id = '51000000-0000-4000-8000-000000000001'$$,
  'bounded profile name update stays compatible'
);

select is(
  (
    select name from public.profiles
     where id = '51000000-0000-4000-8000-000000000001'
  ),
  'Trimmed phase name',
  'new profile names are normalized in the database'
);

select throws_ok(
  $$update public.profiles
       set name = repeat('n', 101)
     where id = '51000000-0000-4000-8000-000000000001'$$,
  '22001', null,
  'new profile names are bounded at 100 characters'
);

select throws_ok(
  $$update public.profiles
       set photo_url = 'https://tracker.invalid/pixel.png'
     where id = '51000000-0000-4000-8000-000000000001'$$,
  '22023', null,
  'new arbitrary external profile photo URLs are rejected'
);

reset role;
select * from finish();
rollback;
