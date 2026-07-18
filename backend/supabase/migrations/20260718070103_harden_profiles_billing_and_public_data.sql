-- Harden profile, billing, and public reference-data boundaries.
--
-- This migration deliberately replaces broad Supabase default grants with an
-- explicit API contract. RLS controls rows; these grants additionally control
-- which columns and operations the Data API roles can reach.

-- ---------------------------------------------------------------------------
-- Profiles: browser clients can only write legitimate onboarding/profile data.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists deletion_started_at timestamptz,
  add column if not exists deletion_guard_id uuid;

-- A writable schema in a SECURITY DEFINER search path lets an attacker shadow
-- unqualified objects. Remove browser DDL authority, then pin every legacy
-- definer function to a compatibility-safe order (system objects, application
-- objects, and temporary objects last). New functions below use an empty path
-- and schema-qualified names directly.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

do $legacy_definer_paths$
declare
  function_signature regprocedure;
begin
  for function_signature in
    select p.oid::regprocedure
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
  loop
    execute format(
      'alter function %s set search_path = pg_catalog, public, pg_temp',
      function_signature
    );
  end loop;
end;
$legacy_definer_paths$;

-- Administrative authority must come from Auth app metadata, which browser
-- clients cannot edit. The legacy helper trusted profiles.role; that column was
-- historically covered only by row-level checks and may contain values written
-- before the explicit column grants below existed. Keeping it as the authority
-- would preserve a latent privilege-escalation path after the rollout.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$function$;

revoke all privileges
  on function public.is_admin()
  from public, anon, authenticated, service_role;

grant execute
  on function public.is_admin()
  to authenticated, service_role;

revoke all privileges
  on table public.profiles
  from public, anon, authenticated;

grant select (
  id,
  username,
  username_customized,
  name,
  photo_url,
  created_at,
  updated_at
)
  on public.profiles
  to authenticated;

-- Keep the manual self-profile repair path without allowing callers to choose
-- role, total_xp, timestamps, or any future privileged column.
grant insert (
  id,
  username,
  username_customized,
  name,
  photo_url
)
  on table public.profiles
  to authenticated;

grant update (
  username,
  username_customized,
  name,
  photo_url
)
  on table public.profiles
  to authenticated;

-- Login activity is a server fact, not a timestamp chosen by a browser. Keep
-- the existing frontend behavior through a subject-bound, server-clock RPC.
create or replace function public.touch_last_login()
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  touched_at timestamptz := pg_catalog.statement_timestamp();
begin
  if caller_uid is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  update public.profiles as p
     set last_login_at = touched_at
   where p.id = caller_uid
     and p.deletion_started_at is null;

  if not found then
    raise exception 'Active profile not found'
      using errcode = 'P0002';
  end if;

  return touched_at;
end;
$function$;

revoke all privileges
  on function public.touch_last_login()
  from public, anon, authenticated, service_role;

grant execute
  on function public.touch_last_login()
  to authenticated;

-- Trusted backend operations retain the complete profile-management surface.
grant select, insert, update, delete
  on table public.profiles
  to service_role;

-- Storage writes must stop before account deletion starts. The definer helper
-- can inspect the private guard column without granting that column to browser
-- clients, and it is bound to the JWT subject so it cannot probe other users.
create or replace function public.account_accepts_uploads(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    uid is not null
    and uid = auth.uid()
    and exists (
      select 1
        from public.profiles as p
       where p.id = uid
         and p.deletion_started_at is null
    );
$function$;

revoke all privileges
  on function public.account_accepts_uploads(uuid)
  from public, anon, authenticated, service_role;

grant execute
  on function public.account_accepts_uploads(uuid)
  to authenticated, service_role;

drop policy if exists "Authenticated users can upload profile media"
  on storage.objects;
create policy "Authenticated users can upload profile media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.account_accepts_uploads((select auth.uid()))
  );

drop policy if exists "Authenticated users can upload post media"
  on storage.objects;
create policy "Authenticated users can upload post media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.account_accepts_uploads((select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Public profiles: RLS-aware, non-updatable, and read-only to API callers.
-- ---------------------------------------------------------------------------

create or replace view public.public_profiles
with (security_invoker = true)
as
select distinct
  p.id,
  p.username,
  p.name,
  p.photo_url
from public.profiles as p
where p.username is not null;

comment on view public.public_profiles is
  'RLS-aware, read-only public profile projection for authenticated users.';

revoke all privileges
  on table public.public_profiles
  from public, anon, authenticated, service_role;

grant select
  on table public.public_profiles
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Billing: keep the RPC signature, bind authenticated calls to auth.uid(), and
-- execute with invoker rights so stripe_subscriptions RLS remains effective.
-- ---------------------------------------------------------------------------

revoke all privileges
  on table
    public.stripe_customers,
    public.stripe_webhook_events,
    public.webhook_events
  from public, anon, authenticated;

grant select, insert, update, delete
  on table
    public.stripe_customers,
    public.stripe_webhook_events,
    public.webhook_events
  to service_role;

-- The completion ledger needs only identifiers/timestamps for idempotency.
-- Historical Stripe payloads can contain customer or invoice PII and are not
-- used by the application, so remove them rather than retaining them forever.
update public.stripe_webhook_events
   set payload = null
 where payload is not null;

update public.webhook_events
   set payload = null
 where payload is not null;

revoke all privileges
  on table public.stripe_subscriptions
  from public, anon, authenticated;

grant select
  on table public.stripe_subscriptions
  to authenticated;

grant select, insert, update, delete
  on table public.stripe_subscriptions
  to service_role;

create or replace function public.get_user_plan(uid uuid)
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  caller_is_privileged boolean :=
    current_user in ('postgres', 'supabase_admin', 'service_role');
  result_plan text;
begin
  if not caller_is_privileged
     and (caller_uid is null or uid is distinct from caller_uid) then
    raise exception
      'get_user_plan may only be called for the authenticated user'
      using errcode = '42501';
  end if;

  select s.plan
    into result_plan
    from public.stripe_subscriptions as s
   where s.user_id = uid
     and s.status in ('active', 'trialing', 'past_due')
   order by s.updated_at desc
   limit 1;

  return coalesce(result_plan, 'free');
end;
$function$;

revoke all privileges
  on function public.get_user_plan(uuid)
  from public, anon, authenticated, service_role;

grant execute
  on function public.get_user_plan(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Question catalogue: exact read-only Data API contract with RLS enabled.
-- ---------------------------------------------------------------------------

alter table public.question_bank enable row level security;

do $policies$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
      from pg_catalog.pg_policies
     where schemaname = 'public'
       and tablename = 'question_bank'
  loop
    execute format(
      'drop policy %I on public.question_bank',
      existing_policy.policyname
    );
  end loop;
end;
$policies$;

create policy "question_bank_select_authenticated"
  on public.question_bank
  for select
  to authenticated
  using (true);

revoke all privileges
  on table public.question_bank
  from public, anon, authenticated, service_role;

grant select
  on table public.question_bank
  to authenticated, service_role;

-- RPCs created by the question-bank migration must not become an anonymous
-- RLS bypass through PostgreSQL's default PUBLIC function privilege. Random
-- questions and attempt breakdowns can safely run as the caller: the former
-- uses the catalogue's authenticated SELECT policy, while the latter inherits
-- the existing own-attempt RLS policies. The two user-scoped aggregate/delete
-- helpers retain their historical execution mode and explicit auth.uid()
-- binding, but receive the same fixed path and least-privilege ACL contract.
-- Iterate over catalogued overloads so schema drift cannot leave an older
-- signature callable with broader privileges.
do $question_rpcs$
declare
  rpc record;
  rpc_signature text;
begin
  for rpc in
    select
      p.proname,
      n.nspname,
      pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname in (
        'get_random_questions',
        'get_attempt_topic_breakdown',
        'get_dashboard_stats',
        'clear_learning_history'
      )
  loop
    rpc_signature := format(
      '%I.%I(%s)',
      rpc.nspname,
      rpc.proname,
      rpc.identity_args
    );

    if rpc.proname in (
      'get_random_questions',
      'get_attempt_topic_breakdown'
    ) then
      execute format(
        'alter function %s security invoker',
        rpc_signature
      );
    end if;

    execute format(
      'alter function %s set search_path = %L',
      rpc_signature,
      ''
    );
    execute format(
      'revoke all privileges on function %s from public, anon, authenticated, service_role',
      rpc_signature
    );
    execute format(
      'grant execute on function %s to authenticated, service_role',
      rpc_signature
    );
  end loop;
end;
$question_rpcs$;

-- questions_full exists in the linked project but is absent from some clean
-- repository rebuilds. Secure whichever relation kind is present without
-- making rebuilds that legitimately omit it fail.
do $questions_full$
declare
  existing_policy record;
  object_kind text;
begin
  select c.relkind
    into object_kind
      from pg_catalog.pg_class as c
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'questions_full';

  if object_kind in ('r', 'p') then
    execute 'alter table public.questions_full enable row level security';

    for existing_policy in
      select policyname
        from pg_catalog.pg_policies
       where schemaname = 'public'
         and tablename = 'questions_full'
    loop
      execute format(
        'drop policy %I on public.questions_full',
        existing_policy.policyname
      );
    end loop;

    execute $policy$
      create policy "questions_full_select_authenticated"
        on public.questions_full
        for select
        to authenticated
        using (true)
    $policy$;

    execute $acl$
      revoke all privileges
        on table public.questions_full
        from public, anon, authenticated, service_role
    $acl$;

    execute $acl$
      grant select
        on table public.questions_full
        to authenticated, service_role
    $acl$;
  elsif object_kind = 'v' then
    execute 'alter view public.questions_full set (security_invoker = true)';
    execute $acl$
      revoke all privileges
        on table public.questions_full
        from public, anon, authenticated, service_role
    $acl$;
    execute $acl$
      grant select
        on table public.questions_full
        to authenticated, service_role
    $acl$;
  elsif object_kind = 'm' then
    execute $acl$
      revoke all privileges
        on table public.questions_full
        from public, anon, authenticated, service_role
    $acl$;
    execute $acl$
      grant select
        on table public.questions_full
        to authenticated, service_role
    $acl$;
  end if;
end;
$questions_full$;

-- Destructive account deletion requires recent authentication by the exact
-- bearer session making the request. auth.users.last_sign_in_at is global to
-- the account and can be refreshed by a different device, so it cannot prove
-- that this session reauthenticated. The signed JWT binds auth.uid(),
-- session_id and AMR; the private Auth row proves that session still exists.
-- This additive RPC deliberately lands before the matching Edge Function.
create or replace function public.account_deletion_session_is_recent()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  claims jsonb := auth.jwt();
  caller_user_id uuid := auth.uid();
  session_id_text text;
  session_identifier uuid;
  current_epoch numeric := extract(
    epoch from pg_catalog.statement_timestamp()
  );
begin
  if caller_user_id is null
     or claims is null
     or pg_catalog.jsonb_typeof(claims) <> 'object'
     or claims ->> 'role' <> 'authenticated'
     or pg_catalog.jsonb_typeof(claims -> 'amr') <> 'array' then
    return false;
  end if;

  session_id_text := claims ->> 'session_id';
  if session_id_text is null
     or session_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  session_identifier := session_id_text::uuid;

  if not exists (
    select 1
      from auth.sessions as session
     where session.id = session_identifier
       and session.user_id = caller_user_id
  ) then
    return false;
  end if;

  return exists (
    select 1
      from pg_catalog.jsonb_array_elements(claims -> 'amr')
        as authentication_method(entry)
     where pg_catalog.jsonb_typeof(authentication_method.entry) = 'object'
       and authentication_method.entry ->> 'method' = any (array[
         'password',
         'oauth',
         'oauth_provider/authorization_code',
         'otp',
         'totp',
         'recovery',
         'magiclink',
         'sso/saml',
         'email/signup',
         'invite'
       ]::text[])
       and pg_catalog.jsonb_typeof(
         authentication_method.entry -> 'timestamp'
       ) = 'number'
       and (authentication_method.entry ->> 'timestamp')::numeric
         >= current_epoch - 600
       and (authentication_method.entry ->> 'timestamp')::numeric
         <= current_epoch + 60
  );
end;
$function$;

comment on function public.account_deletion_session_is_recent() is
  'Caller-only, session-bound proof of a non-refresh authentication method within ten minutes.';

revoke all privileges
  on function public.account_deletion_session_is_recent()
  from public, anon, authenticated, service_role;

grant execute
  on function public.account_deletion_session_is_recent()
  to authenticated;
