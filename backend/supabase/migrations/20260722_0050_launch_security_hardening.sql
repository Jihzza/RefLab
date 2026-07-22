-- RefLab launch security hardening
-- Data-preserving hardening: apply this migration in isolation after reconciling
-- the production migration history. Do not replay historical migrations.
-- Deploy the frontend's explicit profile selects and signed message-media URLs
-- before this migration; the current production frontend still relies on
-- profiles.select('*') and a public message-media bucket.

begin;

-- Fail before changing anything if production does not match the catalog that
-- this one-off reconciliation migration was reviewed against. The whole file
-- is transactional, but an explicit preflight makes drift diagnosable and
-- prevents a misleading partial rollout through tools that split statements.
do $launch_contract_preflight$
declare
  v_missing_relations text[];
  v_missing_columns text[];
  v_missing_types text[];
  v_missing_functions text[];
  v_invalid_foreign_keys text[];
  v_not_owned_relations text[];
begin
  if current_setting('server_version_num')::integer < 150000 then
    raise exception 'Launch hardening requires PostgreSQL 15 or newer';
  end if;

  if not exists (
    select 1
    from pg_roles role_entry
    where role_entry.rolname = 'service_role'
      and role_entry.rolbypassrls
  ) then
    raise exception 'Launch hardening requires service_role with BYPASSRLS'
      using hint = 'Restore the canonical Supabase role contract before applying 20260722_0050.';
  end if;

  select array_agg(required_relation order by required_relation)
  into v_missing_relations
  from unnest(array[
    'public.profiles',
    'public.public_profiles',
    'public.user_settings',
    'public.user_blocks',
    'public.user_follows',
    'public.posts',
    'public.post_likes',
    'public.post_saves',
    'public.post_comments',
    'public.comment_likes',
    'public.conversations',
    'public.conversation_participants',
    'public.messages',
    'public.test_attempts',
    'storage.buckets',
    'storage.objects'
  ]::text[]) required_relation
  where to_regclass(required_relation) is null;

  select array_agg(
    required_schema || '.' || required_table || '.' || required_column
    order by required_schema, required_table, required_column
  )
  into v_missing_columns
  from (
    values
      ('public', 'conversations', 'user_a_id'),
      ('public', 'conversations', 'user_b_id'),
      ('public', 'conversation_participants', 'user_id'),
      ('public', 'messages', 'sender_id'),
      ('storage', 'objects', 'bucket_id'),
      ('storage', 'objects', 'name'),
      ('storage', 'objects', 'owner_id')
  ) required(required_schema, required_table, required_column)
  where not exists (
    select 1
    from information_schema.columns catalog_column
    where catalog_column.table_schema = required.required_schema
      and catalog_column.table_name = required.required_table
      and catalog_column.column_name = required.required_column
  );

  select array_agg(required_type order by required_type)
  into v_missing_types
  from unnest(array[
    'public.message_media_type',
    'public.messaging_privacy'
  ]::text[]) required_type
  where to_regtype(required_type) is null;

  select array_agg(required_function order by required_function)
  into v_missing_functions
  from unnest(array[
    'public.is_admin()',
    'public.create_notification(uuid,uuid,text,text,text)',
    'public.create_notification(uuid,uuid,text,text,text,uuid)',
    'public.check_plan_expiration_reminders()',
    'public.get_user_plan(uuid)',
    'public.get_social_feed(uuid,text,timestamptz,integer)',
    'public.get_post_comments(uuid,uuid)',
    'public.get_post_by_id(uuid,uuid)',
    'public.get_public_profile_view(uuid,text)',
    'public.get_public_profile_feed(uuid,uuid,timestamptz,integer)',
    'public.get_profile_feed(uuid,uuid,text,timestamptz,integer)',
    'public.search_users(text)',
    'public.search_users(text,uuid,integer)',
    'public.get_or_create_conversation(uuid,uuid)',
    'public.get_conversations(uuid)',
    'public.get_messages(uuid,uuid,timestamptz,integer)',
    'public.get_total_unread_count(uuid)',
    'public.get_attempt_topic_breakdown(uuid)',
    'public.get_random_questions()',
    'storage.foldername(text)'
  ]::text[]) required_function
  where to_regprocedure(required_function) is null;

  -- These child-side CASCADE contracts are what make the retention rewrite
  -- selective: only the deleted profile's participant row and messages are
  -- removed, while deleting an ownerless conversation clears its children.
  select array_agg(required_contract order by required_contract)
  into v_invalid_foreign_keys
  from (
    values
      (
        'conversation_participants.conversation_id -> conversations CASCADE',
        'public.conversation_participants',
        'conversation_id',
        'public.conversations'
      ),
      (
        'conversation_participants.user_id -> profiles CASCADE',
        'public.conversation_participants',
        'user_id',
        'public.profiles'
      ),
      (
        'messages.conversation_id -> conversations CASCADE',
        'public.messages',
        'conversation_id',
        'public.conversations'
      ),
      (
        'messages.sender_id -> profiles CASCADE',
        'public.messages',
        'sender_id',
        'public.profiles'
      )
  ) required(
    required_contract,
    child_relation,
    child_column,
    parent_relation
  )
  where not exists (
    select 1
    from pg_constraint constraint_entry
    join pg_attribute child_attribute
      on child_attribute.attrelid = constraint_entry.conrelid
     and child_attribute.attnum = constraint_entry.conkey[1]
    where constraint_entry.contype = 'f'
      and constraint_entry.conrelid = to_regclass(required.child_relation)
      and constraint_entry.confrelid = to_regclass(required.parent_relation)
      and constraint_entry.confdeltype = 'c'
      and cardinality(constraint_entry.conkey) = 1
      and child_attribute.attname = required.child_column
  );

  -- SECURITY DEFINER block predicates must be created by a role that can read
  -- through RLS. Supabase migrations normally run as postgres. A non-bypass
  -- role is accepted only when it owns every table those predicates inspect.
  if not exists (
    select 1
    from pg_roles role_entry
    where role_entry.rolname = current_user
      and (role_entry.rolsuper or role_entry.rolbypassrls)
  ) then
    select array_agg(required_relation order by required_relation)
    into v_not_owned_relations
    from unnest(array[
      'public.profiles',
      'public.user_settings',
      'public.user_blocks',
      'public.user_follows',
      'public.posts',
      'public.post_comments',
      'public.conversations',
      'public.conversation_participants',
      'public.messages',
      'public.test_attempts'
    ]::text[]) required_relation
    join pg_class relation_entry
      on relation_entry.oid = to_regclass(required_relation)
    join pg_roles owner_entry
      on owner_entry.oid = relation_entry.relowner
    where owner_entry.rolname <> current_user;
  end if;

  if coalesce(cardinality(v_missing_relations), 0) > 0
     or coalesce(cardinality(v_missing_columns), 0) > 0
     or coalesce(cardinality(v_missing_types), 0) > 0
     or coalesce(cardinality(v_missing_functions), 0) > 0
     or coalesce(cardinality(v_invalid_foreign_keys), 0) > 0
     or coalesce(cardinality(v_not_owned_relations), 0) > 0 then
    raise exception 'Launch hardening catalog preflight failed'
      using detail = concat_ws(
        '; ',
        case when cardinality(v_missing_relations) > 0
          then 'missing relations: ' || array_to_string(v_missing_relations, ', ')
        end,
        case when cardinality(v_missing_columns) > 0
          then 'missing columns: ' || array_to_string(v_missing_columns, ', ')
        end,
        case when cardinality(v_missing_types) > 0
          then 'missing types: ' || array_to_string(v_missing_types, ', ')
        end,
        case when cardinality(v_missing_functions) > 0
          then 'missing functions: ' || array_to_string(v_missing_functions, ', ')
        end,
        case when cardinality(v_invalid_foreign_keys) > 0
          then 'invalid foreign-key contracts: '
            || array_to_string(v_invalid_foreign_keys, ', ')
        end,
        case when cardinality(v_not_owned_relations) > 0
          then 'relations not owned by migration role: '
            || array_to_string(v_not_owned_relations, ', ')
        end
      ),
      hint = 'Reconcile the production catalog and migration history before applying 20260722_0050.';
  end if;
end;
$launch_contract_preflight$;

-- ---------------------------------------------------------------------------
-- Account deletion: durable, resumable state for the service-side worker.
--
-- Deliberately no FK to auth.users: the row must survive the auth deletion so
-- the operation can reach `completed` and retain failure context. The user_id
-- primary key is the idempotency key for retries/upserts.
-- ---------------------------------------------------------------------------

create table if not exists public.account_deletion_jobs (
  user_id uuid primary key,
  status text not null default 'requested',
  attempts integer not null default 0,
  last_error text,
  claim_token uuid,
  claim_expires_at timestamptz,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint account_deletion_jobs_status_check check (
    status in (
      'requested',
      'billing_cancelled',
      'media_deleted',
      'auth_deleted',
      'completed',
      'failed'
    )
  ),
  constraint account_deletion_jobs_attempts_check check (attempts >= 0),
  constraint account_deletion_jobs_claim_pair_check check (
    (claim_token is null) = (claim_expires_at is null)
  ),
  constraint account_deletion_jobs_terminal_claim_check check (
    status not in ('completed', 'failed') or claim_token is null
  )
);

-- `create table if not exists` does not reconcile columns on a partially
-- provisioned database. These additions keep the one-off migration safe to
-- resume without dropping or rewriting any deletion history.
alter table public.account_deletion_jobs
  add column if not exists claim_token uuid;
alter table public.account_deletion_jobs
  add column if not exists claim_expires_at timestamptz;

do $account_deletion_job_claim_constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.account_deletion_jobs'::regclass
      and conname = 'account_deletion_jobs_claim_pair_check'
  ) then
    alter table public.account_deletion_jobs
      add constraint account_deletion_jobs_claim_pair_check check (
        (claim_token is null) = (claim_expires_at is null)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.account_deletion_jobs'::regclass
      and conname = 'account_deletion_jobs_terminal_claim_check'
  ) then
    alter table public.account_deletion_jobs
      add constraint account_deletion_jobs_terminal_claim_check check (
        status not in ('completed', 'failed') or claim_token is null
      );
  end if;
end;
$account_deletion_job_claim_constraints$;

create index if not exists account_deletion_jobs_pending_idx
  on public.account_deletion_jobs(status, updated_at)
  where status <> 'completed';

create index if not exists account_deletion_jobs_claim_expiry_idx
  on public.account_deletion_jobs(claim_expires_at)
  where claim_expires_at is not null;

create or replace function public.touch_account_deletion_job_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_account_deletion_job_updated_at()
  from public, anon, authenticated;

drop trigger if exists on_account_deletion_job_updated
  on public.account_deletion_jobs;
create trigger on_account_deletion_job_updated
  before update on public.account_deletion_jobs
  for each row execute function public.touch_account_deletion_job_updated_at();

alter table public.account_deletion_jobs enable row level security;

revoke all on table public.account_deletion_jobs
  from public, anon, authenticated;
grant select, insert, update, delete on table public.account_deletion_jobs
  to service_role;

-- A durable lease fences concurrent Edge Function requests while the external
-- Stripe, Storage, and Auth calls run outside a database transaction. Only the
-- service role can call these SECURITY INVOKER functions; direct table access
-- remains available for operational recovery without exposing a definer path.
create or replace function public.claim_account_deletion_job(
  p_user_id uuid,
  p_lease_seconds integer default 900
)
returns table (
  status text,
  attempts integer,
  claim_token uuid,
  claim_expires_at timestamptz,
  acquired boolean
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_claim_token uuid := pg_catalog.gen_random_uuid();
  v_job public.account_deletion_jobs%rowtype;
begin
  if p_user_id is null then
    raise exception 'p_user_id must not be null' using errcode = '22004';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'p_lease_seconds must be between 30 and 3600'
      using errcode = '22023';
  end if;

  insert into public.account_deletion_jobs as deletion_job (
    user_id,
    status,
    attempts,
    last_error,
    claim_token,
    claim_expires_at
  )
  values (
    p_user_id,
    'requested',
    1,
    null,
    v_claim_token,
    v_now + pg_catalog.make_interval(secs => p_lease_seconds)
  )
  on conflict (user_id) do update
  set
    status = case
      when deletion_job.status = 'failed' then 'requested'
      else deletion_job.status
    end,
    attempts = deletion_job.attempts + 1,
    last_error = null,
    completed_at = case
      when deletion_job.status = 'failed' then null
      else deletion_job.completed_at
    end,
    claim_token = v_claim_token,
    claim_expires_at = v_now + pg_catalog.make_interval(secs => p_lease_seconds)
  where deletion_job.status <> 'completed'
    and (
      deletion_job.claim_token is null
      or deletion_job.claim_expires_at <= v_now
    )
  returning deletion_job.* into v_job;

  if found then
    return query
    select
      v_job.status,
      v_job.attempts,
      v_claim_token,
      v_job.claim_expires_at,
      true;
    return;
  end if;

  -- ON CONFLICT can legitimately return no row for a live lease or completed
  -- job. Return that state without leaking its fencing token.
  select deletion_job.*
  into v_job
  from public.account_deletion_jobs deletion_job
  where deletion_job.user_id = p_user_id;

  if not found then
    raise exception 'Account deletion job disappeared during claim'
      using errcode = '40001';
  end if;

  return query
  select
    v_job.status,
    v_job.attempts,
    null::uuid,
    v_job.claim_expires_at,
    false;
end;
$$;

create or replace function public.advance_account_deletion_job(
  p_user_id uuid,
  p_claim_token uuid,
  p_next_status text,
  p_lease_seconds integer default 900
)
returns table (
  status text,
  attempts integer,
  claim_token uuid,
  claim_expires_at timestamptz,
  advanced boolean
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_job public.account_deletion_jobs%rowtype;
  v_current_rank integer;
  v_next_rank integer;
begin
  if p_user_id is null or p_claim_token is null then
    raise exception 'p_user_id and p_claim_token must not be null'
      using errcode = '22004';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'p_lease_seconds must be between 30 and 3600'
      using errcode = '22023';
  end if;

  v_next_rank := case p_next_status
    when 'requested' then 0
    when 'billing_cancelled' then 1
    when 'media_deleted' then 2
    when 'auth_deleted' then 3
    when 'completed' then 4
    else null
  end;

  if v_next_rank is null then
    raise exception 'Invalid account deletion status: %', p_next_status
      using errcode = '22023';
  end if;

  select deletion_job.*
  into v_job
  from public.account_deletion_jobs deletion_job
  where deletion_job.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Account deletion job does not exist'
      using errcode = 'P0002';
  end if;

  -- Completed is terminal. This is intentionally idempotent even if a stale
  -- worker retries with an old token or target status.
  if v_job.status = 'completed' then
    return query
    select
      v_job.status,
      v_job.attempts,
      null::uuid,
      null::timestamptz,
      false;
    return;
  end if;

  if v_job.claim_token is distinct from p_claim_token then
    raise exception 'Account deletion lease is not owned by this request'
      using errcode = '42501';
  end if;

  v_current_rank := case v_job.status
    when 'requested' then 0
    when 'billing_cancelled' then 1
    when 'media_deleted' then 2
    when 'auth_deleted' then 3
    else null
  end;

  if v_current_rank is null then
    raise exception 'Account deletion job is not in an advanceable state'
      using errcode = '55000';
  end if;

  if v_next_rank < v_current_rank then
    return query
    select
      v_job.status,
      v_job.attempts,
      p_claim_token,
      v_job.claim_expires_at,
      false;
    return;
  end if;

  if v_next_rank > v_current_rank + 1 then
    raise exception 'Account deletion status cannot skip a checkpoint'
      using errcode = '22023';
  end if;

  update public.account_deletion_jobs as deletion_job
  set
    status = p_next_status,
    last_error = null,
    completed_at = case
      when p_next_status = 'completed' then v_now
      else deletion_job.completed_at
    end,
    claim_token = case
      when p_next_status = 'completed' then null
      else p_claim_token
    end,
    claim_expires_at = case
      when p_next_status = 'completed' then null
      else v_now + pg_catalog.make_interval(secs => p_lease_seconds)
    end
  where deletion_job.user_id = p_user_id
  returning deletion_job.* into v_job;

  return query
  select
    v_job.status,
    v_job.attempts,
    v_job.claim_token,
    v_job.claim_expires_at,
    v_next_rank > v_current_rank;
end;
$$;

create or replace function public.record_account_deletion_job_failure(
  p_user_id uuid,
  p_claim_token uuid,
  p_last_error text
)
returns table (
  status text,
  attempts integer
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_job public.account_deletion_jobs%rowtype;
begin
  if p_user_id is null or p_claim_token is null then
    raise exception 'p_user_id and p_claim_token must not be null'
      using errcode = '22004';
  end if;

  select deletion_job.*
  into v_job
  from public.account_deletion_jobs deletion_job
  where deletion_job.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Account deletion job does not exist'
      using errcode = 'P0002';
  end if;

  if v_job.status = 'completed' then
    return query select v_job.status, v_job.attempts;
    return;
  end if;

  if v_job.claim_token is distinct from p_claim_token then
    raise exception 'Account deletion lease is not owned by this request'
      using errcode = '42501';
  end if;

  update public.account_deletion_jobs as deletion_job
  set
    -- Before any irreversible checkpoint, use `failed` as the resumable state.
    -- The Storage guard below deliberately blocks on the existence of the job,
    -- including `failed`; there is no implicit cancellation or upload-reopen.
    -- Afterwards retain the checkpoint so a later claim resumes safely.
    status = case
      when deletion_job.status = 'requested' then 'failed'
      else deletion_job.status
    end,
    last_error = pg_catalog.left(
      coalesce(nullif(pg_catalog.btrim(p_last_error), ''), 'Unknown deletion error'),
      2000
    ),
    claim_token = null,
    claim_expires_at = null
  where deletion_job.user_id = p_user_id
  returning deletion_job.* into v_job;

  return query select v_job.status, v_job.attempts;
end;
$$;

revoke all on function public.claim_account_deletion_job(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.advance_account_deletion_job(
  uuid, uuid, text, integer
) from public, anon, authenticated;
revoke all on function public.record_account_deletion_job_failure(
  uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.claim_account_deletion_job(uuid, integer)
  to service_role;
grant execute on function public.advance_account_deletion_job(
  uuid, uuid, text, integer
) to service_role;
grant execute on function public.record_account_deletion_job_failure(
  uuid, uuid, text
) to service_role;

-- ---------------------------------------------------------------------------
-- Conversation retention during account deletion.
--
-- A profile used to cascade-delete every shared conversation, including the
-- surviving participant's messages. Nullable participant references preserve
-- the shared row after the first deletion. The participant and sender FKs keep
-- their existing CASCADE behavior, so only the deleted profile's membership
-- and messages disappear. When the final profile is later deleted, the BEFORE
-- DELETE trigger removes the now-ownerless conversation and its remaining
-- children before the at-least-one-participant check can be violated.
-- ---------------------------------------------------------------------------

alter table public.conversations
  alter column user_a_id drop not null,
  alter column user_b_id drop not null;

-- Replace every canonical single-column FK, including a differently named
-- production equivalent, so no lingering ON DELETE CASCADE can delete data
-- owned by the surviving participant.
do $replace_conversation_profile_foreign_keys$
declare
  v_column_name text;
  v_attribute_number smallint;
  v_constraint record;
begin
  foreach v_column_name in array array['user_a_id', 'user_b_id'] loop
    select attribute_entry.attnum
    into strict v_attribute_number
    from pg_attribute attribute_entry
    where attribute_entry.attrelid = 'public.conversations'::regclass
      and attribute_entry.attname = v_column_name
      and not attribute_entry.attisdropped;

    for v_constraint in
      select constraint_entry.conname
      from pg_constraint constraint_entry
      where constraint_entry.conrelid = 'public.conversations'::regclass
        and constraint_entry.contype = 'f'
        and (
          constraint_entry.conkey = array[v_attribute_number]::smallint[]
          or constraint_entry.conname = 'conversations_' || v_column_name || '_fkey'
        )
    loop
      execute format(
        'alter table public.conversations drop constraint %I',
        v_constraint.conname
      );
    end loop;
  end loop;
end;
$replace_conversation_profile_foreign_keys$;

alter table public.conversations
  add constraint conversations_user_a_id_fkey
    foreign key (user_a_id)
    references public.profiles(id)
    on delete set null
    not valid,
  add constraint conversations_user_b_id_fkey
    foreign key (user_b_id)
    references public.profiles(id)
    on delete set null
    not valid;

alter table public.conversations
  validate constraint conversations_user_a_id_fkey;
alter table public.conversations
  validate constraint conversations_user_b_id_fkey;

alter table public.conversations
  drop constraint if exists conversations_has_remaining_user;
alter table public.conversations
  add constraint conversations_has_remaining_user check (
    user_a_id is not null or user_b_id is not null
  );

create or replace function public.delete_last_profile_conversations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.conversations conversation_entry
  where (
      conversation_entry.user_a_id = old.id
      and conversation_entry.user_b_id is null
    )
    or (
      conversation_entry.user_b_id = old.id
      and conversation_entry.user_a_id is null
    );

  return old;
end;
$$;

revoke all on function public.delete_last_profile_conversations()
  from public, anon, authenticated;

drop trigger if exists on_profile_delete_last_conversations
  on public.profiles;
create trigger on_profile_delete_last_conversations
  before delete on public.profiles
  for each row execute function public.delete_last_profile_conversations();

-- ---------------------------------------------------------------------------
-- Profiles: users may edit presentation fields, never role/email/identity.
-- Keep cross-user reads required by the existing social UI, but expose only
-- non-sensitive presentation columns. Removing every inherited table grant is
-- important here: production currently grants UPDATE on role/email/id as well
-- as TRUNCATE and TRIGGER to the API roles.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can insert own profile" on public.profiles;

revoke all on table public.profiles
  from public, anon, authenticated;

grant select (
  id,
  username,
  username_customized,
  name,
  photo_url,
  created_at,
  updated_at
) on table public.profiles to authenticated;

grant update (
  username,
  username_customized,
  name,
  photo_url,
  last_login_at
) on table public.profiles to authenticated;

alter function public.is_admin() set search_path to public, pg_temp;

-- ---------------------------------------------------------------------------
-- Blocks: make the product promise enforceable at the data boundary.
--
-- user_blocks intentionally lets a browser read only rows it created. These
-- SECURITY DEFINER predicates are therefore required for RLS to see the
-- reverse direction without exposing the block table itself. Caller identity
-- always comes from auth.uid(); browser callers cannot impersonate a viewer.
-- ---------------------------------------------------------------------------

create or replace function public.has_block_relationship(
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select p_user_a is not null
     and p_user_b is not null
     and p_user_a <> p_user_b
     and exists (
       select 1
       from public.user_blocks ub
       where (ub.blocker_id = p_user_a and ub.blocked_id = p_user_b)
          or (ub.blocker_id = p_user_b and ub.blocked_id = p_user_a)
     );
$$;

revoke all on function public.has_block_relationship(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.current_user_has_block_relationship(
  p_other_user_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and public.has_block_relationship(auth.uid(), p_other_user_id);
$$;

revoke all on function public.current_user_has_block_relationship(uuid)
  from public, anon;
grant execute on function public.current_user_has_block_relationship(uuid)
  to authenticated;

-- Directional profile visibility: the blocker may still find the blocked user
-- in Settings to undo the block, but the blocked user cannot read the blocker's
-- profile. Feed and interaction predicates below remain symmetric.
create or replace function public.profile_has_blocked_current_user(
  p_profile_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and p_profile_id is not null
     and exists (
       select 1
       from public.user_blocks ub
       where ub.blocker_id = p_profile_id
         and ub.blocked_id = auth.uid()
     );
$$;

revoke all on function public.profile_has_blocked_current_user(uuid)
  from public, anon;
grant execute on function public.profile_has_blocked_current_user(uuid)
  to authenticated;

create or replace function public.current_user_can_access_post(
  p_post_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.posts p
       left join public.posts original on original.id = p.original_post_id
       where p.id = p_post_id
         and not public.has_block_relationship(auth.uid(), p.user_id)
         and (
           original.id is null
           or not public.has_block_relationship(auth.uid(), original.user_id)
         )
     );
$$;

revoke all on function public.current_user_can_access_post(uuid)
  from public, anon;
grant execute on function public.current_user_can_access_post(uuid)
  to authenticated;

create or replace function public.current_user_can_access_comment(
  p_comment_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.post_comments c
       where c.id = p_comment_id
         and not public.has_block_relationship(auth.uid(), c.user_id)
         and public.current_user_can_access_post(c.post_id)
     );
$$;

revoke all on function public.current_user_can_access_comment(uuid)
  from public, anon;
grant execute on function public.current_user_can_access_comment(uuid)
  to authenticated;

create or replace function public.current_user_can_access_conversation(
  p_conversation_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.conversations c
       where c.id = p_conversation_id
         and (
           auth.uid() = c.user_a_id
           or auth.uid() = c.user_b_id
         )
         and (
           c.user_a_id is null
           or c.user_b_id is null
           or not public.has_block_relationship(c.user_a_id, c.user_b_id)
         )
     );
$$;

revoke all on function public.current_user_can_access_conversation(uuid)
  from public, anon;
grant execute on function public.current_user_can_access_conversation(uuid)
  to authenticated;

-- Read access intentionally survives a peer deletion so the remaining user
-- keeps their own history. Write access is stricter: both profiles must still
-- exist, neither deletion may have begun, and the relationship must be open.
create or replace function public.current_user_can_send_to_conversation(
  p_conversation_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.conversations conversation_entry
       where conversation_entry.id = p_conversation_id
         and conversation_entry.user_a_id is not null
         and conversation_entry.user_b_id is not null
         and (
           auth.uid() = conversation_entry.user_a_id
           or auth.uid() = conversation_entry.user_b_id
         )
         and exists (
           select 1 from public.profiles profile_entry
           where profile_entry.id = conversation_entry.user_a_id
         )
         and exists (
           select 1 from public.profiles profile_entry
           where profile_entry.id = conversation_entry.user_b_id
         )
         and not exists (
           select 1
           from public.account_deletion_jobs deletion_job
           where deletion_job.user_id in (
             conversation_entry.user_a_id,
             conversation_entry.user_b_id
           )
         )
         and not public.has_block_relationship(
           conversation_entry.user_a_id,
           conversation_entry.user_b_id
         )
     );
$$;

revoke all on function public.current_user_can_send_to_conversation(uuid)
  from public, anon;
grant execute on function public.current_user_can_send_to_conversation(uuid)
  to authenticated;

-- Keep existing permissive policies intact for compatibility, then intersect
-- them with restrictive block policies. This remains safe if production has
-- an extra permissive policy not represented in the historical migrations.
-- Profiles are the one deliberate exception: make the presentation-row read
-- policy explicit because public_profiles is changed to security_invoker below.
-- Column grants above keep role, email and identity fields inaccessible.
drop policy if exists "Launch authenticated presentation profile reads"
  on public.profiles;
create policy "Launch authenticated presentation profile reads"
  on public.profiles as permissive for select to authenticated
  using (true);

drop policy if exists "Launch block profile visibility" on public.profiles;
create policy "Launch block profile visibility"
  on public.profiles as restrictive for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or not public.profile_has_blocked_current_user(id)
  );

drop policy if exists "Launch block post visibility" on public.posts;
create policy "Launch block post visibility"
  on public.posts as restrictive for select to authenticated
  using (
    public.is_admin()
    or public.current_user_can_access_post(id)
  );

drop policy if exists "Launch block comment visibility" on public.post_comments;
create policy "Launch block comment visibility"
  on public.post_comments as restrictive for select to authenticated
  using (
    public.is_admin()
    or (
      not public.current_user_has_block_relationship(user_id)
      and public.current_user_can_access_post(post_id)
    )
  );

drop policy if exists "Launch block post like visibility" on public.post_likes;
create policy "Launch block post like visibility"
  on public.post_likes as restrictive for select to authenticated
  using (
    public.is_admin()
    or (
      not public.current_user_has_block_relationship(user_id)
      and public.current_user_can_access_post(post_id)
    )
  );

drop policy if exists "Launch block comment like visibility" on public.comment_likes;
create policy "Launch block comment like visibility"
  on public.comment_likes as restrictive for select to authenticated
  using (
    public.is_admin()
    or (
      not public.current_user_has_block_relationship(user_id)
      and public.current_user_can_access_comment(comment_id)
    )
  );

drop policy if exists "Launch block follow visibility" on public.user_follows;
create policy "Launch block follow visibility"
  on public.user_follows as restrictive for select to authenticated
  using (
    public.is_admin()
    or (
      not public.current_user_has_block_relationship(follower_id)
      and not public.current_user_has_block_relationship(following_id)
    )
  );

drop policy if exists "Launch block safe follows" on public.user_follows;
create policy "Launch block safe follows"
  on public.user_follows as restrictive for insert to authenticated
  with check (
    follower_id = auth.uid()
    and follower_id <> following_id
    and not public.current_user_has_block_relationship(following_id)
  );

drop policy if exists "Launch block safe reposts" on public.posts;
create policy "Launch block safe reposts"
  on public.posts as restrictive for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      original_post_id is null
      or public.current_user_can_access_post(original_post_id)
    )
  );

drop policy if exists "Launch block safe post updates" on public.posts;
create policy "Launch block safe post updates"
  on public.posts as restrictive for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      original_post_id is null
      or public.current_user_can_access_post(original_post_id)
    )
  );

drop policy if exists "Launch block safe post likes" on public.post_likes;
create policy "Launch block safe post likes"
  on public.post_likes as restrictive for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_can_access_post(post_id)
  );

drop policy if exists "Launch block save visibility" on public.post_saves;
create policy "Launch block save visibility"
  on public.post_saves as restrictive for select to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_can_access_post(post_id)
  );

drop policy if exists "Launch block safe saves" on public.post_saves;
create policy "Launch block safe saves"
  on public.post_saves as restrictive for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_can_access_post(post_id)
  );

drop policy if exists "Launch block safe comments" on public.post_comments;
create policy "Launch block safe comments"
  on public.post_comments as restrictive for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_can_access_post(post_id)
    and (
      parent_comment_id is null
      or public.current_user_can_access_comment(parent_comment_id)
    )
  );

drop policy if exists "Launch block safe comment updates"
  on public.post_comments;
create policy "Launch block safe comment updates"
  on public.post_comments as restrictive for update to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_can_access_post(post_id)
    and (
      parent_comment_id is null
      or public.current_user_can_access_comment(parent_comment_id)
    )
  )
  with check (
    user_id = auth.uid()
    and public.current_user_can_access_post(post_id)
    and (
      parent_comment_id is null
      or public.current_user_can_access_comment(parent_comment_id)
    )
  );

drop policy if exists "Launch block safe comment likes" on public.comment_likes;
create policy "Launch block safe comment likes"
  on public.comment_likes as restrictive for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_can_access_comment(comment_id)
  );

drop policy if exists "Launch block conversation visibility" on public.conversations;
create policy "Launch block conversation visibility"
  on public.conversations as restrictive for select to authenticated
  using (public.current_user_can_access_conversation(id));

drop policy if exists "Launch block participant visibility"
  on public.conversation_participants;
create policy "Launch block participant visibility"
  on public.conversation_participants as restrictive for select to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_can_access_conversation(conversation_id)
  );

drop policy if exists "Launch block participant read updates"
  on public.conversation_participants;
create policy "Launch block participant read updates"
  on public.conversation_participants as restrictive for update to authenticated
  using (
    user_id = auth.uid()
    and public.current_user_can_access_conversation(conversation_id)
  )
  with check (
    user_id = auth.uid()
    and public.current_user_can_access_conversation(conversation_id)
  );

drop policy if exists "Launch block message visibility" on public.messages;
create policy "Launch block message visibility"
  on public.messages as restrictive for select to authenticated
  using (public.current_user_can_access_conversation(conversation_id));

drop policy if exists "Launch block safe messages" on public.messages;
create policy "Launch block safe messages"
  on public.messages as restrictive for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.current_user_can_send_to_conversation(conversation_id)
  );

-- The public_profiles view historically ran with its owner's privileges and
-- could bypass profiles RLS. PostgreSQL 17 supports security_invoker views, so
-- direct profile lookups now receive the same block filtering as table reads.
alter view public.public_profiles set (security_invoker = true);

-- Triggers cover SECURITY DEFINER write paths as well as direct table writes.
-- Existing rows and conversations are preserved; only new blocked interaction
-- attempts are rejected.
create or replace function public.enforce_conversation_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_a_id is null and new.user_b_id is null then
    raise exception 'Conversation is unavailable' using errcode = '23514';
  end if;

  -- ON DELETE SET NULL is the intentional tombstone transition. No browser
  -- role can update participant identity columns directly.
  if new.user_a_id is null or new.user_b_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.profiles profile_entry
    where profile_entry.id = new.user_a_id
  ) or not exists (
    select 1 from public.profiles profile_entry
    where profile_entry.id = new.user_b_id
  ) or exists (
    select 1
    from public.account_deletion_jobs deletion_job
    where deletion_job.user_id in (new.user_a_id, new.user_b_id)
  ) then
    raise exception 'Conversation is unavailable' using errcode = '42501';
  end if;

  if public.has_block_relationship(new.user_a_id, new.user_b_id) then
    raise exception 'Conversation is unavailable' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_conversation_block()
  from public, anon, authenticated;

drop trigger if exists on_conversation_check_block on public.conversations;
create trigger on_conversation_check_block
  before insert or update of user_a_id, user_b_id
  on public.conversations
  for each row execute function public.enforce_conversation_block();

-- Replace the historical SECURITY DEFINER conversation creator so a stale JWT
-- cannot create or resurrect a conversation with a profile whose deletion has
-- begun. The public argument contract remains unchanged.
create or replace function public.get_or_create_conversation(
  p_user_id uuid,
  p_other_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_conversation_id uuid;
  v_privacy public.messaging_privacy;
  v_is_following boolean;
  v_is_followed_by boolean;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_user_id is null or p_other_user_id is null then
    raise exception 'Both user IDs are required' using errcode = '22004';
  end if;

  if p_user_id = p_other_user_id then
    raise exception 'Cannot create a conversation with yourself'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles profile_entry
    where profile_entry.id = p_user_id
  ) or not exists (
    select 1 from public.profiles profile_entry
    where profile_entry.id = p_other_user_id
  ) or exists (
    select 1
    from public.account_deletion_jobs deletion_job
    where deletion_job.user_id in (p_user_id, p_other_user_id)
  ) or public.has_block_relationship(p_user_id, p_other_user_id) then
    raise exception 'Conversation is unavailable' using errcode = '42501';
  end if;

  select settings_entry.messaging_privacy
  into v_privacy
  from public.user_settings settings_entry
  where settings_entry.user_id = p_other_user_id;

  v_privacy := coalesce(v_privacy, 'everyone'::public.messaging_privacy);

  if v_privacy = 'nobody'::public.messaging_privacy then
    raise exception 'This user has disabled direct messages'
      using errcode = 'P0001';
  end if;

  if v_privacy = 'following'::public.messaging_privacy then
    select exists (
      select 1
      from public.user_follows follow_entry
      where follow_entry.follower_id = p_other_user_id
        and follow_entry.following_id = p_user_id
    ) into v_is_following;

    if not v_is_following then
      raise exception 'This user only accepts messages from people they follow'
        using errcode = 'P0001';
    end if;
  end if;

  if v_privacy = 'mutual'::public.messaging_privacy then
    select exists (
      select 1
      from public.user_follows follow_entry
      where follow_entry.follower_id = p_other_user_id
        and follow_entry.following_id = p_user_id
    ) into v_is_following;

    select exists (
      select 1
      from public.user_follows follow_entry
      where follow_entry.follower_id = p_user_id
        and follow_entry.following_id = p_other_user_id
    ) into v_is_followed_by;

    if not (v_is_following and v_is_followed_by) then
      raise exception 'This user only accepts messages from mutual followers'
        using errcode = 'P0001';
    end if;
  end if;

  v_user_a := least(p_user_id, p_other_user_id);
  v_user_b := greatest(p_user_id, p_other_user_id);

  insert into public.conversations (user_a_id, user_b_id)
  values (v_user_a, v_user_b)
  on conflict (user_a_id, user_b_id) do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select conversation_entry.id
    into v_conversation_id
    from public.conversations conversation_entry
    where conversation_entry.user_a_id = v_user_a
      and conversation_entry.user_b_id = v_user_b
    limit 1;
  end if;

  if v_conversation_id is null then
    raise exception 'Conversation is unavailable' using errcode = '40001';
  end if;

  insert into public.conversation_participants (
    conversation_id,
    user_id,
    last_read_at
  )
  values
    (v_conversation_id, p_user_id, pg_catalog.now()),
    (v_conversation_id, p_other_user_id, pg_catalog.now())
  on conflict (conversation_id, user_id) do nothing;

  return v_conversation_id;
end;
$$;

revoke all on function public.get_or_create_conversation(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_or_create_conversation(uuid, uuid)
  to authenticated;

create or replace function public.enforce_message_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_a_id uuid;
  v_user_b_id uuid;
  v_other_user_id uuid;
  v_media_path text;
begin
  select c.user_a_id, c.user_b_id
  into v_user_a_id, v_user_b_id
  from public.conversations c
  where c.id = new.conversation_id;

  v_other_user_id := case
    when v_user_a_id = new.sender_id then v_user_b_id
    when v_user_b_id = new.sender_id then v_user_a_id
    else null
  end;

  if v_other_user_id is null then
    raise exception 'Message not sent' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles profile_entry
    where profile_entry.id = v_other_user_id
  ) or exists (
    select 1
    from public.account_deletion_jobs deletion_job
    where deletion_job.user_id in (new.sender_id, v_other_user_id)
  ) then
    raise exception 'Message not sent' using errcode = '42501';
  end if;

  if public.has_block_relationship(new.sender_id, v_other_user_id) then
    raise exception 'Message not sent' using errcode = '42501';
  end if;

  -- A message may reference only an object inside the sender's own folder.
  -- Accept the storage path used by the new client and the historical public
-- URL shape, but normalize both before checking ownership.
  if new.media_url is not null then
    v_media_path := case
      when position('/message-media/' in new.media_url) > 0
        then split_part(new.media_url, '/message-media/', 2)
      else new.media_url
    end;
    v_media_path := split_part(v_media_path, '?', 1);

    if (storage.foldername(v_media_path))[1]
       is distinct from new.sender_id::text then
      raise exception 'Message attachment is unavailable' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_message_block()
  from public, anon, authenticated;

drop trigger if exists on_message_check_block on public.messages;
create trigger on_message_check_block
  before insert on public.messages
  for each row execute function public.enforce_message_block();

create or replace function public.enforce_comment_block()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and (
    new.user_id is distinct from auth.uid()
    or not public.current_user_can_access_post(new.post_id)
    or (
      new.parent_comment_id is not null
      and not public.current_user_can_access_comment(new.parent_comment_id)
    )
  ) then
    raise exception 'Comment not allowed' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_comment_block()
  from public, anon, authenticated;

drop trigger if exists on_comment_check_block on public.post_comments;
create trigger on_comment_check_block
  before insert or update on public.post_comments
  for each row execute function public.enforce_comment_block();

-- ---------------------------------------------------------------------------
-- Messaging: only the trusted conversation RPC creates participant rows, and
-- browser clients may update last_read_at only. Restricting INSERT alone is not
-- sufficient because a full-row UPDATE could move a user's participant record
-- to a different conversation while still satisfying user_id = auth.uid().
-- Message attachments become private and are readable only by a remaining
-- participant named on the conversation containing the matching object path.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can insert own conversation participants"
  on public.conversation_participants;

revoke all on table public.conversation_participants
  from public, anon, authenticated;

grant select on table public.conversation_participants to authenticated;
grant update (last_read_at)
  on table public.conversation_participants to authenticated;

update storage.buckets
set public = false
where id = 'message-media';

-- Storage evaluates write policies as the authenticated user, who must not be
-- able to read the private deletion queue. This no-argument SECURITY DEFINER
-- predicate exposes only whether the caller's own durable deletion row exists.
-- Any row blocks writes (including `failed` and `completed`) because there is
-- no product-level cancellation flow and an access JWT can outlive Auth delete.
create schema if not exists reflab_private;
revoke all on schema reflab_private from public, anon, authenticated;
grant usage on schema reflab_private to authenticated;

create or replace function reflab_private.current_user_has_deletion_job()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.account_deletion_jobs deletion_job
      where deletion_job.user_id = auth.uid()
    )
$$;

revoke all on function reflab_private.current_user_has_deletion_job()
  from public, anon, authenticated;
grant execute on function reflab_private.current_user_has_deletion_job()
  to authenticated;

-- Return the UUID encoded by the first path segment only for the three user
-- media buckets. `owner_id` is text and can legitimately be NULL for legacy or
-- service-created objects; when present it must agree with the path. Invalid,
-- missing, or mismatched ownership fails closed instead of raising from RLS.
create or replace function reflab_private.user_media_object_owner_id(
  p_bucket_id text,
  p_name text,
  p_owner_id text
)
returns uuid
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_path_owner uuid;
  v_storage_owner uuid;
begin
  if p_bucket_id is null
     or p_bucket_id not in ('profile-media', 'post-media', 'message-media')
     or p_name is null then
    return null;
  end if;

  begin
    v_path_owner := (storage.foldername(p_name))[1]::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;

  if v_path_owner is null then
    return null;
  end if;

  if p_owner_id is not null then
    begin
      v_storage_owner := p_owner_id::uuid;
    exception
      when invalid_text_representation then
        return null;
    end;

    if v_storage_owner is distinct from v_path_owner then
      return null;
    end if;
  end if;

  return v_path_owner;
end;
$$;

revoke all on function reflab_private.user_media_object_owner_id(
  text, text, text
) from public, anon, authenticated;
grant execute on function reflab_private.user_media_object_owner_id(
  text, text, text
) to authenticated;

drop policy if exists "Deletion jobs block user media inserts"
  on storage.objects;
create policy "Deletion jobs block user media inserts"
on storage.objects
as restrictive
for insert
to authenticated
with check (
  storage.objects.bucket_id not in (
    'profile-media',
    'post-media',
    'message-media'
  )
  or (
    reflab_private.user_media_object_owner_id(
      storage.objects.bucket_id,
      storage.objects.name,
      storage.objects.owner_id::text
    ) = auth.uid()
    and not reflab_private.current_user_has_deletion_job()
  )
);

drop policy if exists "Deletion jobs block user media updates"
  on storage.objects;
create policy "Deletion jobs block user media updates"
on storage.objects
as restrictive
for update
to authenticated
using (
  storage.objects.bucket_id not in (
    'profile-media',
    'post-media',
    'message-media'
  )
  or (
    reflab_private.user_media_object_owner_id(
      storage.objects.bucket_id,
      storage.objects.name,
      storage.objects.owner_id::text
    ) = auth.uid()
    and not reflab_private.current_user_has_deletion_job()
  )
)
with check (
  storage.objects.bucket_id not in (
    'profile-media',
    'post-media',
    'message-media'
  )
  or (
    reflab_private.user_media_object_owner_id(
      storage.objects.bucket_id,
      storage.objects.name,
      storage.objects.owner_id::text
    ) = auth.uid()
    and not reflab_private.current_user_has_deletion_job()
  )
);

create index if not exists messages_media_url_idx
  on public.messages(media_url)
  where media_url is not null;

drop policy if exists "Anyone can read message media" on storage.objects;
drop policy if exists "Conversation participants can read message media"
  on storage.objects;

create policy "Conversation participants can read message media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'message-media'
  and exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.sender_id::text = (storage.foldername(storage.objects.name))[1]
      and (
        m.media_url = storage.objects.name
        or split_part(
          split_part(m.media_url, '/message-media/', 2),
          '?',
          1
        ) = storage.objects.name
      )
      and auth.uid() in (c.user_a_id, c.user_b_id)
      and public.current_user_can_access_conversation(m.conversation_id)
  )
);

-- ---------------------------------------------------------------------------
-- Privileged helpers are trigger/cron internals, not public RPC endpoints.
-- ---------------------------------------------------------------------------

-- Production contains a drift-only historical overload that is absent from a
-- clean canonical rebuild. Close it when present without making clean resets
-- depend on that drift.
do $optional_notification_drift_revoke$
begin
  if to_regprocedure(
    'public.create_notification(uuid,text,uuid,uuid,text,text)'
  ) is not null then
    execute 'revoke all on function public.create_notification('
      || 'uuid,text,uuid,uuid,text,text) from public, anon, authenticated';
  end if;
end;
$optional_notification_drift_revoke$;

revoke all on function public.create_notification(
  uuid, uuid, text, text, text
) from public, anon, authenticated;

revoke all on function public.create_notification(
  uuid, uuid, text, text, text, uuid
) from public, anon, authenticated;

revoke all on function public.check_plan_expiration_reminders()
  from public, anon, authenticated;

revoke all on function public.get_user_plan(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Secure legacy social RPCs without changing the browser contract. The old
-- implementations remain private implementation details; the replacement
-- functions validate the JWT identity before delegating.
-- ---------------------------------------------------------------------------

create or replace function public.block_safe_json_actor(
  p_payload jsonb,
  p_viewer_id uuid,
  p_actor_path text[] default array['author', 'id']::text[]
)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_actor_text text;
  v_actor_id uuid;
begin
  v_actor_text := nullif(p_payload #>> p_actor_path, '');
  if v_actor_text is null then
    return false;
  end if;

  begin
    v_actor_id := v_actor_text::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return not public.has_block_relationship(p_viewer_id, v_actor_id);
end;
$$;

revoke all on function public.block_safe_json_actor(jsonb, uuid, text[])
  from public, anon, authenticated;

create or replace function public.block_safe_social_item(
  p_payload jsonb,
  p_viewer_id uuid
)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if not public.block_safe_json_actor(
    p_payload,
    p_viewer_id,
    array['author', 'id']::text[]
  ) then
    return false;
  end if;

  if p_payload -> 'original_post' is not null
     and jsonb_typeof(p_payload -> 'original_post') <> 'null'
     and not public.block_safe_json_actor(
       p_payload,
       p_viewer_id,
       array['original_post', 'author', 'id']::text[]
     ) then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.block_safe_social_item(jsonb, uuid)
  from public, anon, authenticated;

create or replace function public.filter_blocked_social_feed(
  p_payload json,
  p_viewer_id uuid
)
returns json
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(item order by item_ordinal), '[]'::jsonb)::json
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(p_payload::jsonb, '[]'::jsonb)) = 'array'
        then coalesce(p_payload::jsonb, '[]'::jsonb)
      else '[]'::jsonb
    end
  ) with ordinality as feed_items(item, item_ordinal)
  where public.block_safe_social_item(item, p_viewer_id);
$$;

revoke all on function public.filter_blocked_social_feed(json, uuid)
  from public, anon, authenticated;

create or replace function public.take_json_array(
  p_payload json,
  p_limit integer
)
returns json
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(item order by item_ordinal),
    '[]'::jsonb
  )::json
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(p_payload::jsonb, '[]'::jsonb)) = 'array'
        then coalesce(p_payload::jsonb, '[]'::jsonb)
      else '[]'::jsonb
    end
  ) with ordinality as payload_items(item, item_ordinal)
  where item_ordinal <= greatest(0, coalesce(p_limit, 0));
$$;

revoke all on function public.take_json_array(json, integer)
  from public, anon, authenticated;

create or replace function public.filter_blocked_comments(
  p_payload json,
  p_viewer_id uuid
)
returns json
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_set(
        item,
        '{replies}',
        coalesce(
          (
            select jsonb_agg(reply order by reply_ordinal)
            from jsonb_array_elements(
              case
                when jsonb_typeof(item -> 'replies') = 'array'
                  then item -> 'replies'
                else '[]'::jsonb
              end
            ) with ordinality as reply_items(reply, reply_ordinal)
            where public.block_safe_json_actor(reply, p_viewer_id)
          ),
          '[]'::jsonb
        ),
        true
      )
      order by item_ordinal
    ),
    '[]'::jsonb
  )::json
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(p_payload::jsonb, '[]'::jsonb)) = 'array'
        then coalesce(p_payload::jsonb, '[]'::jsonb)
      else '[]'::jsonb
    end
  ) with ordinality as comment_items(item, item_ordinal)
  where public.block_safe_json_actor(item, p_viewer_id);
$$;

revoke all on function public.filter_blocked_comments(json, uuid)
  from public, anon, authenticated;

alter function public.get_social_feed(uuid, text, timestamptz, integer)
  rename to get_social_feed_unchecked_20260722;

revoke all on function public.get_social_feed_unchecked_20260722(
  uuid, text, timestamptz, integer
) from public, anon, authenticated;

create function public.get_social_feed(
  p_user_id uuid,
  p_media_type text default null,
  p_cursor timestamptz default null,
  p_limit integer default 20
)
returns json
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_payload json;
  v_filtered json;
  v_results jsonb := '[]'::jsonb;
  v_limit integer;
  v_fetch_cursor timestamptz := p_cursor;
  v_raw jsonb;
  v_raw_count integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 20), 50));

  -- Filtering after one legacy page can produce 19 rows and make the client
  -- conclude that pagination ended. Scan a bounded number of raw pages so a
  -- blocked original author cannot hide otherwise valid later content.
  for v_scan_page in 1..5 loop
    v_payload := public.get_social_feed_unchecked_20260722(
      p_user_id,
      p_media_type,
      v_fetch_cursor,
      50
    );

    v_raw := case
      when jsonb_typeof(coalesce(v_payload::jsonb, '[]'::jsonb)) = 'array'
        then coalesce(v_payload::jsonb, '[]'::jsonb)
      else '[]'::jsonb
    end;
    v_raw_count := jsonb_array_length(v_raw);
    exit when v_raw_count = 0;

    v_filtered := public.filter_blocked_social_feed(v_payload, p_user_id);
    v_results := v_results || coalesce(v_filtered::jsonb, '[]'::jsonb);
    exit when jsonb_array_length(v_results) >= v_limit;
    exit when v_raw_count < 50;

    v_fetch_cursor := nullif(
      v_raw -> (v_raw_count - 1) ->> 'created_at',
      ''
    )::timestamptz;
    exit when v_fetch_cursor is null;
  end loop;

  return public.take_json_array(v_results::json, v_limit);
end;
$$;

revoke all on function public.get_social_feed(
  uuid, text, timestamptz, integer
) from public, anon;
grant execute on function public.get_social_feed(
  uuid, text, timestamptz, integer
) to authenticated;

alter function public.get_post_comments(uuid, uuid)
  rename to get_post_comments_unchecked_20260722;

revoke all on function public.get_post_comments_unchecked_20260722(uuid, uuid)
  from public, anon, authenticated;

create function public.get_post_comments(
  p_post_id uuid,
  p_user_id uuid
)
returns json
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_payload json;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.current_user_can_access_post(p_post_id) then
    return '[]'::json;
  end if;

  v_payload := public.get_post_comments_unchecked_20260722(
    p_post_id,
    p_user_id
  );

  return public.filter_blocked_comments(v_payload, p_user_id);
end;
$$;

revoke all on function public.get_post_comments(uuid, uuid)
  from public, anon;
grant execute on function public.get_post_comments(uuid, uuid)
  to authenticated;

alter function public.get_post_by_id(uuid, uuid)
  rename to get_post_by_id_unchecked_20260722;

revoke all on function public.get_post_by_id_unchecked_20260722(uuid, uuid)
  from public, anon, authenticated;

create function public.get_post_by_id(
  p_user_id uuid,
  p_post_id uuid
)
returns json
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_payload json;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.current_user_can_access_post(p_post_id) then
    return null;
  end if;

  v_payload := public.get_post_by_id_unchecked_20260722(
    p_user_id,
    p_post_id
  );

  if v_payload is null
     or not public.block_safe_social_item(v_payload::jsonb, p_user_id) then
    return null;
  end if;

  return v_payload;
end;
$$;

revoke all on function public.get_post_by_id(uuid, uuid)
  from public, anon;
grant execute on function public.get_post_by_id(uuid, uuid)
  to authenticated;

-- A separate one-argument overload is a stale production remnant. It references
-- posts.is_edited, which does not exist, and is not used by the current client.
do $optional_post_detail_drift_revoke$
begin
  if to_regprocedure('public.get_post_by_id(uuid)') is not null then
    execute 'revoke all on function public.get_post_by_id(uuid) '
      || 'from public, anon, authenticated';
  end if;
end;
$optional_post_detail_drift_revoke$;

-- Profile, search and messaging reads also use SECURITY DEFINER RPCs and must
-- therefore apply block rules explicitly rather than relying on table RLS.
alter function public.get_public_profile_view(uuid, text)
  rename to get_public_profile_view_unchecked_20260722;

revoke all on function public.get_public_profile_view_unchecked_20260722(
  uuid, text
) from public, anon, authenticated;

create function public.get_public_profile_view(
  p_viewer_id uuid,
  p_username text
)
returns table (
  id uuid,
  username text,
  name text,
  photo_url text,
  is_following boolean,
  is_blocked_by_viewer boolean,
  has_blocked_viewer boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or auth.uid() <> p_viewer_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    candidate.id,
    candidate.username,
    candidate.name,
    candidate.photo_url,
    candidate.is_following,
    candidate.is_blocked_by_viewer,
    candidate.has_blocked_viewer
  from public.get_public_profile_view_unchecked_20260722(
    p_viewer_id,
    p_username
  ) candidate
  where not exists (
    select 1
    from public.user_blocks ub
    where ub.blocker_id = candidate.id
      and ub.blocked_id = p_viewer_id
  );
end;
$$;

revoke all on function public.get_public_profile_view(uuid, text)
  from public, anon;
grant execute on function public.get_public_profile_view(uuid, text)
  to authenticated;

alter function public.get_public_profile_feed(
  uuid, uuid, timestamptz, integer
) rename to get_public_profile_feed_unchecked_20260722;

revoke all on function public.get_public_profile_feed_unchecked_20260722(
  uuid, uuid, timestamptz, integer
) from public, anon, authenticated;

create function public.get_public_profile_feed(
  p_viewer_id uuid,
  p_target_user_id uuid,
  p_cursor timestamptz default null,
  p_limit integer default 20
)
returns json
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_payload json;
  v_filtered json;
  v_results jsonb := '[]'::jsonb;
  v_limit integer;
  v_fetch_cursor timestamptz := p_cursor;
  v_raw jsonb;
  v_raw_count integer;
begin
  if auth.uid() is null or auth.uid() <> p_viewer_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if public.has_block_relationship(p_viewer_id, p_target_user_id) then
    return '[]'::json;
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 20), 50));

  for v_scan_page in 1..5 loop
    v_payload := public.get_public_profile_feed_unchecked_20260722(
      p_viewer_id,
      p_target_user_id,
      v_fetch_cursor,
      50
    );

    v_raw := case
      when jsonb_typeof(coalesce(v_payload::jsonb, '[]'::jsonb)) = 'array'
        then coalesce(v_payload::jsonb, '[]'::jsonb)
      else '[]'::jsonb
    end;
    v_raw_count := jsonb_array_length(v_raw);
    exit when v_raw_count = 0;

    v_filtered := public.filter_blocked_social_feed(v_payload, p_viewer_id);
    v_results := v_results || coalesce(v_filtered::jsonb, '[]'::jsonb);
    exit when jsonb_array_length(v_results) >= v_limit;
    exit when v_raw_count < 50;

    v_fetch_cursor := nullif(
      v_raw -> (v_raw_count - 1) ->> 'created_at',
      ''
    )::timestamptz;
    exit when v_fetch_cursor is null;
  end loop;

  return public.take_json_array(v_results::json, v_limit);
end;
$$;

revoke all on function public.get_public_profile_feed(
  uuid, uuid, timestamptz, integer
) from public, anon;
grant execute on function public.get_public_profile_feed(
  uuid, uuid, timestamptz, integer
) to authenticated;

alter function public.get_profile_feed(
  uuid, uuid, text, timestamptz, integer
) rename to get_profile_feed_unchecked_20260722;

revoke all on function public.get_profile_feed_unchecked_20260722(
  uuid, uuid, text, timestamptz, integer
) from public, anon, authenticated;

create function public.get_profile_feed(
  p_viewer_id uuid,
  p_profile_user_id uuid,
  p_media_type text default null,
  p_cursor timestamptz default null,
  p_limit integer default 20
)
returns json
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_payload json;
  v_filtered json;
  v_results jsonb := '[]'::jsonb;
  v_limit integer;
  v_fetch_cursor timestamptz := p_cursor;
  v_raw jsonb;
  v_raw_count integer;
begin
  if auth.uid() is null or auth.uid() <> p_viewer_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if public.has_block_relationship(p_viewer_id, p_profile_user_id) then
    return '[]'::json;
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 20), 50));

  for v_scan_page in 1..5 loop
    v_payload := public.get_profile_feed_unchecked_20260722(
      p_viewer_id,
      p_profile_user_id,
      p_media_type,
      v_fetch_cursor,
      50
    );

    v_raw := case
      when jsonb_typeof(coalesce(v_payload::jsonb, '[]'::jsonb)) = 'array'
        then coalesce(v_payload::jsonb, '[]'::jsonb)
      else '[]'::jsonb
    end;
    v_raw_count := jsonb_array_length(v_raw);
    exit when v_raw_count = 0;

    v_filtered := public.filter_blocked_social_feed(v_payload, p_viewer_id);
    v_results := v_results || coalesce(v_filtered::jsonb, '[]'::jsonb);
    exit when jsonb_array_length(v_results) >= v_limit;
    exit when v_raw_count < 50;

    v_fetch_cursor := nullif(
      v_raw -> (v_raw_count - 1) ->> 'created_at',
      ''
    )::timestamptz;
    exit when v_fetch_cursor is null;
  end loop;

  return public.take_json_array(v_results::json, v_limit);
end;
$$;

revoke all on function public.get_profile_feed(
  uuid, uuid, text, timestamptz, integer
) from public, anon;
grant execute on function public.get_profile_feed(
  uuid, uuid, text, timestamptz, integer
) to authenticated;

alter function public.search_users(text)
  rename to search_users_unchecked_20260722;

revoke all on function public.search_users_unchecked_20260722(text)
  from public, anon, authenticated;

create function public.search_users(search_term text)
returns table (
  id uuid,
  username text,
  name text,
  photo_url text,
  is_following boolean
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_viewer_id uuid := auth.uid();
begin
  if v_viewer_id is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    candidate.id,
    candidate.username,
    candidate.name,
    candidate.photo_url,
    candidate.is_following
  from public.search_users_unchecked_20260722(search_term) candidate
  where not public.has_block_relationship(v_viewer_id, candidate.id);
end;
$$;

revoke all on function public.search_users(text)
  from public, anon;
grant execute on function public.search_users(text)
  to authenticated;

alter function public.get_conversations(uuid)
  rename to get_conversations_unchecked_20260722;

revoke all on function public.get_conversations_unchecked_20260722(uuid)
  from public, anon, authenticated;

create function public.get_conversations(p_user_id uuid)
returns table (
  id uuid,
  updated_at timestamptz,
  other_user jsonb,
  last_message jsonb,
  unread_count integer
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    conversation_entry.id,
    conversation_entry.updated_at,
    case
      when other_profile.id is null then pg_catalog.jsonb_build_object(
        'id', null::uuid,
        'username', null::text,
        'name', null::text,
        'photo_url', null::text,
        'is_deleted', true
      )
      else pg_catalog.jsonb_build_object(
        'id', other_profile.id,
        'username', other_profile.username,
        'name', other_profile.name,
        'photo_url', other_profile.photo_url,
        'is_deleted', false
      )
    end as other_user,
    case
      when latest_message.id is null then null
      else pg_catalog.jsonb_build_object(
        'id', latest_message.id,
        'conversation_id', latest_message.conversation_id,
        'sender_id', latest_message.sender_id,
        'content', latest_message.content,
        'media_type', latest_message.media_type,
        'media_url', latest_message.media_url,
        'created_at', latest_message.created_at
      )
    end as last_message,
    coalesce(unread_messages.unread_count, 0)::integer as unread_count
  from public.conversation_participants participant_entry
  join public.conversations conversation_entry
    on conversation_entry.id = participant_entry.conversation_id
  left join public.profiles other_profile
    on other_profile.id = case
      when conversation_entry.user_a_id = p_user_id
        then conversation_entry.user_b_id
      when conversation_entry.user_b_id = p_user_id
        then conversation_entry.user_a_id
      else null
    end
  left join lateral (
    select
      message_entry.id,
      message_entry.conversation_id,
      message_entry.sender_id,
      message_entry.content,
      message_entry.media_type,
      message_entry.media_url,
      message_entry.created_at
    from public.messages message_entry
    where message_entry.conversation_id = conversation_entry.id
    order by message_entry.created_at desc
    limit 1
  ) latest_message on true
  left join lateral (
    select count(*)::integer as unread_count
    from public.messages unread_message
    where unread_message.conversation_id = conversation_entry.id
      and unread_message.sender_id <> p_user_id
      and unread_message.created_at > coalesce(
        participant_entry.last_read_at,
        'epoch'::timestamptz
      )
  ) unread_messages on true
  where participant_entry.user_id = p_user_id
    and public.current_user_can_access_conversation(conversation_entry.id)
  order by coalesce(
    latest_message.created_at,
    conversation_entry.updated_at
  ) desc;
end;
$$;

revoke all on function public.get_conversations(uuid)
  from public, anon;
grant execute on function public.get_conversations(uuid)
  to authenticated;

alter function public.get_messages(uuid, uuid, timestamptz, integer)
  rename to get_messages_unchecked_20260722;

revoke all on function public.get_messages_unchecked_20260722(
  uuid, uuid, timestamptz, integer
) from public, anon, authenticated;

create function public.get_messages(
  p_conversation_id uuid,
  p_user_id uuid,
  p_cursor timestamptz default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  media_type public.message_media_type,
  media_url text,
  created_at timestamptz,
  sender jsonb
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.current_user_can_access_conversation(p_conversation_id) then
    raise exception 'Conversation not found or not accessible'
      using errcode = '42501';
  end if;

  return query
  select
    candidate.id,
    candidate.conversation_id,
    candidate.sender_id,
    candidate.content,
    candidate.media_type,
    candidate.media_url,
    candidate.created_at,
    candidate.sender
  from public.get_messages_unchecked_20260722(
    p_conversation_id,
    p_user_id,
    p_cursor,
    p_limit
  ) candidate;
end;
$$;

revoke all on function public.get_messages(
  uuid, uuid, timestamptz, integer
) from public, anon;
grant execute on function public.get_messages(
  uuid, uuid, timestamptz, integer
) to authenticated;

create or replace function public.get_total_unread_count(p_user_id uuid)
returns integer
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_total integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select coalesce(count(m.id), 0)::integer
  into v_total
  from public.conversation_participants cp
  join public.conversations c on c.id = cp.conversation_id
  join public.messages m on m.conversation_id = cp.conversation_id
  where cp.user_id = p_user_id
    and m.sender_id <> p_user_id
    and m.created_at > coalesce(cp.last_read_at, 'epoch'::timestamptz)
    and public.current_user_can_access_conversation(c.id);

  return coalesce(v_total, 0);
end;
$$;

revoke all on function public.get_total_unread_count(uuid)
  from public, anon;
grant execute on function public.get_total_unread_count(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Learning: a topic breakdown may only be read by the attempt owner.
-- ---------------------------------------------------------------------------

alter function public.get_attempt_topic_breakdown(uuid)
  rename to get_attempt_topic_breakdown_unchecked_20260722;

revoke all on function public.get_attempt_topic_breakdown_unchecked_20260722(uuid)
  from public, anon, authenticated;

create function public.get_attempt_topic_breakdown(p_attempt_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.test_attempts ta
    where ta.id = p_attempt_id
      and ta.user_id = auth.uid()
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return public.get_attempt_topic_breakdown_unchecked_20260722(p_attempt_id);
end;
$$;

revoke all on function public.get_attempt_topic_breakdown(uuid)
  from public, anon;
grant execute on function public.get_attempt_topic_breakdown(uuid)
  to authenticated;

revoke all on function public.get_random_questions()
  from public, anon;
grant execute on function public.get_random_questions()
  to authenticated;

-- Explicitly close the remaining authenticated-only RPC surface to anon.
revoke all on function public.get_public_profile_view(uuid, text)
  from public, anon;
grant execute on function public.get_public_profile_view(uuid, text)
  to authenticated;

revoke all on function public.get_public_profile_feed(
  uuid, uuid, timestamptz, integer
) from public, anon;
grant execute on function public.get_public_profile_feed(
  uuid, uuid, timestamptz, integer
) to authenticated;

revoke all on function public.get_profile_feed(
  uuid, uuid, text, timestamptz, integer
) from public, anon;
grant execute on function public.get_profile_feed(
  uuid, uuid, text, timestamptz, integer
) to authenticated;

-- The one-argument overload remains an authenticated contract for the global
-- search module; Messages uses the separate three-argument overload below.
revoke all on function public.search_users(text)
  from public, anon;
grant execute on function public.search_users(text)
  to authenticated;

revoke all on function public.search_users(text, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.search_users(text, uuid, integer)
  to authenticated;

-- New writes are bounded even before application-level validation runs.
alter table public.posts
  add constraint posts_content_launch_length
  check (content is null or char_length(content) <= 5000) not valid;

alter table public.post_comments
  add constraint post_comments_content_launch_length
  check (char_length(content) <= 2000) not valid;

alter table public.messages
  add constraint messages_content_launch_length
  check (content is null or char_length(content) <= 5000) not valid;

commit;
