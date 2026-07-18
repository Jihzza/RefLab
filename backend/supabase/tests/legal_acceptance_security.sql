-- Versioned legal-acceptance security and runtime contract.
-- Run only on a disposable/local database after the matching migration.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

select has_schema(
  'reflab_private',
  'RefLab-owned private schema exists for non-Data-API legal evidence'
);

select has_table(
  'reflab_private',
  'legal_document_versions',
  'current legal document identifiers are server-configured'
);

select has_table(
  'reflab_private',
  'user_legal_acceptances',
  'append-only legal acceptance evidence table exists'
);

select ok(
  (
    select c.relrowsecurity
      from pg_catalog.pg_class as c
     where c.oid = 'reflab_private.legal_document_versions'::regclass
  ),
  'legal document versions have RLS defense in depth'
);

select ok(
  (
    select c.relrowsecurity
      from pg_catalog.pg_class as c
     where c.oid = 'reflab_private.user_legal_acceptances'::regclass
  ),
  'legal acceptance evidence has RLS defense in depth'
);

select ok(
  not has_schema_privilege('anon', 'reflab_private', 'USAGE'),
  'anon has no RefLab private schema usage'
);

select ok(
  not has_schema_privilege('authenticated', 'reflab_private', 'USAGE'),
  'authenticated has no direct RefLab private schema usage'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'reflab_private.user_legal_acceptances',
    'SELECT'
  ),
  'authenticated cannot read raw acceptance evidence directly'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'reflab_private.user_legal_acceptances',
    'INSERT'
  ),
  'authenticated cannot forge acceptance evidence directly'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'reflab_private.user_legal_acceptances',
    'UPDATE'
  ),
  'authenticated cannot rewrite first-acceptance evidence'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'reflab_private.user_legal_acceptances',
    'DELETE'
  ),
  'authenticated cannot delete acceptance evidence'
);

select is(
  (
    select p.prosecdef
      from pg_catalog.pg_proc as p
     where p.oid = 'public.get_current_legal_acceptance()'::regprocedure
  ),
  true,
  'status RPC is SECURITY DEFINER over private evidence'
);

select is(
  (
    select p.prosecdef
      from pg_catalog.pg_proc as p
     where p.oid =
       'public.accept_current_legal_documents(uuid,text,text)'::regprocedure
  ),
  true,
  'acceptance RPC is SECURITY DEFINER over private evidence'
);

select ok(
  coalesce(
    (
      select p.proconfig @> array['search_path=""']
        from pg_catalog.pg_proc as p
       where p.oid = 'public.get_current_legal_acceptance()'::regprocedure
    ),
    false
  ),
  'status RPC has an empty fixed search_path'
);

select ok(
  coalesce(
    (
      select p.proconfig @> array['search_path=""']
        from pg_catalog.pg_proc as p
       where p.oid =
         'public.accept_current_legal_documents(uuid,text,text)'::regprocedure
    ),
    false
  ),
  'acceptance RPC has an empty fixed search_path'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_current_legal_acceptance()',
    'EXECUTE'
  ),
  'authenticated can query only their derived acceptance status'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.accept_current_legal_documents(uuid,text,text)',
    'EXECUTE'
  ),
  'authenticated can record only their own current acceptance via RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_current_legal_acceptance()',
    'EXECUTE'
  ),
  'anon cannot query legal acceptance status'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.accept_current_legal_documents(uuid,text,text)',
    'EXECUTE'
  ),
  'anon cannot record legal acceptance'
);

select is(
  (
    select v.version
      from reflab_private.legal_document_versions as v
     where v.document_type = 'terms'
  ),
  'terms-2026-07-18-v1',
  'the auditable Terms content identifier is configured server-side'
);

select is(
  (
    select v.version
      from reflab_private.legal_document_versions as v
     where v.document_type = 'privacy'
  ),
  'privacy-2026-07-18-v1',
  'the auditable Privacy content identifier is configured server-side'
);

-- Replica mode permits stable synthetic auth subjects without relying on the
-- changing internal auth.users column shape. The transaction is rolled back.
set local session_replication_role = replica;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '40000000-0000-0000-0000-000000000001',
    'role', 'authenticated',
    'app_metadata', json_build_object('provider', 'google'),
    'user_metadata', json_build_object('provider', 'client-forged')
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000001',
  true
);

set local role authenticated;

select is(
  (
    select status.is_accepted
      from public.get_current_legal_acceptance() as status
  ),
  false,
  'an existing user is fail-closed until explicit current-version consent'
);

select throws_ok(
  $$
    select public.accept_current_legal_documents(
      '40000000-0000-0000-0000-000000000001',
      'stale-version',
      'privacy-2026-07-18-v1'
    )
  $$,
  '22023',
  'Legal document version mismatch',
  'client cannot record a stale or invented document version'
);

select throws_ok(
  $$
    select public.accept_current_legal_documents(
      '40000000-0000-0000-0000-000000000002',
      'terms-2026-07-18-v1',
      'privacy-2026-07-18-v1'
    )
  $$,
  '42501',
  'Legal acceptance user mismatch',
  'a stale client request cannot record acceptance for a different session user'
);

select ok(
  public.accept_current_legal_documents(
    '40000000-0000-0000-0000-000000000001',
    'terms-2026-07-18-v1',
    'privacy-2026-07-18-v1'
  ) is not null,
  'authenticated user records acceptance with a server timestamp'
);

select is(
  (
    select status.is_accepted
      from public.get_current_legal_acceptance() as status
  ),
  true,
  'the same user is accepted only for the configured version pair'
);

select is(
  (
    select status.terms_version || ':' || status.privacy_version
      from public.get_current_legal_acceptance() as status
  ),
  'terms-2026-07-18-v1:privacy-2026-07-18-v1',
  'status returns the exact server-configured version pair'
);

select ok(
  (
    select status.accepted_at is not null
      from public.get_current_legal_acceptance() as status
  ),
  'status exposes the server acceptance timestamp for the current user'
);

select ok(
  public.accept_current_legal_documents(
    '40000000-0000-0000-0000-000000000001',
    'terms-2026-07-18-v1',
    'privacy-2026-07-18-v1'
  ) is not null,
  'repeated acceptance is idempotent'
);

reset role;

select is(
  (
    select count(*)::integer
      from reflab_private.user_legal_acceptances as a
     where a.user_id = '40000000-0000-0000-0000-000000000001'
       and a.terms_version = 'terms-2026-07-18-v1'
       and a.privacy_version = 'privacy-2026-07-18-v1'
  ),
  1,
  'idempotency preserves one immutable first-acceptance record per version pair'
);

select is(
  (
    select a.acceptance_method
      from reflab_private.user_legal_acceptances as a
     where a.user_id = '40000000-0000-0000-0000-000000000001'
       and a.terms_version = 'terms-2026-07-18-v1'
       and a.privacy_version = 'privacy-2026-07-18-v1'
  ),
  'authenticated_gate',
  'the server records an honest authenticated-gate method'
);

select is(
  (
    select a.auth_provider
      from reflab_private.user_legal_acceptances as a
     where a.user_id = '40000000-0000-0000-0000-000000000001'
       and a.terms_version = 'terms-2026-07-18-v1'
       and a.privacy_version = 'privacy-2026-07-18-v1'
  ),
  'google',
  'provider context comes from signed app_metadata, never client user_metadata'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '40000000-0000-0000-0000-000000000002',
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000002',
  true
);

set local role authenticated;

select is(
  (
    select status.is_accepted
      from public.get_current_legal_acceptance() as status
  ),
  false,
  'one user acceptance never authorises a different user'
);

reset role;

select set_config(
  'request.jwt.claims',
  json_build_object('role', 'anon')::text,
  true
);
select set_config('request.jwt.claim.sub', '', true);

set local role anon;

select throws_ok(
  $$select * from public.get_current_legal_acceptance()$$,
  '42501',
  null,
  'anonymous runtime execution is denied'
);

reset role;

select * from finish();
rollback;
