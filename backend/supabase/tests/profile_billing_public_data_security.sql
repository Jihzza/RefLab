begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select plan(83);

-- Stable fixtures without depending on the current GoTrue auth.users shape.
-- The transaction is rolled back at the end, and referential triggers are only
-- disabled while these two synthetic identities are inserted.
set local session_replication_role = replica;

insert into public.profiles (id, username, role)
values
  ('10000000-0000-0000-0000-000000000001', 'SecurityUserA', 'user'),
  ('10000000-0000-0000-0000-000000000002', 'SecurityUserB', 'user'),
  ('10000000-0000-0000-0000-000000000003', 'LegacyProfileAdmin', 'admin');

insert into public.stripe_subscriptions (
  user_id,
  stripe_subscription_id,
  price_id,
  plan,
  status
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'sub_security_a',
    'price_security_a',
    'pro',
    'active'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'sub_security_b',
    'price_security_b',
    'plus',
    'active'
  );

set local session_replication_role = origin;

-- Profiles expose only the intended client-write columns.
select ok(
  has_column_privilege(
    'authenticated',
    'public.profiles',
    'name',
    'UPDATE'
  ),
  'authenticated can update legitimate profile fields'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'role',
    'UPDATE'
  ),
  'authenticated has no UPDATE privilege on profiles.role'
);

select ok(
  case
    when exists (
      select 1
        from information_schema.columns
       where table_schema = 'public'
         and table_name = 'profiles'
         and column_name = 'total_xp'
    ) then not has_column_privilege(
      'authenticated',
      'public.profiles',
      'total_xp',
      'UPDATE'
    )
    else true
  end,
  'authenticated has no UPDATE privilege on profiles.total_xp when present'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'role',
    'INSERT'
  ),
  'authenticated has no INSERT privilege on profiles.role'
);

select ok(
  not has_schema_privilege('anon', 'public', 'CREATE'),
  'anonymous callers cannot create objects in the public schema'
);

select ok(
  not has_schema_privilege('authenticated', 'public', 'CREATE'),
  'authenticated callers cannot create objects in the public schema'
);

select ok(
  not exists (
    select 1
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and not exists (
         select 1
           from unnest(coalesce(p.proconfig, array[]::text[])) as setting
          where setting like 'search_path=%'
       )
  ),
  'every public SECURITY DEFINER function has a fixed search_path'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'email',
    'INSERT'
  ),
  'authenticated cannot forge profiles.email during manual repair'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'last_login_at',
    'INSERT'
  ),
  'authenticated cannot forge profiles.last_login_at during manual repair'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'email',
    'SELECT'
  ),
  'authenticated cannot select profiles.email'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'role',
    'SELECT'
  ),
  'authenticated cannot select profiles.role'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'last_login_at',
    'SELECT'
  ),
  'authenticated cannot select profiles.last_login_at'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'last_login_at',
    'UPDATE'
  ),
  'authenticated cannot forge profiles.last_login_at'
);

select is(
  (
    select p.prosecdef
      from pg_catalog.pg_proc as p
     where p.oid = 'public.touch_last_login()'::regprocedure
  ),
  true,
  'touch_last_login is SECURITY DEFINER'
);

select ok(
  coalesce(
    (
      select p.proconfig @> array['search_path=""']
        from pg_catalog.pg_proc as p
       where p.oid = 'public.touch_last_login()'::regprocedure
    ),
    false
  ),
  'touch_last_login has an empty fixed search_path'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.touch_last_login()',
    'EXECUTE'
  ),
  'authenticated can record their own server login time'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.touch_last_login()',
    'EXECUTE'
  ),
  'anon cannot execute touch_last_login'
);

select ok(
  not has_function_privilege(
    'service_role',
    'public.touch_last_login()',
    'EXECUTE'
  ),
  'service_role does not need the user-session login RPC'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'deletion_started_at',
    'UPDATE'
  ),
  'authenticated cannot set the account deletion guard timestamp'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'deletion_guard_id',
    'UPDATE'
  ),
  'authenticated cannot set the account deletion guard token'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'deletion_started_at',
    'SELECT'
  ),
  'authenticated cannot read the private account deletion state'
);

select ok(
  (
    select p.prosecdef
      from pg_catalog.pg_proc as p
     where p.oid = 'public.account_accepts_uploads(uuid)'::regprocedure
  ),
  'account_accepts_uploads is SECURITY DEFINER'
);

select ok(
  coalesce(
    (
      select p.proconfig @> array['search_path=""']
        from pg_catalog.pg_proc as p
       where p.oid = 'public.account_accepts_uploads(uuid)'::regprocedure
    ),
    false
  ),
  'account_accepts_uploads has an empty fixed search_path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.account_accepts_uploads(uuid)',
    'EXECUTE'
  ),
  'anon cannot execute account_accepts_uploads'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.account_accepts_uploads(uuid)',
    'EXECUTE'
  ),
  'authenticated can execute account_accepts_uploads'
);

select ok(
  exists (
    select 1
      from pg_catalog.pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname = 'Authenticated users can upload profile media'
       and position('account_accepts_uploads' in coalesce(with_check, '')) > 0
  ),
  'profile-media uploads consult the account deletion guard'
);

select ok(
  exists (
    select 1
      from pg_catalog.pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname = 'Authenticated users can upload post media'
       and position('account_accepts_uploads' in coalesce(with_check, '')) > 0
  ),
  'post-media uploads consult the account deletion guard'
);

-- The billing helper must be invoker-scoped and callable only by trusted roles.
select is(
  (
    select p.prosecdef
      from pg_catalog.pg_proc as p
     where p.oid = 'public.get_user_plan(uuid)'::regprocedure
  ),
  false,
  'get_user_plan is SECURITY INVOKER'
);

select ok(
  coalesce(
    (
      select p.proconfig @> array['search_path=""']
        from pg_catalog.pg_proc as p
       where p.oid = 'public.get_user_plan(uuid)'::regprocedure
    ),
    false
  ),
  'get_user_plan has an empty fixed search_path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_user_plan(uuid)',
    'EXECUTE'
  ),
  'anon cannot execute get_user_plan'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_user_plan(uuid)',
    'EXECUTE'
  ),
  'authenticated can execute get_user_plan'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.get_user_plan(uuid)',
    'EXECUTE'
  ),
  'service_role can execute get_user_plan'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.stripe_customers',
    'SELECT'
  ),
  'authenticated cannot read internal Stripe customer identifiers'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.stripe_webhook_events',
    'SELECT'
  ),
  'authenticated cannot read the Stripe webhook completion ledger'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.webhook_events',
    'SELECT'
  ),
  'authenticated cannot read the legacy Stripe webhook ledger'
);

select ok(
  has_table_privilege('service_role', 'public.stripe_customers', 'SELECT'),
  'service_role retains Stripe customer access'
);

select ok(
  has_table_privilege(
    'service_role',
    'public.stripe_webhook_events',
    'INSERT'
  ),
  'service_role retains Stripe webhook completion writes'
);

select ok(
  not exists (
    select 1
      from public.stripe_webhook_events as e
     where e.payload is not null
  ),
  'Stripe webhook completion ledger retains no raw event payloads'
);

select ok(
  not exists (
    select 1
      from public.webhook_events as e
     where e.payload is not null
  ),
  'legacy Stripe webhook ledger retains no raw event payloads'
);

-- public_profiles must honor caller RLS and have no mutation surface.
select ok(
  coalesce(
    (
      select 'security_invoker=true' = any(c.reloptions)
        from pg_catalog.pg_class as c
        join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = 'public_profiles'
         and c.relkind = 'v'
    ),
    false
  ),
  'public_profiles is a security-invoker view'
);

select is(
  (
    select v.is_updatable
      from information_schema.views as v
     where v.table_schema = 'public'
       and v.table_name = 'public_profiles'
  ),
  'NO',
  'public_profiles is not automatically updatable'
);

select ok(
  has_table_privilege(
    'authenticated',
    'public.public_profiles',
    'SELECT'
  ),
  'authenticated can select public_profiles'
);

select ok(
  not has_any_column_privilege(
    'authenticated',
    'public.public_profiles',
    'UPDATE'
  ),
  'authenticated cannot update public_profiles'
);

-- The question catalogue is read-only through the Data API and always RLS-on.
select ok(
  (
    select c.relrowsecurity
      from pg_catalog.pg_class as c
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'question_bank'
       and c.relkind in ('r', 'p')
  ),
  'question_bank has RLS enabled'
);

select ok(
  not exists (
    select 1
      from pg_catalog.pg_class as c
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'questions_full'
       and c.relkind in ('r', 'p')
  )
  or exists (
    select 1
      from pg_catalog.pg_class as c
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'questions_full'
       and c.relkind in ('r', 'p')
       and c.relrowsecurity
  ),
  'questions_full has RLS enabled whenever the table exists'
);

select ok(
  not exists (
    select 1
      from pg_catalog.pg_class as c
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'questions_full'
       and c.relkind = 'v'
  )
  or exists (
    select 1
      from pg_catalog.pg_class as c
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'questions_full'
       and c.relkind = 'v'
       and 'security_invoker=true' = any(c.reloptions)
  ),
  'questions_full honors caller RLS whenever it is a view'
);

select ok(
  not has_any_column_privilege('anon', 'public.question_bank', 'SELECT'),
  'anon cannot select question_bank'
);

select ok(
  not has_any_column_privilege('anon', 'public.question_bank', 'INSERT'),
  'anon cannot insert question_bank rows'
);

select ok(
  has_table_privilege('authenticated', 'public.question_bank', 'SELECT'),
  'authenticated can select question_bank'
);

select ok(
  has_table_privilege('service_role', 'public.question_bank', 'SELECT'),
  'service_role can select question_bank'
);

select is(
  (
    select p.prosecdef
      from pg_catalog.pg_proc as p
     where p.oid = 'public.get_random_questions()'::regprocedure
  ),
  false,
  'get_random_questions is SECURITY INVOKER'
);

select is(
  (
    select p.prosecdef
      from pg_catalog.pg_proc as p
     where p.oid =
       'public.get_attempt_topic_breakdown(uuid)'::regprocedure
  ),
  false,
  'get_attempt_topic_breakdown is SECURITY INVOKER'
);

select ok(
  coalesce(
    (
      select p.proconfig @> array['search_path=""']
        from pg_catalog.pg_proc as p
       where p.oid = 'public.get_random_questions()'::regprocedure
    ),
    false
  ),
  'get_random_questions has an empty fixed search_path'
);

select ok(
  coalesce(
    (
      select p.proconfig @> array['search_path=""']
        from pg_catalog.pg_proc as p
       where p.oid =
         'public.get_attempt_topic_breakdown(uuid)'::regprocedure
    ),
    false
  ),
  'get_attempt_topic_breakdown has an empty fixed search_path'
);

select ok(
  coalesce(
    (
      select p.proconfig @> array['search_path=""']
        from pg_catalog.pg_proc as p
       where p.oid = 'public.get_dashboard_stats(uuid)'::regprocedure
    ),
    false
  ),
  'get_dashboard_stats has an empty fixed search_path'
);

select ok(
  coalesce(
    (
      select p.proconfig @> array['search_path=""']
        from pg_catalog.pg_proc as p
       where p.oid = 'public.clear_learning_history(uuid)'::regprocedure
    ),
    false
  ),
  'clear_learning_history has an empty fixed search_path'
);

select ok(
  not exists (
    select 1
      from pg_catalog.pg_proc as p
      join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'get_random_questions',
         'get_attempt_topic_breakdown',
         'get_dashboard_stats',
         'clear_learning_history'
       )
       and has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  'anon cannot execute any question or learning RPC overload'
);

select ok(
  not exists (
    select 1
      from pg_catalog.pg_proc as p
      join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'get_random_questions',
         'get_attempt_topic_breakdown',
         'get_dashboard_stats',
         'clear_learning_history'
       )
       and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'authenticated can execute every question or learning RPC overload'
);

select ok(
  not exists (
    select 1
      from pg_catalog.pg_proc as p
      join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'get_random_questions',
         'get_attempt_topic_breakdown',
         'get_dashboard_stats',
         'clear_learning_history'
       )
       and not has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  'service_role can execute every question or learning RPC overload'
);

select ok(
  case
    when to_regclass('public.questions_full') is null then true
    else not has_any_column_privilege(
      'anon',
      'public.questions_full',
      'SELECT'
    )
  end,
  'anon cannot select questions_full whenever it exists'
);

select ok(
  case
    when to_regclass('public.questions_full') is null then true
    else not has_any_column_privilege(
      'anon',
      'public.questions_full',
      'INSERT'
    )
  end,
  'anon cannot insert questions_full rows whenever it exists'
);

-- Exercise the realistic authenticated boundary.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '10000000-0000-0000-0000-000000000003',
    'role', 'authenticated'
  )::text,
  true
);

set local role authenticated;

select is(
  public.is_admin(),
  false,
  'a historical profiles.role value does not grant administrator authority'
);

reset role;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '10000000-0000-0000-0000-000000000001',
    'role', 'authenticated',
    'app_metadata', json_build_object('role', 'admin')
  )::text,
  true
);

set local role authenticated;

select is(
  public.is_admin(),
  true,
  'server-owned Auth app metadata grants administrator authority'
);

reset role;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '10000000-0000-0000-0000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

set local role authenticated;

select lives_ok(
  $$
    update public.profiles
       set name = 'Safe profile update'
     where id = '10000000-0000-0000-0000-000000000001'
  $$,
  'authenticated user can update an allowed own-profile field'
);

select throws_ok(
  $$
    update public.profiles
       set last_login_at = '2099-01-01T00:00:00Z'
     where id = '10000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'authenticated user cannot forge the login timestamp directly'
);

select lives_ok(
  $$select public.touch_last_login()$$,
  'authenticated user can record a server login timestamp through the RPC'
);

select throws_ok(
  $$
    update public.profiles
       set role = 'admin'
     where id = '10000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'authenticated user cannot elevate profiles.role'
);

select throws_ok(
  $$
    update public.profiles
       set deletion_started_at = now()
     where id = '10000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'authenticated user cannot start account deletion through the Data API'
);

select is(
  public.account_accepts_uploads(
    '10000000-0000-0000-0000-000000000001'
  ),
  true,
  'account upload guard permits the authenticated active account'
);

select is(
  public.account_accepts_uploads(
    '10000000-0000-0000-0000-000000000002'
  ),
  false,
  'account upload guard cannot probe or authorize another account'
);

reset role;

select is(
  (
    select p.role
      from public.profiles as p
     where p.id = '10000000-0000-0000-0000-000000000001'
  ),
  'user',
  'failed role escalation leaves the role unchanged'
);

set local role authenticated;

select lives_ok(
  $$select id, username, name, photo_url from public.public_profiles$$,
  'authenticated user can read public_profiles'
);

select throws_ok(
  $$
    update public.public_profiles
       set name = 'Unauthorized view mutation'
     where id = '10000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'authenticated user cannot mutate public_profiles'
);

select is(
  public.get_user_plan('10000000-0000-0000-0000-000000000001'),
  'pro',
  'authenticated user can read their own plan'
);

select throws_ok(
  $$
    select public.get_user_plan(
      '10000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  'get_user_plan may only be called for the authenticated user',
  'authenticated user cannot read another user plan'
);

select lives_ok(
  $$select id from public.question_bank limit 1$$,
  'authenticated user can read question_bank'
);

reset role;

-- Exercise the anonymous boundary, including runtime permission enforcement.
select set_config(
  'request.jwt.claims',
  json_build_object('role', 'anon')::text,
  true
);

set local role anon;

select throws_ok(
  $$
    select public.get_user_plan(
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  null,
  'anon is denied execution of get_user_plan'
);

select throws_ok(
  $$select id from public.question_bank limit 1$$,
  '42501',
  null,
  'anon is denied question_bank access'
);

reset role;

-- Trusted backend behavior remains available.
select set_config(
  'request.jwt.claims',
  json_build_object('role', 'service_role')::text,
  true
);

set local role service_role;

select is(
  public.get_user_plan('10000000-0000-0000-0000-000000000002'),
  'plus',
  'service_role retains cross-user plan lookup'
);

select lives_ok(
  $$
    update public.profiles
       set role = 'moderator'
     where id = '10000000-0000-0000-0000-000000000001'
  $$,
  'service_role retains trusted role management'
);

select lives_ok(
  $$
    update public.profiles
       set deletion_started_at = now(),
           deletion_guard_id = '20000000-0000-0000-0000-000000000001'
     where id = '10000000-0000-0000-0000-000000000001'
  $$,
  'service_role can set the private account deletion guard'
);

select is(
  (
    select p.deletion_guard_id
      from public.profiles as p
     where p.id = '10000000-0000-0000-0000-000000000001'
  ),
  '20000000-0000-0000-0000-000000000001'::uuid,
  'service_role account deletion guard write is persisted'
);

select is(
  (
    select p.role
      from public.profiles as p
     where p.id = '10000000-0000-0000-0000-000000000001'
  ),
  'moderator',
  'trusted role update is persisted inside the test transaction'
);

reset role;

select * from finish();
rollback;
