-- Learning activity integrity: final post-cutover pgTAP gate.
-- Run only on disposable staging after both 20260718102753 and 20260718102755.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select plan(76);

select has_column('public', 'question_bank', 'is_active', 'question availability exists');
select ok(
  (select attribute.attnotnull
   from pg_catalog.pg_attribute as attribute
   where attribute.attrelid = 'public.question_bank'::regclass
     and attribute.attname = 'is_active'),
  'question availability is non-null'
);
select ok(
  exists (select 1 from pg_catalog.pg_indexes
          where schemaname = 'public' and indexname = 'question_bank_active_law_idx'),
  'active law lookup is indexed'
);
select ok(
  exists (select 1 from pg_catalog.pg_indexes
          where schemaname = 'public' and indexname = 'question_bank_active_topic_idx'),
  'active topic lookup is indexed'
);

select has_function('public', 'start_question_session',
  array['uuid', 'uuid', 'text', 'smallint[]', 'text[]'],
  'expected-user session start RPC exists');
select hasnt_function('public', 'start_question_session',
  array['uuid', 'text', 'smallint[]', 'text[]'],
  'the user-implicit session start overload is removed after cutover');
select has_function('public', 'save_question_practice_answer',
  array['uuid', 'uuid', 'uuid', 'text'], 'practice save RPC exists');
select has_function('public', 'complete_question_session',
  array['uuid'], 'session completion RPC exists');
select has_function('public', 'save_video_attempt',
  array['uuid', 'uuid', 'uuid', 'text', 'text'],
  'expected-user video save RPC exists');
select hasnt_function('public', 'save_video_attempt',
  array['uuid', 'uuid', 'text', 'text'],
  'the user-implicit video save overload is removed after cutover');

select has_trigger('public', 'question_sessions',
  'enforce_question_session_server_fields', 'session derivation trigger remains');
select has_trigger('public', 'question_practice_answers',
  'derive_question_practice_answer', 'practice derivation trigger remains');
select has_trigger('public', 'video_attempts',
  'derive_video_attempt', 'video derivation trigger remains');

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

select ok((select prosecdef from pg_catalog.pg_proc
  where oid = 'public.start_question_session(uuid,uuid,text,smallint[],text[])'::regprocedure),
  'session start is SECURITY DEFINER');
select ok((select prosecdef from pg_catalog.pg_proc
  where oid = 'public.save_question_practice_answer(uuid,uuid,uuid,text)'::regprocedure),
  'practice save is SECURITY DEFINER');
select ok((select prosecdef from pg_catalog.pg_proc
  where oid = 'public.complete_question_session(uuid)'::regprocedure),
  'session completion is SECURITY DEFINER');
select ok((select prosecdef from pg_catalog.pg_proc
  where oid = 'public.save_video_attempt(uuid,uuid,uuid,text,text)'::regprocedure),
  'video save is SECURITY DEFINER');

select ok(coalesce((select proconfig @> array['search_path=""'] from pg_catalog.pg_proc
  where oid = 'public.start_question_session(uuid,uuid,text,smallint[],text[])'::regprocedure), false),
  'session start fixes an empty search path');
select ok(coalesce((select proconfig @> array['search_path=""'] from pg_catalog.pg_proc
  where oid = 'public.save_question_practice_answer(uuid,uuid,uuid,text)'::regprocedure), false),
  'practice save fixes an empty search path');
select ok(coalesce((select proconfig @> array['search_path=""'] from pg_catalog.pg_proc
  where oid = 'public.complete_question_session(uuid)'::regprocedure), false),
  'session completion fixes an empty search path');
select ok(coalesce((select proconfig @> array['search_path=""'] from pg_catalog.pg_proc
  where oid = 'public.save_video_attempt(uuid,uuid,uuid,text,text)'::regprocedure), false),
  'video save fixes an empty search path');

select ok(has_function_privilege('authenticated',
  'public.start_question_session(uuid,uuid,text,smallint[],text[])', 'EXECUTE'),
  'authenticated can execute session start');
select ok(has_function_privilege('authenticated',
  'public.save_question_practice_answer(uuid,uuid,uuid,text)', 'EXECUTE'),
  'authenticated can execute practice save');
select ok(has_function_privilege('authenticated',
  'public.complete_question_session(uuid)', 'EXECUTE'),
  'authenticated can execute session completion');
select ok(has_function_privilege('authenticated',
  'public.save_video_attempt(uuid,uuid,uuid,text,text)', 'EXECUTE'),
  'authenticated can execute video save');

select ok(not has_function_privilege('anon',
  'public.start_question_session(uuid,uuid,text,smallint[],text[])', 'EXECUTE'),
  'anon cannot execute session start');
select ok(not has_function_privilege('anon',
  'public.save_question_practice_answer(uuid,uuid,uuid,text)', 'EXECUTE'),
  'anon cannot execute practice save');
select ok(not has_function_privilege('anon',
  'public.complete_question_session(uuid)', 'EXECUTE'),
  'anon cannot execute session completion');
select ok(not has_function_privilege('anon',
  'public.save_video_attempt(uuid,uuid,uuid,text,text)', 'EXECUTE'),
  'anon cannot execute video save');

select ok(not has_table_privilege('authenticated', 'public.question_sessions', 'INSERT'),
  'authenticated cannot insert sessions directly');
select ok(not has_table_privilege('authenticated', 'public.question_sessions', 'UPDATE'),
  'authenticated cannot update sessions directly');
select ok(not has_table_privilege('authenticated', 'public.question_practice_answers', 'INSERT'),
  'authenticated cannot insert practice answers directly');
select ok(not has_table_privilege('authenticated', 'public.video_attempts', 'INSERT'),
  'authenticated cannot insert video attempts directly');
select ok(
  not has_table_privilege('authenticated', 'public.question_sessions', 'DELETE')
  and not has_table_privilege('authenticated', 'public.question_sessions', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'public.question_sessions', 'TRIGGER')
  and not has_table_privilege('authenticated', 'public.question_practice_answers', 'DELETE')
  and not has_table_privilege('authenticated', 'public.question_practice_answers', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'public.question_practice_answers', 'TRIGGER')
  and not has_table_privilege('authenticated', 'public.video_attempts', 'DELETE')
  and not has_table_privilege('authenticated', 'public.video_attempts', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'public.video_attempts', 'TRIGGER'),
  'authenticated retains no direct destructive or trigger authority'
);
select ok(not has_any_column_privilege('authenticated', 'public.question_sessions', 'INSERT,UPDATE'),
  'session column mutation grants are also removed');
select ok(not has_any_column_privilege('authenticated', 'public.question_practice_answers', 'INSERT,UPDATE'),
  'practice column mutation grants are also removed');
select ok(not has_any_column_privilege('authenticated', 'public.video_attempts', 'INSERT,UPDATE'),
  'video column mutation grants are also removed');

select ok(has_table_privilege('authenticated', 'public.question_sessions', 'SELECT'),
  'authenticated retains session history reads');
select ok(has_table_privilege('authenticated', 'public.question_practice_answers', 'SELECT'),
  'authenticated retains practice history reads');
select ok(has_table_privilege('authenticated', 'public.video_attempts', 'SELECT'),
  'authenticated retains video history reads');
select is(
  (select count(*)::integer from pg_catalog.pg_policies as policy
   where policy.schemaname = 'public' and (
     (policy.tablename = 'question_sessions'
      and policy.policyname in ('question_sessions_insert_own', 'question_sessions_update_own'))
     or (policy.tablename = 'question_practice_answers'
         and policy.policyname = 'practice_answers_insert_own')
     or (policy.tablename = 'video_attempts'
         and policy.policyname = 'video_attempts_insert_own'))),
  0,
  'all legacy mutation policies are removed'
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
    'public.save_video_attempt(uuid,uuid,uuid,text,text)'::regprocedure))) > 0
  and position('p_expected_user_id' in pg_get_functiondef(
    'public.start_question_session(uuid,uuid,text,smallint[],text[])'::regprocedure)) > 0
  and position('is distinct from actor_id' in pg_get_functiondef(
    'public.save_video_attempt(uuid,uuid,uuid,text,text)'::regprocedure)) > 0,
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
  'compatibility save serializes and rejects repeat questions'
);
select ok(
  position('question already answered in this session' in lower(pg_get_functiondef(
    'public.save_question_practice_answer(uuid,uuid,uuid,text)'::regprocedure))) > 0
  and position('for update' in lower(pg_get_functiondef(
    'public.save_question_practice_answer(uuid,uuid,uuid,text)'::regprocedure))) > 0,
  'RPC save serializes and rejects repeat questions'
);
select ok(
  not exists (
    select 1 from pg_catalog.pg_index as index_record
    where index_record.indrelid = 'public.question_practice_answers'::regclass
      and index_record.indisunique
      and position('session_id' in pg_get_indexdef(index_record.indexrelid)) > 0
      and position('question_id' in pg_get_indexdef(index_record.indexrelid)) > 0
  ),
  'repeat protection preserves legacy duplicates without a unique index'
);

-- Synthetic rows avoid depending on GoTrue's internal column layout. Keeping
-- replication_role=replica disables FKs/triggers while the RPC bodies still
-- exercise their explicit auth binding, validation, locking, derivation and
-- idempotency logic.
set local session_replication_role = replica;

insert into public.profiles (id, username, role, deletion_started_at) values
  ('40000000-0000-0000-0000-000000000001', 'LearningUserOne', 'user', null),
  ('40000000-0000-0000-0000-000000000002', 'LearningUserTwo', 'user', null),
  ('40000000-0000-0000-0000-000000000003', 'LearningDeleting', 'user', statement_timestamp());

insert into public.question_bank (
  id, question_text, option_a, option_b, option_c, option_d,
  correct_option, topic, law, is_active
) values
  ('40000000-0000-0000-0000-000000000010', 'Active law question?', 'A1', 'B1', 'C1', 'D1', 'B', 'Offside', 12, true),
  ('40000000-0000-0000-0000-000000000011', 'Other pool question?', 'A2', 'B2', 'C2', 'D2', 'A', 'Fouls', 13, true),
  ('40000000-0000-0000-0000-000000000012', 'Inactive question?', 'A3', 'B3', 'C3', 'D3', 'A', 'Offside', 12, false);

insert into public.video_scenarios (
  id, title, description, video_url, topic,
  correct_action, correct_sanction, is_active
) values
  ('40000000-0000-0000-0000-000000000020', 'Active scenario', null, 'active.mp4', 'Offside', 'Indirect free kick', 'No card', true),
  ('40000000-0000-0000-0000-000000000021', 'Inactive scenario', null, 'inactive.mp4', 'Offside', 'Indirect free kick', 'No card', false);

select set_config('request.jwt.claims', json_build_object(
  'sub', '40000000-0000-0000-0000-000000000001', 'role', 'authenticated'
)::text, true);
select set_config('request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$select * from public.start_question_session(
    '40000000-0000-0000-0000-000000000037',
    '40000000-0000-0000-0000-000000000002',
    'quick', null, null)$$,
  '42501', 'Learner identity changed before the session was started',
  'account A cannot start a session queued for account B'
);

select throws_ok(
  $$select * from public.save_video_attempt(
    '40000000-0000-0000-0000-000000000053',
    '40000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000020',
    'Indirect free kick', 'No card')$$,
  '42501', 'Learner identity changed before the video attempt was saved',
  'account A cannot save a video decision queued for account B'
);

select throws_ok(
  $$select * from public.start_question_session(
    '40000000-0000-0000-0000-000000000033',
    '40000000-0000-0000-0000-000000000001', 'by_law',
    array[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,17]::smallint[], null)$$,
  '22023', 'p_filter_laws cannot contain more than 17 values',
  'law arrays are bounded before normalization and unnest'
);

select throws_ok(
  $$select * from public.start_question_session(
    '40000000-0000-0000-0000-000000000034',
    '40000000-0000-0000-0000-000000000001', 'by_area', null,
    array_fill('Offside'::text, array[51]))$$,
  '22023', 'p_filter_areas cannot contain more than 50 values',
  'area arrays are bounded before normalization and unnest'
);

select throws_ok(
  $$select * from public.start_question_session(
    '40000000-0000-0000-0000-000000000035',
    '40000000-0000-0000-0000-000000000001', 'by_area', null,
    array[repeat('x', 121)]::text[])$$,
  '22023', 'p_filter_areas values must contain 1 through 120 characters',
  'individual area names have a bounded length'
);

select is(
  (select session.user_id from public.start_question_session(
    '40000000-0000-0000-0000-000000000030',
    '40000000-0000-0000-0000-000000000001', 'by_law',
    array[12]::smallint[], null
  ) as session),
  '40000000-0000-0000-0000-000000000001'::uuid,
  'session start binds user_id to auth.uid()'
);

select is(
  (select session.id from public.start_question_session(
    '40000000-0000-0000-0000-000000000030',
    '40000000-0000-0000-0000-000000000001', 'by_law',
    array[12]::smallint[], null
  ) as session),
  '40000000-0000-0000-0000-000000000030'::uuid,
  'an exact session-start retry returns the original row'
);

select is(
  (select answer.is_correct from public.save_question_practice_answer(
    '40000000-0000-0000-0000-000000000040',
    '40000000-0000-0000-0000-000000000030',
    '40000000-0000-0000-0000-000000000010', 'A'
  ) as answer),
  false,
  'practice correctness is derived from question_bank'
);

select is(
  (select answer.id from public.save_question_practice_answer(
    '40000000-0000-0000-0000-000000000040',
    '40000000-0000-0000-0000-000000000030',
    '40000000-0000-0000-0000-000000000010', 'A'
  ) as answer),
  '40000000-0000-0000-0000-000000000040'::uuid,
  'an exact practice-save retry returns the original row'
);

select throws_ok(
  $$select * from public.save_question_practice_answer(
    '40000000-0000-0000-0000-000000000040',
    '40000000-0000-0000-0000-000000000030',
    '40000000-0000-0000-0000-000000000010', 'B')$$,
  '23505', 'Answer id was already used with different parameters',
  'a conflicting practice retry is rejected'
);

select throws_ok(
  $$select * from public.save_question_practice_answer(
    '40000000-0000-0000-0000-000000000045',
    '40000000-0000-0000-0000-000000000030',
    '40000000-0000-0000-0000-000000000010', 'A')$$,
  '23505', 'Question already answered in this session',
  'a different id cannot inflate one session by repeating a question'
);

reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', '40000000-0000-0000-0000-000000000002', 'role', 'authenticated'
)::text, true);
select set_config('request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$select * from public.save_question_practice_answer(
    '40000000-0000-0000-0000-000000000041',
    '40000000-0000-0000-0000-000000000030',
    '40000000-0000-0000-0000-000000000010', 'B')$$,
  '42501', 'Question session does not belong to the authenticated user',
  'another user cannot write into the session'
);

reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', '40000000-0000-0000-0000-000000000001', 'role', 'authenticated'
)::text, true);
select set_config('request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select ok(
  (select session.ended_at is not null
          and session.duration_seconds >= 0
          and session.total_answered = 1
          and session.total_correct = 0
   from public.complete_question_session(
     '40000000-0000-0000-0000-000000000030'
   ) as session),
  'completion derives server timing and answer totals'
);

select is(
  (select session.total_answered from public.complete_question_session(
    '40000000-0000-0000-0000-000000000030'
  ) as session),
  1,
  'session completion is idempotent'
);

select throws_ok(
  $$select * from public.save_question_practice_answer(
    '40000000-0000-0000-0000-000000000042',
    '40000000-0000-0000-0000-000000000030',
    '40000000-0000-0000-0000-000000000010', 'B')$$,
  '55000', 'Question session is already complete',
  'new answers are rejected after completion'
);

select lives_ok(
  $$select * from public.start_question_session(
    '40000000-0000-0000-0000-000000000031',
    '40000000-0000-0000-0000-000000000001', 'by_area', null,
    array['Offside']::text[])$$,
  'a valid area-filtered session starts'
);

select lives_ok(
  $$select * from public.save_question_practice_answer(
    '40000000-0000-0000-0000-000000000046',
    '40000000-0000-0000-0000-000000000031',
    '40000000-0000-0000-0000-000000000010', 'B')$$,
  'the same question remains answerable in a different session'
);

select throws_ok(
  $$select * from public.save_question_practice_answer(
    '40000000-0000-0000-0000-000000000043',
    '40000000-0000-0000-0000-000000000031',
    '40000000-0000-0000-0000-000000000011', 'A')$$,
  '22023', 'Question does not belong to this session pool',
  'practice save rejects a question outside the session filter'
);

select throws_ok(
  $$select * from public.save_question_practice_answer(
    '40000000-0000-0000-0000-000000000044',
    '40000000-0000-0000-0000-000000000031',
    '40000000-0000-0000-0000-000000000012', 'A')$$,
  'P0002', 'Question does not exist or is inactive',
  'practice save rejects an inactive question'
);

select ok(
  (select attempt.action_correct = false
          and attempt.sanction_correct = true
          and attempt.is_correct = false
   from public.save_video_attempt(
     '40000000-0000-0000-0000-000000000050',
     '40000000-0000-0000-0000-000000000001',
     '40000000-0000-0000-0000-000000000020',
     'Direct free kick', 'No card'
   ) as attempt),
  'video correctness is derived from the active scenario'
);

select is(
  (select attempt.id from public.save_video_attempt(
    '40000000-0000-0000-0000-000000000050',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000020',
    'Direct free kick', 'No card'
  ) as attempt),
  '40000000-0000-0000-0000-000000000050'::uuid,
  'an exact video retry returns the original row'
);

select throws_ok(
  $$select * from public.save_video_attempt(
    '40000000-0000-0000-0000-000000000050',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000020',
    'Indirect free kick', 'No card')$$,
  '23505', 'Video attempt id was already used with different parameters',
  'a conflicting video retry is rejected'
);

select throws_ok(
  $$select * from public.save_video_attempt(
    '40000000-0000-0000-0000-000000000051',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000021',
    'Indirect free kick', 'No card')$$,
  'P0002', 'Video scenario does not exist or is inactive',
  'video save rejects an inactive scenario'
);

select throws_ok(
  $$select * from public.save_video_attempt(
    '40000000-0000-0000-0000-000000000052',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000020',
    'TBD', 'No card')$$,
  '22023', 'Unsupported video action',
  'video save rejects an unsupported action'
);

reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', '40000000-0000-0000-0000-000000000003', 'role', 'authenticated'
)::text, true);
select set_config('request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000003', true);
set local role authenticated;

select throws_ok(
  $$select * from public.start_question_session(
    '40000000-0000-0000-0000-000000000036',
    '40000000-0000-0000-0000-000000000003',
    'quick', null, null)$$,
  '55000', 'Learning writes are unavailable while account deletion is pending',
  'learning RPCs reject accounts whose deletion has started'
);

reset role;
select set_config('request.jwt.claims', json_build_object('role', 'authenticated')::text, true);
select set_config('request.jwt.claim.sub', '', true);
set local role authenticated;

select throws_ok(
  $$select * from public.start_question_session(
    '40000000-0000-0000-0000-000000000032',
    '40000000-0000-0000-0000-000000000001',
    'quick', null, null)$$,
  '42501', 'Authentication required',
  'RPCs reject a missing auth.uid()'
);

reset role;
select * from finish();
rollback;
