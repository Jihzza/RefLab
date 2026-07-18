-- Learning activity integrity: additive phase-1 compatibility gate.
-- Run after 20260718102753 and before 20260718102755 on disposable staging.
-- It must fail after phase 2 because old-bundle direct DML is then removed.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select plan(48);

select has_column(
  'public', 'question_bank', 'is_active',
  'question availability can be retired without deleting history'
);

select ok(
  (select attribute.attnotnull
   from pg_catalog.pg_attribute as attribute
   where attribute.attrelid = 'public.question_bank'::regclass
     and attribute.attname = 'is_active'),
  'question availability is non-null'
);

select has_function(
  'public', 'start_question_session',
  array['uuid', 'uuid', 'text', 'smallint[]', 'text[]'],
  'phase 1 exposes expected-user session start'
);
select has_function(
  'public', 'start_question_session',
  array['uuid', 'text', 'smallint[]', 'text[]'],
  'phase 1 temporarily preserves legacy session start'
);
select has_function(
  'public', 'save_question_practice_answer',
  array['uuid', 'uuid', 'uuid', 'text'],
  'phase 1 exposes server-graded practice saves'
);
select has_function(
  'public', 'complete_question_session', array['uuid'],
  'phase 1 exposes server-owned session completion'
);
select has_function(
  'public', 'save_video_attempt',
  array['uuid', 'uuid', 'uuid', 'text', 'text'],
  'phase 1 exposes expected-user video saves'
);
select has_function(
  'public', 'save_video_attempt', array['uuid', 'uuid', 'text', 'text'],
  'phase 1 temporarily preserves legacy video saves'
);

select ok(
  position(
    'p_expected_user_id'
    in pg_get_functiondef(
      'public.start_question_session(uuid,uuid,text,smallint[],text[])'::regprocedure
    )
  ) > 0
  and position(
    'is distinct from actor_id'
    in pg_get_functiondef(
      'public.save_video_attempt(uuid,uuid,uuid,text,text)'::regprocedure
    )
  ) > 0,
  'phase 1 installs explicit owner binding before the frontend cutover'
);

select has_trigger(
  'public', 'question_sessions', 'enforce_question_session_server_fields',
  'old-bundle session writes are guarded in phase 1'
);
select has_trigger(
  'public', 'question_practice_answers', 'derive_question_practice_answer',
  'old-bundle practice writes are server-graded in phase 1'
);
select has_trigger(
  'public', 'video_attempts', 'derive_video_attempt',
  'old-bundle video writes are server-graded in phase 1'
);

select ok(
  (select bool_and(
     procedure.prosecdef
     and position('session_user' in lower(pg_get_functiondef(procedure.oid))) > 0
     and position('current_user' in lower(pg_get_functiondef(procedure.oid))) = 0
   )
   from pg_catalog.pg_proc as procedure
   where procedure.oid = any(array[
     'public.enforce_question_session_server_fields()'::regprocedure,
     'public.derive_question_practice_answer()'::regprocedure,
     'public.derive_video_attempt()'::regprocedure
   ])),
  'SECURITY DEFINER compatibility triggers retain caller-aware trust checks'
);
select ok(
  (select bool_and(procedure.proconfig @> array['search_path=""'])
   from pg_catalog.pg_proc as procedure
   where procedure.oid = any(array[
     'public.enforce_question_session_server_fields()'::regprocedure,
     'public.derive_question_practice_answer()'::regprocedure,
     'public.derive_video_attempt()'::regprocedure
   ])),
  'all compatibility trigger functions fix an empty search path'
);

select ok(
  (select procedure.prosecdef
   from pg_catalog.pg_proc as procedure
   where procedure.oid = 'public.start_question_session(uuid,uuid,text,smallint[],text[])'::regprocedure),
  'session start is SECURITY DEFINER'
);
select ok(
  (select procedure.prosecdef
   from pg_catalog.pg_proc as procedure
   where procedure.oid = 'public.save_question_practice_answer(uuid,uuid,uuid,text)'::regprocedure),
  'practice save is SECURITY DEFINER'
);
select ok(
  (select procedure.prosecdef
   from pg_catalog.pg_proc as procedure
   where procedure.oid = 'public.complete_question_session(uuid)'::regprocedure),
  'session completion is SECURITY DEFINER'
);
select ok(
  (select procedure.prosecdef
   from pg_catalog.pg_proc as procedure
   where procedure.oid = 'public.save_video_attempt(uuid,uuid,uuid,text,text)'::regprocedure),
  'video save is SECURITY DEFINER'
);

select ok(
  coalesce((select procedure.proconfig @> array['search_path=""']
   from pg_catalog.pg_proc as procedure
   where procedure.oid = 'public.start_question_session(uuid,uuid,text,smallint[],text[])'::regprocedure), false),
  'session start fixes an empty search path'
);
select ok(
  coalesce((select procedure.proconfig @> array['search_path=""']
   from pg_catalog.pg_proc as procedure
   where procedure.oid = 'public.save_question_practice_answer(uuid,uuid,uuid,text)'::regprocedure), false),
  'practice save fixes an empty search path'
);
select ok(
  coalesce((select procedure.proconfig @> array['search_path=""']
   from pg_catalog.pg_proc as procedure
   where procedure.oid = 'public.complete_question_session(uuid)'::regprocedure), false),
  'session completion fixes an empty search path'
);
select ok(
  coalesce((select procedure.proconfig @> array['search_path=""']
   from pg_catalog.pg_proc as procedure
   where procedure.oid = 'public.save_video_attempt(uuid,uuid,uuid,text,text)'::regprocedure), false),
  'video save fixes an empty search path'
);

select ok(
  has_function_privilege('authenticated', 'public.start_question_session(uuid,uuid,text,smallint[],text[])', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.start_question_session(uuid,text,smallint[],text[])', 'EXECUTE'),
  'authenticated can start a session through the RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.save_question_practice_answer(uuid,uuid,uuid,text)', 'EXECUTE'),
  'authenticated can save practice through the RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.complete_question_session(uuid)', 'EXECUTE'),
  'authenticated can complete a session through the RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.save_video_attempt(uuid,uuid,uuid,text,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.save_video_attempt(uuid,uuid,text,text)', 'EXECUTE'),
  'authenticated can save video through the RPC'
);

select ok(
  not has_function_privilege('anon', 'public.start_question_session(uuid,uuid,text,smallint[],text[])', 'EXECUTE')
  and not has_function_privilege('anon', 'public.start_question_session(uuid,text,smallint[],text[])', 'EXECUTE'),
  'anon cannot start a session'
);
select ok(
  not has_function_privilege('anon', 'public.save_question_practice_answer(uuid,uuid,uuid,text)', 'EXECUTE'),
  'anon cannot save practice'
);
select ok(
  not has_function_privilege('anon', 'public.complete_question_session(uuid)', 'EXECUTE'),
  'anon cannot complete a session'
);
select ok(
  not has_function_privilege('anon', 'public.save_video_attempt(uuid,uuid,uuid,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.save_video_attempt(uuid,uuid,text,text)', 'EXECUTE'),
  'anon cannot save video'
);

select ok(
  has_table_privilege('authenticated', 'public.question_sessions', 'INSERT')
  and has_table_privilege('authenticated', 'public.question_sessions', 'UPDATE'),
  'phase 1 preserves old-bundle session writes'
);
select ok(
  has_table_privilege('authenticated', 'public.question_practice_answers', 'INSERT'),
  'phase 1 preserves old-bundle practice inserts'
);
select ok(
  has_table_privilege('authenticated', 'public.video_attempts', 'INSERT'),
  'phase 1 preserves old-bundle video inserts'
);
select ok(
  not has_table_privilege('authenticated', 'public.question_sessions', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'public.question_practice_answers', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'public.video_attempts', 'TRUNCATE'),
  'phase 1 removes dangerous unused truncate authority'
);

select is(
  (select count(*)::integer
   from pg_catalog.pg_policies as policy
   where policy.schemaname = 'public'
     and (
       (policy.tablename = 'question_sessions'
        and policy.policyname in ('question_sessions_insert_own', 'question_sessions_update_own'))
       or (policy.tablename = 'question_practice_answers'
           and policy.policyname = 'practice_answers_insert_own')
       or (policy.tablename = 'video_attempts'
           and policy.policyname = 'video_attempts_insert_own')
     )),
  4,
  'phase 1 preserves all four old-bundle mutation policies'
);

select ok(
  position('question_bank' in pg_get_functiondef(
    'public.derive_question_practice_answer()'::regprocedure
  )) > 0,
  'practice compatibility trigger grades from question_bank'
);
select ok(
  position('video_scenarios' in pg_get_functiondef(
    'public.derive_video_attempt()'::regprocedure
  )) > 0,
  'video compatibility trigger grades from video_scenarios'
);
select ok(
  position('question_practice_answers' in pg_get_functiondef(
    'public.enforce_question_session_server_fields()'::regprocedure
  )) > 0,
  'session compatibility trigger derives totals from associated answers'
);

select ok(
  position('deletion_started_at' in pg_get_functiondef(
    'public.enforce_question_session_server_fields()'::regprocedure)) > 0
  and position('deletion_started_at' in pg_get_functiondef(
    'public.derive_question_practice_answer()'::regprocedure)) > 0
  and position('deletion_started_at' in pg_get_functiondef(
    'public.derive_video_attempt()'::regprocedure)) > 0
  and position('for share' in lower(pg_get_functiondef(
    'public.enforce_question_session_server_fields()'::regprocedure))) > 0
  and position('for share' in lower(pg_get_functiondef(
    'public.derive_question_practice_answer()'::regprocedure))) > 0
  and position('for share' in lower(pg_get_functiondef(
    'public.derive_video_attempt()'::regprocedure))) > 0,
  'all compatibility triggers serialize against account deletion'
);
select ok(
  position('deletion_started_at' in pg_get_functiondef(
    'public.start_question_session(uuid,uuid,text,smallint[],text[])'::regprocedure)) > 0
  and position('deletion_started_at' in pg_get_functiondef(
    'public.save_question_practice_answer(uuid,uuid,uuid,text)'::regprocedure)) > 0
  and position('deletion_started_at' in pg_get_functiondef(
    'public.complete_question_session(uuid)'::regprocedure)) > 0
  and position('deletion_started_at' in pg_get_functiondef(
    'public.save_video_attempt(uuid,uuid,uuid,text,text)'::regprocedure)) > 0
  and position('for share' in lower(pg_get_functiondef(
    'public.start_question_session(uuid,uuid,text,smallint[],text[])'::regprocedure))) > 0
  and position('for share' in lower(pg_get_functiondef(
    'public.save_question_practice_answer(uuid,uuid,uuid,text)'::regprocedure))) > 0
  and position('for share' in lower(pg_get_functiondef(
    'public.complete_question_session(uuid)'::regprocedure))) > 0
  and position('for share' in lower(pg_get_functiondef(
    'public.save_video_attempt(uuid,uuid,uuid,text,text)'::regprocedure))) > 0,
  'all activity RPCs serialize against account deletion'
);
select ok(
  position('cardinality(new.filter_laws)' in lower(pg_get_functiondef(
    'public.enforce_question_session_server_fields()'::regprocedure))) > 0
  and position('cardinality(new.filter_areas)' in lower(pg_get_functiondef(
    'public.enforce_question_session_server_fields()'::regprocedure))) > 0,
  'old-bundle filter arrays are bounded before unnest'
);
select ok(
  position('cardinality(p_filter_laws)' in lower(pg_get_functiondef(
    'public.start_question_session(uuid,uuid,text,smallint[],text[])'::regprocedure))) > 0
  and position('cardinality(p_filter_areas)' in lower(pg_get_functiondef(
    'public.start_question_session(uuid,uuid,text,smallint[],text[])'::regprocedure))) > 0,
  'RPC filter arrays are bounded before unnest'
);
select ok(
  position('question already answered in this session' in lower(pg_get_functiondef(
    'public.derive_question_practice_answer()'::regprocedure))) > 0
  and position('for update' in lower(pg_get_functiondef(
    'public.derive_question_practice_answer()'::regprocedure))) > 0,
  'compatibility save serializes on the session and rejects repeat questions'
);
select ok(
  position('question already answered in this session' in lower(pg_get_functiondef(
    'public.save_question_practice_answer(uuid,uuid,uuid,text)'::regprocedure))) > 0
  and position('for update' in lower(pg_get_functiondef(
    'public.save_question_practice_answer(uuid,uuid,uuid,text)'::regprocedure))) > 0,
  'RPC save serializes on the session and rejects repeat questions'
);
select ok(
  not exists (
    select 1
    from pg_catalog.pg_index as index_record
    where index_record.indrelid = 'public.question_practice_answers'::regclass
      and index_record.indisunique
      and position('session_id' in pg_get_indexdef(index_record.indexrelid)) > 0
      and position('question_id' in pg_get_indexdef(index_record.indexrelid)) > 0
  ),
  'repeat protection does not add a legacy-data-breaking unique index'
);

-- A delayed direct write from an old bundle must never be silently reassigned
-- after the browser has switched from account A to account B. Exact trigger
-- messages ensure these assertions exercise the compatibility guards, rather
-- than merely relying on the table's RLS rejection.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '70000000-0000-4000-8000-000000000002',
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '70000000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

select throws_ok(
  $$
    insert into public.question_sessions (id, user_id, mode)
    values (
      '71000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      'quick'
    )
  $$,
  '42501',
  'Learner identity changed before the question session was saved',
  'a delayed account-A question session is rejected after switching to B'
);

select throws_ok(
  $$
    insert into public.question_practice_answers (
      id, user_id, question_id, selected_option, is_correct, session_id
    ) values (
      '72000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      '73000000-0000-4000-8000-000000000001',
      'A',
      false,
      null
    )
  $$,
  '42501',
  'Learner identity changed before the practice answer was saved',
  'a delayed account-A practice answer is rejected after switching to B'
);

select throws_ok(
  $$
    insert into public.video_attempts (
      id, user_id, scenario_id, selected_action, selected_sanction,
      action_correct, sanction_correct, is_correct
    ) values (
      '74000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      '75000000-0000-4000-8000-000000000001',
      'Play on — no offence',
      'No card',
      false,
      false,
      false
    )
  $$,
  '42501',
  'Learner identity changed before the video attempt was saved',
  'a delayed account-A video attempt is rejected after switching to B'
);

reset role;

select * from finish();
rollback;
