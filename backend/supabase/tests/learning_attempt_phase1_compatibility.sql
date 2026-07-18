-- Learning-attempt staged rollout: phase-1 compatibility gate.
--
-- Run ONLY after 20260718081235_learning_attempt_integrity.sql and BEFORE
-- 20260718081236_learning_attempt_rpc_cutover.sql. This test is intentionally
-- expected to fail after phase 2 because it proves the old bundle can still
-- write during the frontend deployment window.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

select has_function(
  'public',
  'start_or_resume_test_attempt',
  array['uuid', 'uuid'],
  'phase 1 exposes expected-user concrete start/resume'
);

select has_function(
  'public',
  'start_or_resume_test_attempt',
  array['uuid'],
  'phase 1 temporarily preserves legacy concrete start/resume'
);

select has_function(
  'public',
  'start_or_resume_random_test_attempt',
  array['uuid'],
  'phase 1 exposes expected-user random start/resume'
);

select has_function(
  'public',
  'start_or_resume_random_test_attempt',
  array[]::name[],
  'phase 1 temporarily preserves legacy random start/resume'
);

select ok(
  position(
    'p_expected_user_id'
    in pg_get_functiondef(
      'public.start_or_resume_test_attempt(uuid,uuid)'::regprocedure
    )
  ) > 0
  and position(
    'is distinct from caller_id'
    in pg_get_functiondef(
      'public.start_or_resume_random_test_attempt(uuid)'::regprocedure
    )
  ) > 0,
  'phase 1 installs explicit owner binding before the frontend cutover'
);

select has_function(
  'public',
  'save_test_attempt_answer',
  array['uuid', 'uuid', 'text'],
  'phase 1 exposes transactional answer save'
);

select has_function(
  'public',
  'submit_test_attempt',
  array['uuid'],
  'phase 1 exposes server-owned submission'
);

select has_trigger(
  'public',
  'test_attempts',
  'enforce_random_test_attempt_contract',
  'phase 1 blocks hostile random timer values without removing old DML'
);

select ok(
  has_table_privilege('authenticated', 'public.test_attempts', 'INSERT')
  and has_table_privilege('authenticated', 'public.test_attempts', 'UPDATE'),
  'phase 1 preserves old-bundle attempt writes'
);

select ok(
  has_table_privilege('authenticated', 'public.test_attempt_answers', 'INSERT')
  and has_table_privilege('authenticated', 'public.test_attempt_answers', 'UPDATE'),
  'phase 1 preserves old-bundle answer writes'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'test_attempts'
      and policy.policyname in (
        'test_attempts_insert_own',
        'test_attempts_update_own'
      )
  ),
  2,
  'phase 1 preserves both old-bundle attempt RLS policies'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'test_attempt_answers'
      and policy.policyname in (
        'attempt_answers_insert_own',
        'attempt_answers_update_own'
      )
  ),
  2,
  'phase 1 preserves both old-bundle answer RLS policies'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_indexes as index_record
    where index_record.schemaname = 'public'
      and index_record.indexname in (
        'test_attempts_one_open_test_uidx',
        'test_attempts_one_open_random_uidx'
      )
  ),
  'phase 1 does not prematurely install the old-client-breaking unique indexes'
);

select * from finish();
rollback;
