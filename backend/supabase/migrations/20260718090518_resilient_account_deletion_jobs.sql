-- Make account deletion durable, resumable, and safe across Edge Function
-- timeouts. The job is deliberately independent of public.profiles so a
-- missing profile can never strand an otherwise valid auth user.

create table public.account_deletion_jobs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phase text not null default 'requested'
    check (phase in (
      'requested',
      'billing_closing',
      'billing_closed',
      'storage_purged',
      'auth'
    )),
  lease_id uuid,
  lease_acquired_at timestamptz,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  phase_started_at timestamptz not null default statement_timestamp(),
  billing_closed_at timestamptz,
  storage_purged_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint account_deletion_jobs_lease_pair_check
    check ((lease_id is null) = (lease_expires_at is null))
);

comment on table public.account_deletion_jobs is
  'Service-only, resumable account-deletion state. A row blocks new writes until auth deletion succeeds.';
comment on column public.account_deletion_jobs.phase is
  'Monotonic phase: requested -> billing_closing -> billing_closed -> storage_purged -> auth.';
comment on column public.account_deletion_jobs.lease_expires_at is
  'Crash-recovery lease. A different worker may take over once this timestamp expires.';

alter table public.account_deletion_jobs enable row level security;

revoke all privileges
  on table public.account_deletion_jobs
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.account_deletion_jobs
  to service_role;

-- Stripe customer creation is a remote side effect. Persist the exact request
-- identity and parameters before calling Stripe so a crash between the API
-- response and the local mapping can always be recovered.
create table public.billing_customer_provisioning_intents (
  intent_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null unique,
  customer_email text,
  stripe_customer_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'resolved')),
  created_at timestamptz not null default statement_timestamp(),
  resolved_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  constraint billing_customer_provisioning_intents_resolution_check
    check (
      (status = 'pending' and resolved_at is null)
      or (status = 'resolved' and stripe_customer_id is not null and resolved_at is not null)
    )
);

create unique index billing_customer_provisioning_one_pending_per_user_idx
  on public.billing_customer_provisioning_intents (user_id)
  where status = 'pending';

create index billing_customer_provisioning_user_created_idx
  on public.billing_customer_provisioning_intents (user_id, created_at);

comment on table public.billing_customer_provisioning_intents is
  'Service-only durable Stripe customer-create intents. Exact stored parameters and idempotency key are replayed after crashes.';

alter table public.billing_customer_provisioning_intents enable row level security;

revoke all privileges
  on table public.billing_customer_provisioning_intents
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.billing_customer_provisioning_intents
  to service_role;

-- The same transaction-level advisory lock is used by provisioning begin,
-- provisioning completion, customer mapping inserts, and deletion acquire.
-- This closes write-skew: deletion either sees a committed durable intent or
-- provisioning sees the committed deletion job and refuses to start.
create or replace function public.begin_billing_customer_provisioning(
  p_user_id uuid,
  p_customer_email text default null
)
returns table (
  deletion_in_progress boolean,
  existing_customer_id text,
  intent_id uuid,
  idempotency_key text,
  customer_email text,
  stripe_customer_id text,
  created_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  existing_id text;
  intent public.billing_customer_provisioning_intents%rowtype;
  new_intent_id uuid;
begin
  if p_user_id is null then
    raise exception 'billing customer user identifier is required'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 413562871)
  );

  if exists (
    select 1 from public.account_deletion_jobs as j where j.user_id = p_user_id
  ) or not exists (
    select 1
      from public.profiles as p
     where p.id = p_user_id
       and p.deletion_started_at is null
  ) then
    return query select true, null::text, null::uuid, null::text,
      null::text, null::text, null::timestamptz;
    return;
  end if;

  select c.stripe_customer_id
    into existing_id
    from public.stripe_customers as c
   where c.user_id = p_user_id;

  if existing_id is not null then
    return query select false, existing_id, null::uuid, null::text,
      null::text, null::text, null::timestamptz;
    return;
  end if;

  select i.*
    into intent
    from public.billing_customer_provisioning_intents as i
   where i.user_id = p_user_id
     and i.status = 'pending'
   for update;

  if not found then
    new_intent_id := gen_random_uuid();
    insert into public.billing_customer_provisioning_intents (
      intent_id,
      user_id,
      idempotency_key,
      customer_email
    ) values (
      new_intent_id,
      p_user_id,
      'reflab-customer-intent-' || new_intent_id::text,
      nullif(p_customer_email, '')
    )
    returning * into intent;
  end if;

  return query select
    false,
    null::text,
    intent.intent_id,
    intent.idempotency_key,
    intent.customer_email,
    intent.stripe_customer_id,
    intent.created_at;
end;
$function$;

create or replace function public.complete_billing_customer_provisioning(
  p_user_id uuid,
  p_intent_id uuid,
  p_stripe_customer_id text
)
returns table (
  deletion_in_progress boolean,
  mapping_stored boolean,
  stripe_customer_id text
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  intent public.billing_customer_provisioning_intents%rowtype;
  deleting boolean;
  completion_now timestamptz := statement_timestamp();
begin
  if p_user_id is null or p_intent_id is null or nullif(p_stripe_customer_id, '') is null then
    raise exception 'billing customer completion identifiers are required'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 413562871)
  );

  select i.*
    into intent
    from public.billing_customer_provisioning_intents as i
   where i.intent_id = p_intent_id
     and i.user_id = p_user_id
   for update;

  if not found then
    raise exception 'billing customer provisioning intent not found'
      using errcode = 'P0002';
  end if;
  if intent.stripe_customer_id is not null
     and intent.stripe_customer_id <> p_stripe_customer_id then
    raise exception 'billing customer provisioning intent resolved to a different customer'
      using errcode = '23505';
  end if;

  update public.billing_customer_provisioning_intents
     set stripe_customer_id = p_stripe_customer_id,
         status = 'resolved',
         resolved_at = coalesce(resolved_at, completion_now),
         updated_at = completion_now
   where intent_id = p_intent_id;

  deleting := exists (
    select 1 from public.account_deletion_jobs as j where j.user_id = p_user_id
  ) or not exists (
    select 1
      from public.profiles as p
     where p.id = p_user_id
       and p.deletion_started_at is null
  );

  if deleting then
    return query select true, false, p_stripe_customer_id;
    return;
  end if;

  insert into public.stripe_customers as customers (
    user_id,
    stripe_customer_id
  ) values (
    p_user_id,
    p_stripe_customer_id
  )
  on conflict (user_id) do update
    set stripe_customer_id = excluded.stripe_customer_id,
        updated_at = completion_now
    where customers.stripe_customer_id = excluded.stripe_customer_id;

  if not found then
    raise exception 'billing customer mapping conflicts with another customer'
      using errcode = '23505';
  end if;

  return query select false, true, p_stripe_customer_id;
end;
$function$;

-- Serialize the only billing write that can create a new external-customer
-- mapping. If checkout passed an earlier state check, a job committed before
-- its mapping INSERT still wins here; checkout then removes the just-created
-- idempotent Stripe customer instead of racing deletion with an orphan.
create or replace function public.reject_new_billing_customer_during_deletion()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 413562871)
  );

  if exists (
    select 1
      from public.account_deletion_jobs as j
     where j.user_id = new.user_id
  ) or not exists (
    select 1
      from public.profiles as p
     where p.id = new.user_id
       and p.deletion_started_at is null
  ) then
    raise exception 'account deletion is in progress'
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

revoke all privileges
  on function public.reject_new_billing_customer_during_deletion()
  from public, anon, authenticated, service_role;

grant execute
  on function public.reject_new_billing_customer_during_deletion()
  to service_role;

drop trigger if exists reject_new_billing_customer_during_deletion
  on public.stripe_customers;
create trigger reject_new_billing_customer_during_deletion
  before insert on public.stripe_customers
  for each row
  execute function public.reject_new_billing_customer_during_deletion();

-- Treat any guard left by the previous transient implementation as potentially
-- post-irreversible. Retaining it at billing_closing is safer than reactivating
-- an account whose Stripe customer may already have been deleted.
insert into public.account_deletion_jobs (
  user_id,
  phase,
  phase_started_at,
  created_at,
  updated_at
)
select
  p.id,
  'billing_closing',
  p.deletion_started_at,
  p.deletion_started_at,
  statement_timestamp()
from public.profiles as p
where p.deletion_started_at is not null
on conflict (user_id) do nothing;

update public.profiles
   set deletion_guard_id = null
 where deletion_started_at is not null;

-- A rolling deployment can still contain a trusted legacy function that
-- writes the profile marker directly. Fence that marker transition before the
-- AFTER compatibility trigger creates its durable job. ENABLE ALWAYS covers
-- maintenance/replication writes too. The lock order matches the canonical
-- request RPC: billing, profile media, post media, then message media.
create or replace function public.fence_legacy_account_deletion_guard()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  should_fence boolean := false;
begin
  if tg_op = 'INSERT' then
    should_fence := new.deletion_started_at is not null;
  elsif tg_op = 'UPDATE' then
    should_fence := new.deletion_started_at is not null
      and old.deletion_started_at is distinct from new.deletion_started_at;
  end if;

  if should_fence then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.id::text, 413562871)
    );
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'reflab:profile-media-quota:' || new.id::text,
        0
      )
    );
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'reflab:post-media-quota:' || new.id::text,
        0
      )
    );
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'reflab:message-media-quota:' || new.id::text,
        0
      )
    );
  end if;

  return new;
end;
$function$;

revoke all privileges
  on function public.fence_legacy_account_deletion_guard()
  from public, anon, authenticated, service_role;

grant execute
  on function public.fence_legacy_account_deletion_guard()
  to service_role;

drop trigger if exists fence_legacy_account_deletion_guard
  on public.profiles;
create trigger fence_legacy_account_deletion_guard
  before insert or update of deletion_started_at on public.profiles
  for each row
  execute function public.fence_legacy_account_deletion_guard();

alter table public.profiles
  enable always trigger fence_legacy_account_deletion_guard;

-- Compatibility bridge for a rolling deploy. Any legacy function that sets
-- the old profile guard after this migration immediately creates a durable
-- billing_closing job. ENABLE ALWAYS also protects logical-replication and
-- maintenance paths that run with session_replication_role = replica.
create or replace function public.capture_legacy_account_deletion_guard()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  should_capture boolean := false;
begin
  if tg_op = 'INSERT' then
    should_capture := new.deletion_started_at is not null;
  elsif tg_op = 'UPDATE' then
    should_capture := new.deletion_started_at is not null
      and old.deletion_started_at is distinct from new.deletion_started_at;
  end if;

  if should_capture then
    insert into public.account_deletion_jobs (
      user_id,
      phase,
      phase_started_at,
      created_at,
      updated_at
    ) values (
      new.id,
      'billing_closing',
      new.deletion_started_at,
      new.deletion_started_at,
      statement_timestamp()
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$;

revoke all privileges
  on function public.capture_legacy_account_deletion_guard()
  from public, anon, authenticated, service_role;

grant execute
  on function public.capture_legacy_account_deletion_guard()
  to service_role;

drop trigger if exists capture_legacy_account_deletion_guard
  on public.profiles;
create trigger capture_legacy_account_deletion_guard
  after insert or update of deletion_started_at on public.profiles
  for each row
  execute function public.capture_legacy_account_deletion_guard();

alter table public.profiles
  enable always trigger capture_legacy_account_deletion_guard;

-- The authenticated HTTP endpoint only creates this durable, unleased intent.
-- It never owns workflow execution: scheduled workers claim the row separately.
-- ON CONFLICT makes response-loss retries idempotent even while a worker holds
-- the job lease or has advanced to a later phase.
create or replace function public.request_account_deletion(
  p_user_id uuid
)
returns table (
  user_id uuid,
  phase text,
  created_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  existing_job public.account_deletion_jobs%rowtype;
begin
  if p_user_id is null then
    raise exception 'account deletion user identifier is required'
      using errcode = '22023';
  end if;

  -- A committed job already fences every upload path. Return it before taking
  -- the profile row so response-loss retries cannot contend with a worker
  -- that is already cascading the account in a later phase.
  select jobs.*
    into existing_job
    from public.account_deletion_jobs as jobs
   where jobs.user_id = p_user_id;

  if found then
    return query
    select existing_job.user_id, existing_job.phase, existing_job.created_at;
    return;
  end if;

  -- Lock the existing profile row before the advisory-lock family. Legacy
  -- marker updates take their row lock before the BEFORE fence runs; matching
  -- that order avoids a row/advisory inversion during a mixed-version deploy.
  perform 1
    from public.profiles as profile
   where profile.id = p_user_id
   for update;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 413562871)
  );

  -- Serialize the deletion boundary with every per-owner Storage admission.
  -- The fixed order is shared by all deletion requests. Each upload policy
  -- takes its matching lock and then rechecks account_accepts_uploads(): an
  -- upload that already won commits before this job is visible and is swept
  -- by the worker; once this transaction wins, later uploads fail closed.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:profile-media-quota:' || p_user_id::text,
      0
    )
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:post-media-quota:' || p_user_id::text,
      0
    )
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:message-media-quota:' || p_user_id::text,
      0
    )
  );

  insert into public.account_deletion_jobs as jobs (
    user_id,
    phase,
    phase_started_at,
    created_at,
    updated_at
  ) values (
    p_user_id,
    'requested',
    statement_timestamp(),
    statement_timestamp(),
    statement_timestamp()
  )
  on conflict on constraint account_deletion_jobs_pkey do nothing;

  -- The profile marker remains a private compatibility projection. The job
  -- row above is the source of truth and exists before this trigger can run.
  update public.profiles as profile
     set deletion_started_at = coalesce(
       profile.deletion_started_at,
       statement_timestamp()
     )
   where profile.id = p_user_id;

  return query
  select jobs.user_id, jobs.phase, jobs.created_at
    from public.account_deletion_jobs as jobs
   where jobs.user_id = p_user_id;
end;
$function$;

-- Acquire a new job, resume a released job immediately, or take over a worker
-- whose lease expired. INSERT .. ON CONFLICT .. WHERE makes the decision
-- atomic; an active different lease returns no row.
create or replace function public.acquire_account_deletion_lease(
  p_user_id uuid,
  p_lease_id uuid,
  p_lease_seconds integer default 900
)
returns table (
  user_id uuid,
  phase text,
  lease_id uuid,
  lease_expires_at timestamptz,
  attempt_count integer
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  acquired public.account_deletion_jobs%rowtype;
  lease_now timestamptz := statement_timestamp();
begin
  if p_user_id is null or p_lease_id is null then
    raise exception 'account deletion lease identifiers are required'
      using errcode = '22023';
  end if;
  if p_lease_seconds is null
     or p_lease_seconds < 60
     or p_lease_seconds > 3600 then
    raise exception 'account deletion lease must be between 60 and 3600 seconds'
      using errcode = '22023';
  end if;

  perform 1
    from public.profiles as profile
   where profile.id = p_user_id
   for update;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 413562871)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:profile-media-quota:' || p_user_id::text,
      0
    )
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:post-media-quota:' || p_user_id::text,
      0
    )
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:message-media-quota:' || p_user_id::text,
      0
    )
  );

  insert into public.account_deletion_jobs as jobs (
    user_id,
    phase,
    lease_id,
    lease_acquired_at,
    lease_expires_at,
    attempt_count,
    phase_started_at,
    created_at,
    updated_at
  )
  values (
    p_user_id,
    'requested',
    p_lease_id,
    lease_now,
    lease_now + make_interval(secs => p_lease_seconds),
    1,
    lease_now,
    lease_now,
    lease_now
  )
  on conflict on constraint account_deletion_jobs_pkey do update
    set lease_id = excluded.lease_id,
        lease_acquired_at = excluded.lease_acquired_at,
        lease_expires_at = excluded.lease_expires_at,
        attempt_count = jobs.attempt_count + 1,
        last_error = null,
        last_error_at = null,
        updated_at = lease_now
    where jobs.lease_id is null
       or jobs.lease_id = excluded.lease_id
       or jobs.lease_expires_at <= lease_now
  returning jobs.* into acquired;

  if not found then
    return;
  end if;

  -- Compatibility columns remain private and are no longer the source of
  -- truth. This update intentionally succeeds with zero rows when a profile is
  -- absent; the durable job still owns the deletion.
  update public.profiles as p
     set deletion_started_at = coalesce(p.deletion_started_at, lease_now),
         deletion_guard_id = p_lease_id
   where p.id = p_user_id;

  return query
  select
    acquired.user_id,
    acquired.phase,
    acquired.lease_id,
    acquired.lease_expires_at,
    acquired.attempt_count;
end;
$function$;

-- Scheduled workers claim one free or expired job at a time. SKIP LOCKED lets
-- multiple invocations run safely, while the lease makes process death
-- recoverable without a new authenticated request.
create or replace function public.claim_next_account_deletion_job(
  p_lease_id uuid,
  p_lease_seconds integer default 900
)
returns table (
  user_id uuid,
  phase text,
  lease_id uuid,
  lease_expires_at timestamptz,
  attempt_count integer
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  claimed public.account_deletion_jobs%rowtype;
  lease_now timestamptz := statement_timestamp();
begin
  if p_lease_id is null then
    raise exception 'account deletion lease identifier is required'
      using errcode = '22023';
  end if;
  if p_lease_seconds is null
     or p_lease_seconds < 60
     or p_lease_seconds > 3600 then
    raise exception 'account deletion lease must be between 60 and 3600 seconds'
      using errcode = '22023';
  end if;

  with candidate as (
    select jobs.user_id
      from public.account_deletion_jobs as jobs
     where jobs.lease_id is null
        or jobs.lease_expires_at <= lease_now
     order by jobs.created_at, jobs.user_id
     for update skip locked
     limit 1
  )
  update public.account_deletion_jobs as jobs
     set lease_id = p_lease_id,
         lease_acquired_at = lease_now,
         lease_expires_at = lease_now + make_interval(secs => p_lease_seconds),
         attempt_count = jobs.attempt_count + 1,
         last_error = null,
         last_error_at = null,
         updated_at = lease_now
    from candidate
   where jobs.user_id = candidate.user_id
  returning jobs.* into claimed;

  if not found then
    return;
  end if;

  return query select
    claimed.user_id,
    claimed.phase,
    claimed.lease_id,
    claimed.lease_expires_at,
    claimed.attempt_count;
end;
$function$;

-- A deletion worker may recover a Stripe customer from idempotent replay or
-- metadata search. Record that discovery only while it owns the job lease so
-- checkout and a stale worker cannot disagree about who owns cleanup.
create or replace function public.record_account_deletion_provisioned_customer(
  p_user_id uuid,
  p_lease_id uuid,
  p_intent_id uuid,
  p_stripe_customer_id text
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  recorded_intent_id uuid;
  record_now timestamptz := statement_timestamp();
begin
  if p_user_id is null
     or p_lease_id is null
     or p_intent_id is null
     or nullif(p_stripe_customer_id, '') is null then
    raise exception 'account deletion billing identifiers are required'
      using errcode = '22023';
  end if;

  update public.billing_customer_provisioning_intents as intents
     set stripe_customer_id = p_stripe_customer_id,
         status = 'resolved',
         resolved_at = coalesce(intents.resolved_at, record_now),
         updated_at = record_now
   where intents.intent_id = p_intent_id
     and intents.user_id = p_user_id
     and (
       intents.stripe_customer_id is null
       or intents.stripe_customer_id = p_stripe_customer_id
     )
     and exists (
       select 1
         from public.account_deletion_jobs as jobs
        where jobs.user_id = p_user_id
          and jobs.lease_id = p_lease_id
     )
  returning intents.intent_id into recorded_intent_id;

  return recorded_intent_id is not null;
end;
$function$;

-- Heartbeats are also the stale-lease race arbiter. The previous worker may
-- renew an expired lease only if no takeover has changed lease_id first.
create or replace function public.renew_account_deletion_lease(
  p_user_id uuid,
  p_lease_id uuid,
  p_lease_seconds integer default 900
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  renewed_user_id uuid;
  lease_now timestamptz := statement_timestamp();
begin
  if p_user_id is null or p_lease_id is null then
    raise exception 'account deletion lease identifiers are required'
      using errcode = '22023';
  end if;
  if p_lease_seconds is null
     or p_lease_seconds < 60
     or p_lease_seconds > 3600 then
    raise exception 'account deletion lease must be between 60 and 3600 seconds'
      using errcode = '22023';
  end if;

  update public.account_deletion_jobs
     set lease_expires_at = lease_now + make_interval(secs => p_lease_seconds),
         updated_at = lease_now
   where user_id = p_user_id
     and lease_id = p_lease_id
  returning user_id into renewed_user_id;

  return renewed_user_id is not null;
end;
$function$;

-- The database, not the Edge Function, owns the monotonic phase contract.
create or replace function public.advance_account_deletion_phase(
  p_user_id uuid,
  p_lease_id uuid,
  p_expected_phase text,
  p_next_phase text
)
returns table (
  user_id uuid,
  phase text,
  lease_id uuid,
  lease_expires_at timestamptz,
  attempt_count integer
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  advanced public.account_deletion_jobs%rowtype;
  phase_now timestamptz := statement_timestamp();
begin
  if p_user_id is null
     or p_lease_id is null
     or p_expected_phase is null
     or p_next_phase is null
     or not (
    (p_expected_phase = 'requested' and p_next_phase = 'billing_closing')
    or (p_expected_phase = 'billing_closing' and p_next_phase = 'billing_closed')
    or (p_expected_phase = 'billing_closed' and p_next_phase = 'storage_purged')
    or (p_expected_phase = 'storage_purged' and p_next_phase = 'auth')
  ) then
    raise exception 'invalid account deletion phase transition: % -> %',
      p_expected_phase,
      p_next_phase
      using errcode = '22023';
  end if;

  update public.account_deletion_jobs as jobs
     set phase = p_next_phase,
         phase_started_at = phase_now,
         billing_closed_at = case
           when p_next_phase = 'billing_closed' then phase_now
           else jobs.billing_closed_at
         end,
         storage_purged_at = case
           when p_next_phase = 'storage_purged' then phase_now
           else jobs.storage_purged_at
         end,
         lease_expires_at = phase_now + interval '15 minutes',
         updated_at = phase_now
   where jobs.user_id = p_user_id
     and jobs.lease_id = p_lease_id
     and jobs.phase = p_expected_phase
  returning jobs.* into advanced;

  if not found then
    return;
  end if;

  return query
  select
    advanced.user_id,
    advanced.phase,
    advanced.lease_id,
    advanced.lease_expires_at,
    advanced.attempt_count;
end;
$function$;

-- Failures at every phase keep the durable deletion intent and account block.
-- The scheduled worker can resume immediately after this lease release.
create or replace function public.release_account_deletion_lease(
  p_user_id uuid,
  p_lease_id uuid,
  p_error text default null
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  released_user_id uuid;
  release_now timestamptz := statement_timestamp();
begin
  -- Every path that needs both rows takes profiles before deletion_jobs. The
  -- scheduled claim no longer rewrites the compatibility marker, so this
  -- ordering cannot deadlock with the rolling-deploy BEFORE fence.
  perform 1
    from public.profiles as profile
   where profile.id = p_user_id
   for update;

  update public.account_deletion_jobs
     set lease_id = null,
         lease_expires_at = null,
         last_error = left(nullif(p_error, ''), 500),
         last_error_at = case
           when nullif(p_error, '') is null then null
           else release_now
         end,
         updated_at = release_now
   where user_id = p_user_id
     and lease_id = p_lease_id
  returning user_id into released_user_id;

  if released_user_id is null then
    return false;
  end if;

  update public.profiles
     set deletion_guard_id = null
   where id = p_user_id
     and deletion_guard_id = p_lease_id;

  return true;
end;
$function$;

-- Browser-facing storage policies use this definer helper because neither the
-- private profile guard columns nor the service-only job table are selectable
-- by authenticated clients. auth.uid() binding prevents cross-user probing.
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
    )
    and not exists (
      select 1
        from public.account_deletion_jobs as j
       where j.user_id = uid
    );
$function$;

-- Checkout is a service-only call, so it does not bind to auth.uid(). Keeping
-- this decision in one database snapshot prevents the Edge Function from
-- accidentally checking the profile and durable job at different times.
create or replace function public.account_accepts_checkout(uid uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    uid is not null
    and exists (
      select 1
        from public.profiles as p
       where p.id = uid
         and p.deletion_started_at is null
    )
    and not exists (
      select 1
        from public.account_deletion_jobs as j
       where j.user_id = uid
    );
$function$;

revoke all privileges
  on function
    public.begin_billing_customer_provisioning(uuid, text),
    public.complete_billing_customer_provisioning(uuid, uuid, text),
    public.request_account_deletion(uuid),
    public.acquire_account_deletion_lease(uuid, uuid, integer),
    public.claim_next_account_deletion_job(uuid, integer),
    public.record_account_deletion_provisioned_customer(uuid, uuid, uuid, text),
    public.renew_account_deletion_lease(uuid, uuid, integer),
    public.advance_account_deletion_phase(uuid, uuid, text, text),
    public.release_account_deletion_lease(uuid, uuid, text),
    public.account_accepts_checkout(uuid)
  from public, anon, authenticated, service_role;

grant execute
  on function
    public.begin_billing_customer_provisioning(uuid, text),
    public.complete_billing_customer_provisioning(uuid, uuid, text),
    public.request_account_deletion(uuid),
    public.acquire_account_deletion_lease(uuid, uuid, integer),
    public.claim_next_account_deletion_job(uuid, integer),
    public.record_account_deletion_provisioned_customer(uuid, uuid, uuid, text),
    public.renew_account_deletion_lease(uuid, uuid, integer),
    public.advance_account_deletion_phase(uuid, uuid, text, text),
    public.release_account_deletion_lease(uuid, uuid, text),
    public.account_accepts_checkout(uuid)
  to service_role;

revoke all privileges
  on function public.account_accepts_uploads(uuid)
  from public, anon, authenticated, service_role;

grant execute
  on function public.account_accepts_uploads(uuid)
  to authenticated, service_role;
