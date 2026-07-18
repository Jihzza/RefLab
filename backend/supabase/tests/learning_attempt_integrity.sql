-- Learning-attempt transactional integrity contract.
-- Run against a disposable/local database after all migrations, for example:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--     -f backend/supabase/tests/learning_attempt_integrity.sql

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

-- Schema, constraints, RLS, and least-privilege surface.
select has_table(
  'public',
  'test_attempt_questions',
  'attempt question snapshots are persisted in a dedicated table'
);

select has_column(
  'public',
  'test_attempts',
  'superseded_by',
  'deduplicated attempts retain a canonical-attempt reference'
);

select has_column(
  'public',
  'test_attempts',
  'question_set_locked_at',
  'attempts record when their question order becomes immutable'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint as c
    where c.conrelid = 'public.test_attempts'::regclass
      and c.contype = 'c'
      and pg_catalog.pg_get_constraintdef(c.oid) ilike '%superseded%'
  ),
  'attempt status accepts the non-destructive superseded state'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_indexes as index_record
    where index_record.schemaname = 'public'
      and index_record.tablename = 'test_attempts'
      and index_record.indexname = 'test_attempts_one_open_test_uidx'
      and index_record.indexdef ilike 'create unique index%'
      and index_record.indexdef ilike '%test_id is not null%'
      and index_record.indexdef ilike '%status = ''in_progress''%'
  ),
  'concrete tests have one partial unique open-attempt index'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_indexes as index_record
    where index_record.schemaname = 'public'
      and index_record.tablename = 'test_attempts'
      and index_record.indexname = 'test_attempts_one_open_random_uidx'
      and index_record.indexdef ilike 'create unique index%'
      and index_record.indexdef ilike '%test_id is null%'
      and index_record.indexdef ilike '%status = ''in_progress''%'
  ),
  'random tests have one partial unique open-attempt index'
);

select has_trigger(
  'public',
  'test_attempts',
  'enforce_random_test_attempt_contract',
  'open random attempts enforce the fixed timer contract on writes'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'public.test_attempts'::regclass
      and constraint_record.conname = 'test_attempts_open_random_time_limit_check'
      and pg_catalog.pg_get_constraintdef(constraint_record.oid)
        ilike '%time_limit_seconds IS NOT DISTINCT FROM 2400%'
  ),
  'open random attempts require the fixed 40-minute limit'
);

select col_is_pk(
  'public',
  'test_attempt_questions',
  array['attempt_id', 'order_index'],
  'question order is unique within each attempt'
);

select col_is_unique(
  'public',
  'test_attempt_questions',
  array['attempt_id', 'question_id'],
  'a question cannot occur twice in one attempt'
);

select ok(
  (
    select class.relrowsecurity
    from pg_catalog.pg_class as class
    where class.oid = 'public.test_attempt_questions'::regclass
  ),
  'attempt question snapshots have RLS enabled'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'test_attempt_questions'
      and policy.cmd = 'SELECT'
      and policy.roles = array['authenticated']::name[]
  ),
  1,
  'attempt question snapshots expose exactly one authenticated SELECT policy'
);

select ok(
  not has_table_privilege('authenticated', 'public.test_attempts', 'INSERT')
  and not has_table_privilege('authenticated', 'public.test_attempts', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.test_attempts', 'DELETE'),
  'authenticated callers cannot mutate attempts directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.test_attempt_answers', 'INSERT')
  and not has_table_privilege('authenticated', 'public.test_attempt_answers', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.test_attempt_answers', 'DELETE'),
  'authenticated callers cannot mutate attempt answers directly'
);

select ok(
  has_table_privilege('authenticated', 'public.test_attempt_questions', 'SELECT')
  and not has_table_privilege('authenticated', 'public.test_attempt_questions', 'INSERT')
  and not has_table_privilege('authenticated', 'public.test_attempt_questions', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.test_attempt_questions', 'DELETE'),
  'authenticated callers can only read their question snapshots'
);

select has_function(
  'public',
  'start_or_resume_test_attempt',
  array['uuid', 'uuid'],
  'expected-user concrete attempt start/resume RPC exists'
);

select hasnt_function(
  'public',
  'start_or_resume_test_attempt',
  array['uuid'],
  'the user-implicit concrete start overload is removed after cutover'
);

select has_function(
  'public',
  'start_or_resume_random_test_attempt',
  array['uuid'],
  'expected-user random attempt start/resume RPC exists'
);

select hasnt_function(
  'public',
  'start_or_resume_random_test_attempt',
  array[]::name[],
  'the user-implicit random start overload is removed after cutover'
);

select hasnt_function(
  'public',
  'start_or_resume_random_test_attempt',
  array['integer', 'integer'],
  'callers cannot choose arbitrary random-test size or duration'
);

select has_function(
  'public',
  'save_test_attempt_answer',
  array['uuid', 'uuid', 'text'],
  'locked-answer RPC exists'
);

select has_function(
  'public',
  'submit_test_attempt',
  array['uuid'],
  'atomic submission RPC exists'
);

select hasnt_function(
  'public',
  'submit_test_attempt',
  array['uuid', 'boolean'],
  'the caller cannot choose whether a submission is automatic'
);

select ok(
  (
    select procedure.prosecdef
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.start_or_resume_test_attempt(uuid,uuid)'::regprocedure
  ),
  'concrete start/resume is SECURITY DEFINER'
);

select ok(
  (
    select procedure.prosecdef
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.start_or_resume_random_test_attempt(uuid)'::regprocedure
  ),
  'random start/resume is SECURITY DEFINER'
);

select ok(
  (
    select procedure.prosecdef
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.save_test_attempt_answer(uuid,uuid,text)'::regprocedure
  ),
  'answer save is SECURITY DEFINER'
);

select ok(
  (
    select procedure.prosecdef
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.submit_test_attempt(uuid)'::regprocedure
  ),
  'submission is SECURITY DEFINER'
);

select is(
  (
    select procedure.proconfig
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.start_or_resume_test_attempt(uuid,uuid)'::regprocedure
  ),
  array['search_path=""']::text[],
  'concrete start/resume has an empty fixed search_path'
);

select is(
  (
    select procedure.proconfig
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.start_or_resume_random_test_attempt(uuid)'::regprocedure
  ),
  array['search_path=""']::text[],
  'random start/resume has an empty fixed search_path'
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
  'attempt start RPCs reject a queued request whose expected learner changed'
);

select is(
  (
    select procedure.proconfig
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.save_test_attempt_answer(uuid,uuid,text)'::regprocedure
  ),
  array['search_path=""']::text[],
  'answer save has an empty fixed search_path'
);

select is(
  (
    select procedure.proconfig
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.submit_test_attempt(uuid)'::regprocedure
  ),
  array['search_path=""']::text[],
  'submission has an empty fixed search_path'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.start_or_resume_test_attempt(uuid,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.start_or_resume_test_attempt(uuid,uuid)',
    'EXECUTE'
  ),
  'only authenticated callers can execute concrete start/resume'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.start_or_resume_random_test_attempt(uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.start_or_resume_random_test_attempt(uuid)',
    'EXECUTE'
  ),
  'only authenticated callers can execute random start/resume'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.save_test_attempt_answer(uuid,uuid,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.save_test_attempt_answer(uuid,uuid,text)',
    'EXECUTE'
  ),
  'only authenticated callers can execute answer save'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.submit_test_attempt(uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.submit_test_attempt(uuid)',
    'EXECUTE'
  ),
  'only authenticated callers can execute submission'
);

-- Runtime fixtures avoid depending on the evolving GoTrue auth.users shape.
-- The transaction is rolled back and referential/notification triggers are
-- disabled only for these synthetic identities.
set local session_replication_role = replica;

insert into public.tests (id, slug, title, topic, is_active)
values
  (
    '30000000-0000-0000-0000-000000000010',
    'attempt-integrity-test',
    'Attempt integrity test',
    'General',
    true
  ),
  (
    '30000000-0000-0000-0000-000000000011',
    'attempt-integrity-empty-test',
    'Attempt integrity empty test',
    'General',
    true
  );

insert into public.question_bank (
  id,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_option,
  topic,
  law
)
values (
  '30000000-0000-0000-0000-000000000020',
  'Integrity fixture question?',
  'Incorrect A',
  'Correct B',
  'Incorrect C',
  'Incorrect D',
  'B',
  'General',
  5
);

insert into public.test_question_items (
  id,
  test_id,
  question_id,
  order_index
)
values (
  '30000000-0000-0000-0000-000000000030',
  '30000000-0000-0000-0000-000000000010',
  '30000000-0000-0000-0000-000000000020',
  1
);

insert into public.test_attempts (
  id,
  user_id,
  test_id,
  status,
  started_at,
  question_set_locked_at
)
values
  (
    '30000000-0000-0000-0000-000000000040',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000010',
    'in_progress',
    statement_timestamp() - interval '41 minutes',
    statement_timestamp() - interval '41 minutes'
  ),
  (
    '30000000-0000-0000-0000-000000000050',
    '30000000-0000-0000-0000-000000000001',
    null,
    'in_progress',
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '30000000-0000-0000-0000-000000000060',
    '30000000-0000-0000-0000-000000000002',
    null,
    'in_progress',
    statement_timestamp() - interval '41 minutes',
    statement_timestamp() - interval '41 minutes'
  ),
  (
    '30000000-0000-0000-0000-000000000070',
    '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000011',
    'in_progress',
    statement_timestamp(),
    null
  ),
  (
    '30000000-0000-0000-0000-000000000080',
    '30000000-0000-0000-0000-000000000003',
    null,
    'in_progress',
    statement_timestamp(),
    statement_timestamp()
  );

insert into public.test_attempt_questions (
  attempt_id,
  question_id,
  order_index
)
values
  (
    '30000000-0000-0000-0000-000000000040',
    '30000000-0000-0000-0000-000000000020',
    1
  ),
  (
    '30000000-0000-0000-0000-000000000050',
    '30000000-0000-0000-0000-000000000020',
    1
  ),
  (
    '30000000-0000-0000-0000-000000000060',
    '30000000-0000-0000-0000-000000000020',
    1
  ),
  (
    '30000000-0000-0000-0000-000000000080',
    '30000000-0000-0000-0000-000000000020',
    1
  );

-- Exercise the post-cutover write guard with a deliberately hostile timer.
-- FK fixtures were inserted with triggers disabled, but this update runs with
-- normal trigger semantics and must be corrected before constraints evaluate.
set local session_replication_role = origin;

update public.test_attempts
set
  time_limit_seconds = 99999,
  started_at = statement_timestamp() + interval '1 day'
where id = '30000000-0000-0000-0000-000000000080';

select is(
  (
    select time_limit_seconds
    from public.test_attempts
    where id = '30000000-0000-0000-0000-000000000080'
  ),
  2400,
  'a hostile random time limit is normalized by the write guard'
);

select ok(
  (
    select started_at <= statement_timestamp()
    from public.test_attempts
    where id = '30000000-0000-0000-0000-000000000080'
  ),
  'a future random start time is clamped by the write guard'
);

set local session_replication_role = replica;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '30000000-0000-0000-0000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);

set local role authenticated;

select throws_ok(
  $$select public.start_or_resume_test_attempt(
      '30000000-0000-0000-0000-000000000010',
      '30000000-0000-0000-0000-000000000002'
    )$$,
  '42501',
  'Learner identity changed before the attempt was started',
  'account A cannot execute a concrete start queued for account B'
);

select throws_ok(
  $$select public.start_or_resume_random_test_attempt(
      '30000000-0000-0000-0000-000000000002'
    )$$,
  '42501',
  'Learner identity changed before the attempt was started',
  'account A cannot execute a random start queued for account B'
);

select is(
  (
    public.start_or_resume_test_attempt(
      '30000000-0000-0000-0000-000000000010',
      '30000000-0000-0000-0000-000000000001'
    ) -> 'attempt' ->> 'id'
  )::uuid,
  '30000000-0000-0000-0000-000000000040'::uuid,
  'concrete start/resume returns the existing canonical attempt'
);

select is(
  public.start_or_resume_test_attempt(
    '30000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000001'
  ) #>> '{questions,0,id}',
  '30000000-0000-0000-0000-000000000020',
  'concrete resume returns the persisted question order'
);

select ok(
  (
    public.start_or_resume_test_attempt(
      '30000000-0000-0000-0000-000000000010',
      '30000000-0000-0000-0000-000000000001'
    ) -> 'attempt' ->> 'started_at'
  )::timestamptz < statement_timestamp() - interval '40 minutes',
  'concrete resume preserves an original start older than the random deadline'
);

select lives_ok(
  $$
    select *
    from public.save_test_attempt_answer(
      '30000000-0000-0000-0000-000000000040',
      '30000000-0000-0000-0000-000000000020',
      'A'
    )
  $$,
  'an old concrete attempt remains writable because normal tests are untimed'
);

select is(
  (
    select answer.selected_option
    from public.save_test_attempt_answer(
      '30000000-0000-0000-0000-000000000040',
      '30000000-0000-0000-0000-000000000020',
      'B'
    ) as answer
  ),
  'B',
  'a concrete-test answer can be revised before submission'
);

select is(
  (
    select answer.is_correct
    from public.test_attempt_answers as answer
    where answer.attempt_id = '30000000-0000-0000-0000-000000000040'
      and answer.question_id = '30000000-0000-0000-0000-000000000020'
  ),
  null::boolean,
  'revising a concrete-test answer clears stale grading state'
);

select lives_ok(
  $$
    select *
    from public.submit_test_attempt(
      '30000000-0000-0000-0000-000000000040'
    )
  $$,
  'an old fully answered concrete attempt can be submitted manually'
);

select ok(
  (
    select status = 'submitted'
      and auto_submitted = false
      and time_elapsed_seconds is null
      and score_correct = 1
      and score_total = 1
    from public.test_attempts
    where id = '30000000-0000-0000-0000-000000000040'
  ),
  'concrete submission is correct, untimed, and never auto-submitted'
);

select is(
  (
    public.start_or_resume_random_test_attempt(
      '30000000-0000-0000-0000-000000000001'
    )
      -> 'attempt' ->> 'id'
  )::uuid,
  '30000000-0000-0000-0000-000000000050'::uuid,
  'random start/resume returns the existing canonical attempt'
);

select is(
  public.start_or_resume_random_test_attempt(
    '30000000-0000-0000-0000-000000000001'
  ) -> 'questions',
  public.start_or_resume_random_test_attempt(
    '30000000-0000-0000-0000-000000000001'
  ) -> 'questions',
  'random resume returns the same persisted question order on every call'
);

select lives_ok(
  $$
    select *
    from public.save_test_attempt_answer(
      '30000000-0000-0000-0000-000000000050',
      '30000000-0000-0000-0000-000000000020',
      'B'
    )
  $$,
  'the owner can lock an answer through the RPC'
);

select is(
  (
    select answer.selected_option
    from public.save_test_attempt_answer(
      '30000000-0000-0000-0000-000000000050',
      '30000000-0000-0000-0000-000000000020',
      'B'
    ) as answer
  ),
  'B',
  'an identical answer retry is idempotent'
);

select throws_ok(
  $$
    select *
    from public.save_test_attempt_answer(
      '30000000-0000-0000-0000-000000000050',
      '30000000-0000-0000-0000-000000000020',
      'A'
    )
  $$,
  '55000',
  'Answer is already locked',
  'a different second answer is rejected'
);

select lives_ok(
  $$
    select *
    from public.submit_test_attempt(
      '30000000-0000-0000-0000-000000000050'
    )
  $$,
  'the owner can atomically submit a fully answered attempt'
);

select is(
  (
    select status
    from public.test_attempts
    where id = '30000000-0000-0000-0000-000000000050'
  ),
  'submitted',
  'submission transitions the attempt exactly once'
);

select is(
  (
    select score_correct
    from public.test_attempts
    where id = '30000000-0000-0000-0000-000000000050'
  ),
  1,
  'submission calculates the correct score server-side'
);

select is(
  (
    select score_total
    from public.test_attempts
    where id = '30000000-0000-0000-0000-000000000050'
  ),
  1,
  'submission scores against the persisted question set'
);

select is(
  (
    select submitted.id
    from public.submit_test_attempt(
      '30000000-0000-0000-0000-000000000050'
    ) as submitted
  ),
  '30000000-0000-0000-0000-000000000050'::uuid,
  'a repeated submission is idempotent'
);

reset role;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '30000000-0000-0000-0000-000000000002',
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000002',
  true
);

set local role authenticated;

select throws_ok(
  $$
    select *
    from public.save_test_attempt_answer(
      '30000000-0000-0000-0000-000000000060',
      '30000000-0000-0000-0000-000000000020',
      'B'
    )
  $$,
  '55000',
  'Attempt deadline has passed',
  'a random answer cannot be saved after the server deadline'
);

select lives_ok(
  $$
    select *
    from public.submit_test_attempt(
      '30000000-0000-0000-0000-000000000060'
    )
  $$,
  'an expired random attempt can be submitted through the single endpoint'
);

select ok(
  (
    select status = 'submitted'
      and auto_submitted = true
      and score_correct = 0
      and score_total = 1
    from public.test_attempts
    where id = '30000000-0000-0000-0000-000000000060'
  ),
  'the server marks an expired incomplete random submission as automatic'
);

select ok(
  payload #>> '{attempt,status}' = 'superseded'
  and jsonb_array_length(payload -> 'questions') = 0,
  'a legacy empty attempt is closed without fabricating questions'
)
from (
  select public.start_or_resume_test_attempt(
    '30000000-0000-0000-0000-000000000011',
    '30000000-0000-0000-0000-000000000002'
  ) as payload
) as empty_resume;

select throws_ok(
  $$
    select public.start_or_resume_test_attempt(
      '30000000-0000-0000-0000-000000000011',
      '30000000-0000-0000-0000-000000000002'
    )
  $$,
  '22023',
  'Test is unavailable',
  'a new concrete attempt is not created without questions'
);

select is(
  (
    select count(*)::integer
    from public.test_attempts
    where user_id = '30000000-0000-0000-0000-000000000002'
      and test_id = '30000000-0000-0000-0000-000000000011'
      and status = 'in_progress'
  ),
  0,
  'the empty-test guard leaves no open attempt behind'
);

select throws_ok(
  $$
    select *
    from public.save_test_attempt_answer(
      '30000000-0000-0000-0000-000000000040',
      '30000000-0000-0000-0000-000000000020',
      'B'
    )
  $$,
  '42501',
  'Attempt is unavailable',
  'a different user cannot mutate another user''s attempt'
);

reset role;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '30000000-0000-0000-0000-000000000003',
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000003',
  true
);

set local role authenticated;

select throws_ok(
  $$
    select *
    from public.submit_test_attempt(
      '30000000-0000-0000-0000-000000000080'
    )
  $$,
  '55000',
  'Every question must be answered before submission',
  'a recent random attempt still requires every answer'
);

select ok(
  (
    select status = 'in_progress'
      and auto_submitted = false
    from public.test_attempts
    where id = '30000000-0000-0000-0000-000000000080'
  ),
  'a rejected early random submission leaves the attempt open'
);

reset role;
set local session_replication_role = origin;

select * from finish();
rollback;
