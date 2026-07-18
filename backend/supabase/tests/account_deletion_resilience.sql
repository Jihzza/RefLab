begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select plan(84);

-- Durable, service-only schema.
select has_table('public', 'account_deletion_jobs', 'durable deletion jobs table exists');
select has_table('public', 'billing_customer_provisioning_intents', 'durable billing intents table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.account_deletion_jobs'::regclass), 'deletion jobs have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.billing_customer_provisioning_intents'::regclass), 'billing intents have RLS');
select ok(exists (
  select 1 from pg_constraint
   where conrelid = 'public.account_deletion_jobs'::regclass
     and contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'c'
), 'auth deletion cascades durable jobs');
select ok(exists (
  select 1 from pg_constraint
   where conrelid = 'public.billing_customer_provisioning_intents'::regclass
     and contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'c'
), 'auth deletion cascades billing intents');
select ok(not has_table_privilege('anon', 'public.account_deletion_jobs', 'SELECT'), 'anon cannot read deletion jobs');
select ok(not has_table_privilege('authenticated', 'public.account_deletion_jobs', 'SELECT'), 'authenticated cannot read deletion jobs');
select ok(has_table_privilege('service_role', 'public.account_deletion_jobs', 'SELECT'), 'service role can read deletion jobs');
select ok(not has_table_privilege('anon', 'public.billing_customer_provisioning_intents', 'SELECT'), 'anon cannot read billing intents');
select ok(not has_table_privilege('authenticated', 'public.billing_customer_provisioning_intents', 'SELECT'), 'authenticated cannot read billing intents');
select ok(has_table_privilege('service_role', 'public.billing_customer_provisioning_intents', 'SELECT'), 'service role can read billing intents');
select ok(not exists (
  select 1 from pg_policies where schemaname = 'public' and tablename = 'account_deletion_jobs'
), 'deletion jobs expose no client policy');
select ok(not exists (
  select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_customer_provisioning_intents'
), 'billing intents expose no client policy');

select has_function(
  'public', 'request_account_deletion', array['uuid'],
  'worker-only deletion enqueue RPC exists'
);
select ok(
  (select not prosecdef
          and coalesce(proconfig @> array['search_path=""'], false)
     from pg_proc
    where oid = 'public.request_account_deletion(uuid)'::regprocedure)
  and not has_function_privilege(
    'authenticated', 'public.request_account_deletion(uuid)', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role', 'public.request_account_deletion(uuid)', 'EXECUTE'
  ),
  'enqueue RPC is fixed-path SECURITY INVOKER and service-only'
);

select ok(exists (
  select 1 from pg_trigger
   where tgrelid = 'public.stripe_customers'::regclass
     and tgname = 'reject_new_billing_customer_during_deletion' and not tgisinternal
), 'Stripe mapping trigger exists');
select ok(exists (
  select 1 from pg_trigger
   where tgrelid = 'public.profiles'::regclass
     and tgname = 'capture_legacy_account_deletion_guard'
     and tgenabled = 'A' and not tgisinternal
), 'legacy deletion guard trigger is always enabled');
select ok(exists (
  select 1 from pg_trigger
   where tgrelid = 'public.profiles'::regclass
     and tgname = 'fence_legacy_account_deletion_guard'
     and tgenabled = 'A' and not tgisinternal
     and (tgtype::integer & 2) = 2
     and (tgtype::integer & 4) = 4
     and (tgtype::integer & 16) = 16
), 'legacy marker changes cross an always-enabled BEFORE fence');
select ok(
  (select not prosecdef
          and coalesce(proconfig @> array['search_path=""'], false)
     from pg_proc
    where oid = 'public.fence_legacy_account_deletion_guard()'::regprocedure)
  and not has_function_privilege(
    'authenticated',
    'public.fence_legacy_account_deletion_guard()',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.fence_legacy_account_deletion_guard()',
    'EXECUTE'
  ),
  'legacy deletion fence is fixed-path SECURITY INVOKER and service-only'
);

select is((select prosecdef from pg_proc where oid = 'public.acquire_account_deletion_lease(uuid,uuid,integer)'::regprocedure), false, 'acquire is SECURITY INVOKER');
select ok(coalesce((select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.acquire_account_deletion_lease(uuid,uuid,integer)'::regprocedure), false), 'acquire fixes an empty search path');
select is((select prosecdef from pg_proc where oid = 'public.begin_billing_customer_provisioning(uuid,text)'::regprocedure), false, 'provision begin is SECURITY INVOKER');
select ok(coalesce((select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.begin_billing_customer_provisioning(uuid,text)'::regprocedure), false), 'provision begin fixes an empty search path');
select is((select prosecdef from pg_proc where oid = 'public.claim_next_account_deletion_job(uuid,integer)'::regprocedure), false, 'worker claim is SECURITY INVOKER');
select ok(coalesce((select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.claim_next_account_deletion_job(uuid,integer)'::regprocedure), false), 'worker claim fixes an empty search path');
select ok(not has_function_privilege('authenticated', 'public.begin_billing_customer_provisioning(uuid,text)', 'EXECUTE'), 'authenticated cannot begin provisioning directly');
select ok(has_function_privilege('service_role', 'public.begin_billing_customer_provisioning(uuid,text)', 'EXECUTE'), 'service role can begin provisioning');
select ok(not has_function_privilege('authenticated', 'public.claim_next_account_deletion_job(uuid,integer)', 'EXECUTE'), 'authenticated cannot claim worker jobs');
select ok(has_function_privilege('service_role', 'public.claim_next_account_deletion_job(uuid,integer)', 'EXECUTE'), 'service role can claim worker jobs');
select ok((select prosecdef from pg_proc where oid = 'public.account_accepts_uploads(uuid)'::regprocedure), 'upload guard remains SECURITY DEFINER');
select ok(position('account_deletion_jobs' in pg_get_functiondef('public.account_accepts_uploads(uuid)'::regprocedure)) > 0, 'upload guard consults durable jobs');

select has_function(
  'public', 'account_deletion_session_is_recent', array[]::text[],
  'session-bound account deletion reauthentication RPC exists'
);
select ok(
  (select prosecdef
          and coalesce(proconfig @> array['search_path=""'], false)
     from pg_proc
    where oid = 'public.account_deletion_session_is_recent()'::regprocedure)
  and has_function_privilege(
    'authenticated',
    'public.account_deletion_session_is_recent()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.account_deletion_session_is_recent()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'public.account_deletion_session_is_recent()',
    'EXECUTE'
  ),
  'session proof is fixed-path SECURITY DEFINER and authenticated-only'
);
select ok((
  select pg_catalog.strpos(definition, 'auth.uid()') > 0
    and pg_catalog.strpos(definition, 'auth.jwt()') > 0
    and pg_catalog.strpos(definition, 'auth.sessions') > 0
    and pg_catalog.strpos(definition, 'session.id = session_identifier') > 0
    and pg_catalog.strpos(definition, 'session.user_id = caller_user_id') > 0
    and pg_catalog.strpos(definition, '''amr''') > 0
    and pg_catalog.strpos(definition, 'last_sign_in_at') = 0
  from (
    select pg_catalog.lower(pg_get_functiondef(
      'public.account_deletion_session_is_recent()'::regprocedure
    )) as definition
  ) as session_proof_definition
), 'session proof binds JWT subject, session ID, AMR and the current Auth row');

-- Two sessions for one account prove that a fresh login elsewhere cannot make
-- an older bearer session eligible. The test bypasses only the Auth FK so it
-- remains independent of auth.users column drift; the RPC still reads the real
-- auth.sessions rows under SECURITY DEFINER.
set local session_replication_role = replica;
insert into auth.sessions (id, user_id, created_at, updated_at) values
  (
    '20000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    statement_timestamp() - interval '1 day',
    statement_timestamp() - interval '1 day'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '21000000-0000-0000-0000-000000000001',
    statement_timestamp(),
    statement_timestamp()
  );

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '21000000-0000-0000-0000-000000000001',
  'role', 'authenticated',
  'session_id', '20000000-0000-0000-0000-000000000001',
  'amr', jsonb_build_array(jsonb_build_object(
    'method', 'password',
    'timestamp', extract(epoch from statement_timestamp() - interval '11 minutes')
  ))
)::text, true);
set local role authenticated;
select is(
  public.account_deletion_session_is_recent(),
  false,
  'old session A is rejected even while fresh session B exists for the account'
);

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '21000000-0000-0000-0000-000000000001',
  'role', 'authenticated',
  'session_id', '20000000-0000-0000-0000-000000000001',
  'amr', jsonb_build_array(jsonb_build_object(
    'method', 'token_refresh',
    'timestamp', extract(epoch from statement_timestamp())
  ))
)::text, true);
set local role authenticated;
select is(
  public.account_deletion_session_is_recent(), false,
  'token refresh alone is not reauthentication'
);

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '21000000-0000-0000-0000-000000000001',
  'role', 'authenticated',
  'session_id', '20000000-0000-0000-0000-000000000001',
  'amr', jsonb_build_array(jsonb_build_object(
    'method', 'password',
    'timestamp', extract(epoch from statement_timestamp() + interval '61 seconds')
  ))
)::text, true);
set local role authenticated;
select is(
  public.account_deletion_session_is_recent(), false,
  'authentication timestamp more than sixty seconds ahead fails closed'
);

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '21000000-0000-0000-0000-000000000001',
  'role', 'authenticated',
  'session_id', '20000000-0000-0000-0000-000000000001'
)::text, true);
set local role authenticated;
select is(
  public.account_deletion_session_is_recent(), false,
  'missing AMR fails closed'
);

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '21000000-0000-0000-0000-000000000001',
  'role', 'authenticated',
  'session_id', '20000000-0000-0000-0000-000000000099',
  'amr', jsonb_build_array(jsonb_build_object(
    'method', 'password',
    'timestamp', extract(epoch from statement_timestamp())
  ))
)::text, true);
set local role authenticated;
select is(
  public.account_deletion_session_is_recent(), false,
  'JWT session ID must still exist in auth.sessions'
);

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '21000000-0000-0000-0000-000000000099',
  'role', 'authenticated',
  'session_id', '20000000-0000-0000-0000-000000000002',
  'amr', jsonb_build_array(jsonb_build_object(
    'method', 'oauth',
    'timestamp', extract(epoch from statement_timestamp())
  ))
)::text, true);
set local role authenticated;
select is(
  public.account_deletion_session_is_recent(), false,
  'JWT subject must own the current Auth session row'
);

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '21000000-0000-0000-0000-000000000001',
  'role', 'authenticated',
  'session_id', 'not-a-uuid',
  'amr', jsonb_build_array(jsonb_build_object(
    'method', 'password',
    'timestamp', extract(epoch from statement_timestamp())
  ))
)::text, true);
set local role authenticated;
select is(
  public.account_deletion_session_is_recent(), false,
  'malformed JWT session ID fails closed'
);

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '21000000-0000-0000-0000-000000000001',
  'role', 'authenticated',
  'session_id', '20000000-0000-0000-0000-000000000002',
  'amr', jsonb_build_array(jsonb_build_object(
    'method', 'oauth',
    'timestamp', extract(epoch from statement_timestamp())
  ))
)::text, true);
set local role authenticated;
select is(
  public.account_deletion_session_is_recent(), true,
  'fresh OAuth reauthentication on current session B is accepted'
);

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', '21000000-0000-0000-0000-000000000001',
  'role', 'authenticated',
  'session_id', '20000000-0000-0000-0000-000000000002',
  'amr', jsonb_build_array(jsonb_build_object(
    'method', 'password',
    'timestamp', extract(epoch from statement_timestamp() - interval '10 minutes')
  ))
)::text, true);
set local role authenticated;
select is(
  public.account_deletion_session_is_recent(), true,
  'password reauthentication at the ten-minute boundary is accepted'
);

reset role;

-- Synthetic identities keep the test independent of GoTrue column drift. The
-- compatibility trigger is ENABLE ALWAYS and therefore still runs here.
insert into public.profiles (id, username, role) values
  ('30000000-0000-0000-0000-000000000001', 'DeletionIntentA', 'user'),
  ('30000000-0000-0000-0000-000000000002', 'DeletionIntentB', 'user'),
  ('30000000-0000-0000-0000-000000000003', 'DeletionLegacy', 'user'),
  ('30000000-0000-0000-0000-000000000004', 'DeletionWorkerOnly', 'user'),
  ('30000000-0000-0000-0000-000000000005', 'DmDeleteFirst', 'user'),
  ('30000000-0000-0000-0000-000000000006', 'DmDeleteSecond', 'user');

select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;

-- The first endpoint deletion preserves the counterpart's conversation and
-- message. The second endpoint deletion dooms the tombstone conversation and
-- cascades the last media reference, which the worker must manifest first.
set local session_replication_role = origin;
insert into public.conversations (id, user_a_id, user_b_id) values (
  '33000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000006'
);
insert into public.conversation_participants (conversation_id, user_id) values
  ('33000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005'),
  ('33000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006');
insert into public.messages (
  id, client_id, conversation_id, sender_id, media_type, media_url
) values
  (
    '33100000-0000-0000-0000-000000000001',
    '33100000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000005',
    'image',
    '33000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000005/33100000-0000-0000-0000-000000000001.webp'
  ),
  (
    '33100000-0000-0000-0000-000000000002',
    '33100000-0000-0000-0000-000000000002',
    '33000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000006',
    'image',
    '33000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000006/33100000-0000-0000-0000-000000000002.webp'
  );

delete from public.profiles
 where id = '30000000-0000-0000-0000-000000000005';
select ok(
  exists (
    select 1 from public.conversations
     where id = '33000000-0000-0000-0000-000000000001'
       and user_a_id is null
       and user_b_id = '30000000-0000-0000-0000-000000000006'
  )
  and not exists (
    select 1 from public.messages
     where id = '33100000-0000-0000-0000-000000000001'
  )
  and exists (
    select 1 from public.messages
     where id = '33100000-0000-0000-0000-000000000002'
  ),
  'first endpoint deletion preserves the surviving participant message and media reference'
);

delete from public.profiles
 where id = '30000000-0000-0000-0000-000000000006';
select ok(
  not exists (
    select 1 from public.conversations
     where id = '33000000-0000-0000-0000-000000000001'
  )
  and not exists (
    select 1 from public.messages
     where conversation_id = '33000000-0000-0000-0000-000000000001'
  ),
  'last endpoint deletion dooms the conversation and cascades counterpart media references'
);
set local session_replication_role = replica;

select is((
  select deletion_in_progress
    from public.begin_billing_customer_provisioning(
      '30000000-0000-0000-0000-000000000001', 'first@example.test'
    )
), false, 'provisioning may begin before deletion');

select ok((
  select a.intent_id = b.intent_id and a.idempotency_key = b.idempotency_key
    from public.begin_billing_customer_provisioning(
      '30000000-0000-0000-0000-000000000001', 'first@example.test'
    ) as a
    cross join public.begin_billing_customer_provisioning(
      '30000000-0000-0000-0000-000000000001', 'changed@example.test'
    ) as b
), 'retries reuse the same exact persisted intent and key');

select ok(exists (
  select 1 from public.billing_customer_provisioning_intents
   where user_id = '30000000-0000-0000-0000-000000000001'
     and status = 'pending'
     and customer_email = 'first@example.test'
     and stripe_customer_id is null
), 'intent is durable before any Stripe customer result');

select is((
  select phase from public.acquire_account_deletion_lease(
    '30000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000001', 900
  )
), 'requested', 'deletion starts after seeing the committed durable intent');

select is((
  select deletion_in_progress
    from public.complete_billing_customer_provisioning(
      '30000000-0000-0000-0000-000000000001',
      (select intent_id from public.billing_customer_provisioning_intents where user_id = '30000000-0000-0000-0000-000000000001'),
      'cus_recovered_after_delete'
    )
), true, 'late Stripe result is assigned to deletion instead of checkout');

select is((
  select stripe_customer_id from public.billing_customer_provisioning_intents
   where user_id = '30000000-0000-0000-0000-000000000001'
), 'cus_recovered_after_delete', 'late Stripe customer remains durably recoverable');

select ok(not exists (
  select 1 from public.stripe_customers where user_id = '30000000-0000-0000-0000-000000000001'
), 'late Stripe result is never remapped during deletion');

select is((
  select phase from public.acquire_account_deletion_lease(
    '30000000-0000-0000-0000-000000000002',
    '32000000-0000-0000-0000-000000000001', 900
  )
), 'requested', 'inverse race starts deletion first');

select is((
  select deletion_in_progress from public.begin_billing_customer_provisioning(
    '30000000-0000-0000-0000-000000000002', 'blocked@example.test'
  )
), true, 'provision begin observes deletion and refuses to create an intent');

update public.profiles
   set deletion_started_at = statement_timestamp()
 where id = '30000000-0000-0000-0000-000000000003';
select is((
  select phase from public.account_deletion_jobs
   where user_id = '30000000-0000-0000-0000-000000000003'
), 'billing_closing', 'legacy guard changes become durable billing_closing jobs');

select is((
  select count(*)::integer from public.acquire_account_deletion_lease(
    '30000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000099', 900
  )
), 0, 'a live deletion lease cannot be overlapped');

select is(public.release_account_deletion_lease(
  '30000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001', 'requested:test_failure'
), true, 'caught failure releases the lease');
select ok(exists (
  select 1 from public.account_deletion_jobs
   where user_id = '30000000-0000-0000-0000-000000000001'
     and phase = 'requested' and lease_id is null
     and last_error = 'requested:test_failure'
), 'even requested-phase failures preserve autonomous work');

-- Isolate deterministic scheduled-worker claim/takeover checks.
delete from public.account_deletion_jobs;

select ok((
  select request.phase = 'requested'
         and job.lease_id is null
         and job.attempt_count = 0
    from public.request_account_deletion(
      '30000000-0000-0000-0000-000000000004'
    ) as request
    join public.account_deletion_jobs as job using (user_id)
), 'HTTP-facing request creates only an unleased durable worker job');
select is((
  select count(*)::integer
    from public.request_account_deletion(
      '30000000-0000-0000-0000-000000000004'
    ) as retry
    join public.account_deletion_jobs as job using (user_id)
   where job.lease_id is null
), 1, 'response-loss retry reuses the existing unleased job');
select is((
  select phase from public.claim_next_account_deletion_job(
    '31000000-0000-0000-0000-000000000004', 900
  )
), 'requested', 'only the worker claims and executes an enqueued deletion');

delete from public.account_deletion_jobs;
insert into public.profiles (id, username, role) values
  ('40000000-0000-0000-0000-000000000001', 'WorkerPhase1', 'user'),
  ('40000000-0000-0000-0000-000000000002', 'WorkerPhase2', 'user'),
  ('40000000-0000-0000-0000-000000000003', 'WorkerPhase3', 'user'),
  ('40000000-0000-0000-0000-000000000004', 'WorkerPhase4', 'user'),
  ('40000000-0000-0000-0000-000000000005', 'WorkerPhase5', 'user');
insert into public.account_deletion_jobs (
  user_id, phase, lease_id, lease_acquired_at, lease_expires_at, created_at
) values
  ('40000000-0000-0000-0000-000000000001', 'requested', null, null, null, '2026-07-18 10:00:01+00'),
  ('40000000-0000-0000-0000-000000000002', 'billing_closing', null, null, null, '2026-07-18 10:00:02+00'),
  ('40000000-0000-0000-0000-000000000003', 'billing_closed', null, null, null, '2026-07-18 10:00:03+00'),
  ('40000000-0000-0000-0000-000000000004', 'storage_purged', null, null, null, '2026-07-18 10:00:04+00'),
  ('40000000-0000-0000-0000-000000000005', 'auth', null, null, null, '2026-07-18 10:00:05+00');

select is((select phase from public.claim_next_account_deletion_job('41000000-0000-0000-0000-000000000001', 900)), 'requested', 'worker claims released requested job');
select is((select phase from public.claim_next_account_deletion_job('41000000-0000-0000-0000-000000000002', 900)), 'billing_closing', 'worker claims released billing_closing job');
select is((select phase from public.claim_next_account_deletion_job('41000000-0000-0000-0000-000000000003', 900)), 'billing_closed', 'worker claims released billing_closed job');
select is((select phase from public.claim_next_account_deletion_job('41000000-0000-0000-0000-000000000004', 900)), 'storage_purged', 'worker claims released storage_purged job');
select is((select phase from public.claim_next_account_deletion_job('41000000-0000-0000-0000-000000000005', 900)), 'auth', 'worker claims released auth job');
select is((select count(*)::integer from public.claim_next_account_deletion_job('41000000-0000-0000-0000-000000000099', 900)), 0, 'worker cannot steal active leases');

update public.account_deletion_jobs
   set lease_expires_at = statement_timestamp() - interval '1 second';
select is((select phase from public.claim_next_account_deletion_job('42000000-0000-0000-0000-000000000001', 900)), 'requested', 'process-kill takeover resumes requested');
select is((select phase from public.claim_next_account_deletion_job('42000000-0000-0000-0000-000000000002', 900)), 'billing_closing', 'process-kill takeover resumes billing_closing');
select is((select phase from public.claim_next_account_deletion_job('42000000-0000-0000-0000-000000000003', 900)), 'billing_closed', 'process-kill takeover resumes billing_closed');
select is((select phase from public.claim_next_account_deletion_job('42000000-0000-0000-0000-000000000004', 900)), 'storage_purged', 'process-kill takeover resumes storage_purged');
select is((select phase from public.claim_next_account_deletion_job('42000000-0000-0000-0000-000000000005', 900)), 'auth', 'process-kill takeover resumes auth');

select throws_ok($$
  select * from public.advance_account_deletion_phase(
    '40000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000001',
    'requested', 'storage_purged'
  )
$$, '22023', null, 'database rejects phase skipping');
select is(public.account_accepts_checkout('40000000-0000-0000-0000-000000000001'), false, 'durable job blocks checkout');

reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', '40000000-0000-0000-0000-000000000001', 'role', 'authenticated'
)::text, true);
set local role authenticated;
select is(public.account_accepts_uploads('40000000-0000-0000-0000-000000000001'), false, 'durable job blocks uploads');

reset role;
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;
select is((select phase from public.acquire_account_deletion_lease(
  '50000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001', 900
)), 'requested', 'missing profile does not prevent auth-owned deletion job');
select throws_ok($$
  update public.account_deletion_jobs set lease_expires_at = null
   where user_id = '50000000-0000-0000-0000-000000000001'
$$, '23514', null, 'lease id and expiry remain paired');

reset role;
set local session_replication_role = origin;
set local role service_role;
select throws_ok($$
  insert into public.stripe_customers (user_id, stripe_customer_id)
  values ('40000000-0000-0000-0000-000000000001', 'cus_blocked_during_delete')
$$, '55000', null, 'Stripe mapping cannot race an active deletion');

select ok(
  position('413562871' in pg_get_functiondef('public.begin_billing_customer_provisioning(uuid,text)'::regprocedure)) > 0
  and position('413562871' in pg_get_functiondef('public.request_account_deletion(uuid)'::regprocedure)) > 0
  and position('413562871' in pg_get_functiondef('public.acquire_account_deletion_lease(uuid,uuid,integer)'::regprocedure)) > 0,
  'provision begin, deletion request and lease acquire share one advisory lock namespace'
);
select ok((
  select
    pg_catalog.strpos(definition, 'reflab:profile-media-quota:') > 0
    and pg_catalog.strpos(definition, 'reflab:profile-media-quota:')
      < pg_catalog.strpos(definition, 'reflab:post-media-quota:')
    and pg_catalog.strpos(definition, 'reflab:post-media-quota:')
      < pg_catalog.strpos(definition, 'reflab:message-media-quota:')
    and pg_catalog.strpos(definition, 'reflab:message-media-quota:')
      < pg_catalog.strpos(
        definition,
        'insert into public.account_deletion_jobs'
      )
  from (
    select pg_catalog.lower(
      pg_get_functiondef(
        'public.request_account_deletion(uuid)'::regprocedure
      )
    ) as definition
  ) as request_definition
), 'deletion locks profile, post and message upload admission before enqueue');
select ok((
  select pg_catalog.bool_and(
    pg_catalog.strpos(definition, 'reflab:profile-media-quota:') > 0
    and pg_catalog.strpos(definition, 'reflab:profile-media-quota:')
      < pg_catalog.strpos(definition, 'reflab:post-media-quota:')
    and pg_catalog.strpos(definition, 'reflab:post-media-quota:')
      < pg_catalog.strpos(definition, 'reflab:message-media-quota:')
  )
  from (
    values
      (pg_catalog.lower(pg_get_functiondef(
        'public.fence_legacy_account_deletion_guard()'::regprocedure
      ))),
      (pg_catalog.lower(pg_get_functiondef(
        'public.acquire_account_deletion_lease(uuid,uuid,integer)'::regprocedure
      )))
  ) as guarded_entrypoints(definition)
), 'legacy and direct-lease deletion paths share the fixed upload lock order');
select ok(
  position('413562871' in pg_get_functiondef('public.complete_billing_customer_provisioning(uuid,uuid,text)'::regprocedure)) > 0,
  'provision completion shares the deletion advisory lock namespace'
);
select ok(
  position('413562871' in pg_get_functiondef('public.reject_new_billing_customer_during_deletion()'::regprocedure)) > 0,
  'direct mapping trigger shares the deletion advisory lock namespace'
);

reset role;
select * from finish();
rollback;
