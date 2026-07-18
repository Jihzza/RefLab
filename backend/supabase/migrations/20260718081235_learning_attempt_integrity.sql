-- Transactional learning-attempt lifecycle.
--
-- Goals:
--   * at most one in-progress attempt per user and concrete test;
--   * at most one in-progress random attempt per user;
--   * immutable, ordered question sets so refresh/resume is deterministic;
--   * auth.uid()-bound RPCs for start/resume, answer saving, and submission;
--   * non-destructive reconciliation of historical duplicate attempts.
--
-- STAGED PHASE 1 (additive; never batch with phase 2):
--   1. Apply this migration while the old frontend is still live.
--   2. Deploy and smoke-test the exact frontend that calls these RPCs.
--   3. Only then apply 20260718081236_learning_attempt_rpc_cutover.sql.
-- DO NOT use `supabase db push` while both phases are pending: it applies all
-- pending migrations. Follow backend/supabase/LEARNING_ATTEMPT_CUTOVER.md.
-- Existing browser DML grants/policies intentionally remain available until
-- phase 2 so an already-open old bundle is not broken during deployment.

-- ---------------------------------------------------------------------------
-- Attempt state and non-destructive duplicate reconciliation.
-- ---------------------------------------------------------------------------

alter table public.test_attempts
  add column if not exists superseded_by uuid null,
  add column if not exists question_set_locked_at timestamptz null;

-- Random attempts have always used a 40-minute product contract. Normalize
-- every open row and clamp a future client-supplied start before any RPC uses
-- it. Submitted history is left untouched.
update public.test_attempts
set
  time_limit_seconds = 2400,
  started_at = least(started_at, statement_timestamp())
where test_id is null
  and status = 'in_progress'
  and (
    time_limit_seconds is distinct from 2400
    or started_at > statement_timestamp()
  );

-- Keep the compatibility window safe without removing any old-bundle write.
-- Legitimate old clients already use this fixed limit and current timestamps;
-- the guard only corrects hostile or corrupt random-attempt timer values.
create or replace function public.enforce_random_test_attempt_contract()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.test_id is null and new.status = 'in_progress' then
    new.time_limit_seconds := 2400;
    new.started_at := least(new.started_at, statement_timestamp());
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_random_test_attempt_contract
  on public.test_attempts;
create trigger enforce_random_test_attempt_contract
  before insert or update of test_id, status, time_limit_seconds, started_at
  on public.test_attempts
  for each row
  execute function public.enforce_random_test_attempt_contract();

alter table public.test_attempts
  drop constraint if exists test_attempts_open_random_time_limit_check;
alter table public.test_attempts
  add constraint test_attempts_open_random_time_limit_check
  check (
    test_id is not null
    or status <> 'in_progress'
    or time_limit_seconds is not distinct from 2400
  );

revoke all privileges
  on function public.enforce_random_test_attempt_contract()
  from public, anon, authenticated;

do $constraints$
declare
  existing_constraint record;
begin
  for existing_constraint in
    select c.conname
      from pg_catalog.pg_constraint as c
     where c.conrelid = 'public.test_attempts'::regclass
       and c.contype = 'c'
       and (
         c.conname = 'test_attempts_status_check'
         or (
           pg_catalog.pg_get_constraintdef(c.oid) ilike '%status%'
           and pg_catalog.pg_get_constraintdef(c.oid) ilike '%in_progress%'
           and pg_catalog.pg_get_constraintdef(c.oid) ilike '%submitted%'
         )
       )
  loop
    execute format(
      'alter table public.test_attempts drop constraint %I',
      existing_constraint.conname
    );
  end loop;
end;
$constraints$;

alter table public.test_attempts
  add constraint test_attempts_status_check
  check (status in ('in_progress', 'submitted', 'superseded'));

do $superseded_fk$
begin
  if not exists (
    select 1
      from pg_catalog.pg_constraint as c
     where c.conrelid = 'public.test_attempts'::regclass
       and c.conname = 'test_attempts_superseded_by_fkey'
  ) then
    alter table public.test_attempts
      add constraint test_attempts_superseded_by_fkey
      foreign key (superseded_by)
      references public.test_attempts(id)
      on delete set null;
  end if;
end;
$superseded_fk$;

alter table public.test_attempts
  drop constraint if exists test_attempts_not_self_superseded;
alter table public.test_attempts
  add constraint test_attempts_not_self_superseded
  check (superseded_by is null or superseded_by <> id);

-- Pick the attempt containing the most answers as the survivor. Ties prefer
-- the earliest start time and then the UUID, which makes the migration fully
-- deterministic. Original duplicate rows and all their answers remain stored.
create temporary table learning_attempt_deduplication
on commit drop
as
with candidates as (
  select
    ta.id,
    ta.user_id,
    ta.test_id,
    ta.started_at,
    (
      select count(*)
        from public.test_attempt_answers as taa
       where taa.attempt_id = ta.id
    ) as answer_count
  from public.test_attempts as ta
  where ta.status = 'in_progress'
),
ranked as (
  select
    candidates.id as duplicate_id,
    first_value(candidates.id) over (
      partition by candidates.user_id, candidates.test_id
      order by
        candidates.answer_count desc,
        candidates.started_at asc,
        candidates.id asc
    ) as survivor_id,
    row_number() over (
      partition by candidates.user_id, candidates.test_id
      order by
        candidates.answer_count desc,
        candidates.started_at asc,
        candidates.id asc
    ) as attempt_rank
  from candidates
)
select duplicate_id, survivor_id
from ranked
where attempt_rank > 1;

-- Concrete duplicates share one canonical test, so copy every non-conflicting
-- answer into their survivor. Random duplicates may represent different
-- generated tests and must never be merged into a >20-question hybrid; their
-- complete answers remain untouched on the superseded source rows.
with copy_candidates as (
  select distinct on (dedupe.survivor_id, answer.question_id)
    dedupe.survivor_id,
    answer.question_id,
    answer.selected_option,
    answer.is_correct,
    answer.confirmed_at,
    answer.ai_explanation,
    answer.ai_explanation_created_at
  from learning_attempt_deduplication as dedupe
  join public.test_attempt_answers as answer
    on answer.attempt_id = dedupe.duplicate_id
  where exists (
    select 1
    from public.test_attempts as survivor
    where survivor.id = dedupe.survivor_id
      and survivor.test_id is not null
  )
  and not exists (
    select 1
    from public.test_attempt_answers as survivor_answer
    where survivor_answer.attempt_id = dedupe.survivor_id
      and survivor_answer.question_id = answer.question_id
  )
  order by
    dedupe.survivor_id,
    answer.question_id,
    answer.confirmed_at,
    answer.id
)
insert into public.test_attempt_answers (
  id,
  attempt_id,
  question_id,
  selected_option,
  is_correct,
  confirmed_at,
  ai_explanation,
  ai_explanation_created_at
)
select
  gen_random_uuid(),
  candidate.survivor_id,
  candidate.question_id,
  candidate.selected_option,
  candidate.is_correct,
  candidate.confirmed_at,
  candidate.ai_explanation,
  candidate.ai_explanation_created_at
from copy_candidates as candidate
on conflict (attempt_id, question_id) do nothing;

update public.test_attempts as duplicate
set
  status = 'superseded',
  superseded_by = dedupe.survivor_id,
  updated_at = statement_timestamp()
from learning_attempt_deduplication as dedupe
where duplicate.id = dedupe.duplicate_id;

create index if not exists test_attempts_superseded_by_idx
  on public.test_attempts(superseded_by)
  where superseded_by is not null;

-- ---------------------------------------------------------------------------
-- Persist the exact ordered question set for every attempt.
-- ---------------------------------------------------------------------------

create table if not exists public.test_attempt_questions (
  attempt_id uuid not null
    references public.test_attempts(id) on delete cascade,
  question_id uuid not null
    references public.question_bank(id) on delete restrict,
  order_index integer not null check (order_index >= 1),
  primary key (attempt_id, order_index),
  unique (attempt_id, question_id)
);

create index if not exists test_attempt_questions_question_idx
  on public.test_attempt_questions(question_id);

-- Concrete tests have a canonical bridge. Snapshot it for every historical
-- attempt so future catalogue edits cannot reorder an in-flight attempt.
insert into public.test_attempt_questions (
  attempt_id,
  question_id,
  order_index
)
select
  attempt.id,
  item.question_id,
  row_number() over (
    partition by attempt.id
    order by item.order_index, item.question_id
  )::integer
from public.test_attempts as attempt
join public.test_question_items as item
  on item.test_id = attempt.test_id
where attempt.test_id is not null
on conflict do nothing;

-- Append answered questions that are no longer present in the current bridge,
-- and seed legacy random attempts from their known answers. Nothing is deleted
-- or rewritten; the original answer rows remain authoritative.
with missing_answers as (
  select
    answer.attempt_id,
    answer.question_id,
    attempt.test_id,
    row_number() over (
      partition by answer.attempt_id
      order by answer.confirmed_at, answer.id
    )::integer as missing_order
  from public.test_attempt_answers as answer
  join public.test_attempts as attempt
    on attempt.id = answer.attempt_id
  where not exists (
    select 1
      from public.test_attempt_questions as mapped
     where mapped.attempt_id = answer.attempt_id
       and mapped.question_id = answer.question_id
  )
),
current_orders as (
  select
    attempt.id as attempt_id,
    coalesce(max(mapped.order_index), 0) as max_order
  from public.test_attempts as attempt
  left join public.test_attempt_questions as mapped
    on mapped.attempt_id = attempt.id
  group by attempt.id
)
insert into public.test_attempt_questions (
  attempt_id,
  question_id,
  order_index
)
select
  missing.attempt_id,
  missing.question_id,
  current_orders.max_order + missing.missing_order
from missing_answers as missing
join current_orders
  on current_orders.attempt_id = missing.attempt_id
where missing.test_id is not null
   or current_orders.max_order + missing.missing_order <= 20
on conflict do nothing;

-- Historical random attempts never stored their unseen questions. They cannot
-- be reconstructed exactly. Preserve every answered question, then complete
-- each still-open legacy set once (up to the product's existing 20-question
-- contract) and lock that order. Subsequent resumes are deterministic.
with open_random as (
  select
    attempt.id as attempt_id,
    count(mapped.question_id)::integer as mapped_count,
    coalesce(max(mapped.order_index), 0)::integer as max_order
  from public.test_attempts as attempt
  left join public.test_attempt_questions as mapped
    on mapped.attempt_id = attempt.id
  where attempt.status = 'in_progress'
    and attempt.test_id is null
  group by attempt.id
),
random_candidates as (
  select
    open_random.attempt_id,
    candidate.id as question_id,
    open_random.max_order
      + row_number() over (
          partition by open_random.attempt_id
          order by candidate.random_key, candidate.id
        )::integer as order_index
  from open_random
  cross join lateral (
    select question.id, random() as random_key
    from public.question_bank as question
    where not exists (
      select 1
      from public.test_attempt_questions as mapped
      where mapped.attempt_id = open_random.attempt_id
        and mapped.question_id = question.id
    )
    order by random_key, question.id
    limit greatest(20 - open_random.mapped_count, 0)
  ) as candidate
)
insert into public.test_attempt_questions (
  attempt_id,
  question_id,
  order_index
)
select attempt_id, question_id, order_index
from random_candidates
on conflict do nothing;

update public.test_attempts as attempt
set question_set_locked_at = coalesce(
  attempt.question_set_locked_at,
  statement_timestamp()
)
where exists (
  select 1
  from public.test_attempt_questions as mapped
  where mapped.attempt_id = attempt.id
);

alter table public.test_attempt_questions enable row level security;

drop policy if exists "test_attempt_questions_select_own"
  on public.test_attempt_questions;
create policy "test_attempt_questions_select_own"
  on public.test_attempt_questions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.test_attempts as attempt
      where attempt.id = test_attempt_questions.attempt_id
        and attempt.user_id = (select auth.uid())
    )
  );

revoke all privileges
  on table public.test_attempt_questions
  from public, anon, authenticated, service_role;
grant select
  on table public.test_attempt_questions
  to authenticated;
grant all privileges
  on table public.test_attempt_questions
  to service_role;

-- ---------------------------------------------------------------------------
-- Auth-bound transactional RPCs.
-- ---------------------------------------------------------------------------

create or replace function public.start_or_resume_test_attempt(
  p_test_id uuid,
  p_expected_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  attempt public.test_attempts%rowtype;
  payload jsonb;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_expected_user_id is null
     or p_expected_user_id is distinct from caller_id then
    raise exception 'Learner identity changed before the attempt was started'
      using errcode = '42501';
  end if;

  if p_test_id is null then
    raise exception 'A test id is required' using errcode = '22004';
  end if;

  -- Phase 1 cannot install the final unique index without breaking an old
  -- SELECT+INSERT bundle. Serialize new RPC callers with a transaction-scoped
  -- advisory lock; phase 2 reconciles any old-client race and adds the index.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      caller_id::text || ':test:' || p_test_id::text,
      81235
    )
  );

  select existing.*
  into attempt
  from public.test_attempts as existing
  where existing.user_id = caller_id
    and existing.test_id = p_test_id
    and existing.status = 'in_progress'
  order by existing.started_at, existing.id
  limit 1
  for update;

  if not found then
    insert into public.test_attempts (
      user_id,
      test_id,
      status
    )
    select caller_id, test.id, 'in_progress'
    from public.tests as test
    where test.id = p_test_id
      and test.is_active = true
      and exists (
        select 1
        from public.test_question_items as item
        where item.test_id = test.id
      )
    ;

    select existing.*
    into attempt
    from public.test_attempts as existing
    where existing.user_id = caller_id
      and existing.test_id = p_test_id
      and existing.status = 'in_progress'
    order by existing.started_at, existing.id
    limit 1
    for update;
  end if;

  if not found then
    raise exception 'Test is unavailable' using errcode = '22023';
  end if;

  if attempt.question_set_locked_at is null then
    insert into public.test_attempt_questions (
      attempt_id,
      question_id,
      order_index
    )
    select
      attempt.id,
      item.question_id,
      row_number() over (
        order by item.order_index, item.question_id
      )::integer
    from public.test_question_items as item
    where item.test_id = p_test_id
    on conflict do nothing;

    if exists (
      select 1
      from public.test_attempt_questions as mapped
      where mapped.attempt_id = attempt.id
    ) then
      update public.test_attempts
      set question_set_locked_at = statement_timestamp()
      where id = attempt.id
      returning * into attempt;
    end if;
  end if;

  -- A historical empty attempt cannot be resumed. Supersede it without
  -- deleting any row, then return an empty payload so the UI can show its
  -- existing no-questions state. New attempts are never created empty above.
  if not exists (
    select 1
    from public.test_attempt_questions as mapped
    where mapped.attempt_id = attempt.id
  ) then
    update public.test_attempts
    set
      status = 'superseded',
      updated_at = statement_timestamp()
    where id = attempt.id
    returning * into attempt;
  end if;

  select jsonb_build_object(
    'attempt', to_jsonb(attempt),
    'questions', coalesce((
      select jsonb_agg(to_jsonb(question) order by mapped.order_index)
      from public.test_attempt_questions as mapped
      join public.question_bank as question
        on question.id = mapped.question_id
      where mapped.attempt_id = attempt.id
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_agg(to_jsonb(answer) order by answer.confirmed_at, answer.id)
      from public.test_attempt_answers as answer
      where answer.attempt_id = attempt.id
    ), '[]'::jsonb)
  ) into payload;

  return payload;
end;
$function$;

drop function if exists public.start_or_resume_random_test_attempt(integer, integer);

create or replace function public.start_or_resume_random_test_attempt(
  p_expected_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  attempt public.test_attempts%rowtype;
  payload jsonb;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_expected_user_id is null
     or p_expected_user_id is distinct from caller_id then
    raise exception 'Learner identity changed before the attempt was started'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      caller_id::text || ':random',
      81235
    )
  );

  select existing.*
  into attempt
  from public.test_attempts as existing
  where existing.user_id = caller_id
    and existing.test_id is null
    and existing.status = 'in_progress'
  order by existing.started_at, existing.id
  limit 1
  for update;

  if not found then
    insert into public.test_attempts (
      user_id,
      test_id,
      status,
      time_limit_seconds
    )
    select
      caller_id,
      null,
      'in_progress',
      2400
    where (
      select count(*)
      from public.question_bank
    ) >= 20;

    select existing.*
    into attempt
    from public.test_attempts as existing
    where existing.user_id = caller_id
      and existing.test_id is null
      and existing.status = 'in_progress'
    order by existing.started_at, existing.id
    limit 1
    for update;
  end if;

  if not found then
    raise exception 'Could not start random test' using errcode = '55000';
  end if;

  -- Phase 1 still permits the old bundle's direct DML. Reassert the fixed
  -- random-test contract whenever an RPC takes ownership of an open attempt.
  update public.test_attempts
  set
    time_limit_seconds = 2400,
    started_at = least(started_at, statement_timestamp())
  where id = attempt.id
  returning * into attempt;

  if attempt.question_set_locked_at is null then
    insert into public.test_attempt_questions (
      attempt_id,
      question_id,
      order_index
    )
    select
      attempt.id,
      selected.question_id,
      row_number() over (
        order by selected.random_key, selected.question_id
      )::integer
    from (
      select question.id as question_id, random() as random_key
      from public.question_bank as question
      order by random_key, question.id
      limit 20
    ) as selected
    on conflict do nothing;

    if exists (
      select 1
      from public.test_attempt_questions as mapped
      where mapped.attempt_id = attempt.id
    ) then
      update public.test_attempts
      set question_set_locked_at = statement_timestamp()
      where id = attempt.id
      returning * into attempt;
    end if;
  end if;

  -- Do not strand a legacy empty attempt if the catalogue cannot provide any
  -- question. As with concrete tests, preserve the row as superseded and let
  -- the existing empty-state UI explain that no test is currently available.
  if not exists (
    select 1
    from public.test_attempt_questions as mapped
    where mapped.attempt_id = attempt.id
  ) then
    update public.test_attempts
    set
      status = 'superseded',
      updated_at = statement_timestamp()
    where id = attempt.id
    returning * into attempt;
  end if;

  select jsonb_build_object(
    'attempt', to_jsonb(attempt),
    'questions', coalesce((
      select jsonb_agg(to_jsonb(question) order by mapped.order_index)
      from public.test_attempt_questions as mapped
      join public.question_bank as question
        on question.id = mapped.question_id
      where mapped.attempt_id = attempt.id
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_agg(to_jsonb(answer) order by answer.confirmed_at, answer.id)
      from public.test_attempt_answers as answer
      where answer.attempt_id = attempt.id
    ), '[]'::jsonb)
  ) into payload;

  return payload;
end;
$function$;

-- Compatibility overloads remain executable only during the controlled
-- phase-one maintenance window. The launch frontend calls the explicit-owner
-- signatures above; phase two drops these auth.uid()-inferred overloads.
create or replace function public.start_or_resume_test_attempt(
  p_test_id uuid
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select public.start_or_resume_test_attempt(p_test_id, auth.uid());
$function$;

create or replace function public.start_or_resume_random_test_attempt()
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select public.start_or_resume_random_test_attempt(auth.uid());
$function$;

create or replace function public.save_test_attempt_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option text
)
returns setof public.test_attempt_answers
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  attempt public.test_attempts%rowtype;
  saved_answer public.test_attempt_answers%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_selected_option is null
     or p_selected_option not in ('A', 'B', 'C', 'D') then
    raise exception 'Selected option must be A, B, C, or D'
      using errcode = '22023';
  end if;

  select owned_attempt.*
  into attempt
  from public.test_attempts as owned_attempt
  where owned_attempt.id = p_attempt_id
    and owned_attempt.user_id = caller_id
  for update;

  if not found then
    raise exception 'Attempt is unavailable' using errcode = '42501';
  end if;

  if attempt.status <> 'in_progress' then
    raise exception 'Attempt is not in progress' using errcode = '55000';
  end if;

  if attempt.test_id is null
     and statement_timestamp() >= least(
       attempt.started_at,
       statement_timestamp()
     ) + pg_catalog.make_interval(secs => 2400) then
    raise exception 'Attempt deadline has passed' using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.test_attempt_questions as mapped
    where mapped.attempt_id = attempt.id
      and mapped.question_id = p_question_id
  ) then
    raise exception 'Question does not belong to this attempt'
      using errcode = '22023';
  end if;

  select answer.*
  into saved_answer
  from public.test_attempt_answers as answer
  where answer.attempt_id = attempt.id
    and answer.question_id = p_question_id;

  if found then
    if saved_answer.selected_option = p_selected_option then
      return next saved_answer;
      return;
    end if;

    -- Concrete tests historically let the learner revise an answer until the
    -- final submit. Keep that behaviour, but serialize it with the attempt row
    -- lock and clear any stale grading marker. Timed random tests deliberately
    -- lock the first persisted choice.
    if attempt.test_id is null then
      raise exception 'Answer is already locked' using errcode = '55000';
    end if;

    update public.test_attempt_answers
    set
      selected_option = p_selected_option,
      is_correct = null,
      confirmed_at = statement_timestamp()
    where id = saved_answer.id
    returning * into saved_answer;

    return next saved_answer;
    return;
  end if;

  insert into public.test_attempt_answers (
    attempt_id,
    question_id,
    selected_option,
    confirmed_at
  )
  values (
    attempt.id,
    p_question_id,
    p_selected_option,
    statement_timestamp()
  )
  returning * into saved_answer;

  return next saved_answer;
end;
$function$;

drop function if exists public.submit_test_attempt(uuid, boolean);

create or replace function public.submit_test_attempt(
  p_attempt_id uuid
)
returns setof public.test_attempts
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  attempt public.test_attempts%rowtype;
  expected_questions integer;
  answered_questions integer;
  correct_answers integer;
  elapsed_seconds integer;
  deadline_reached boolean;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select owned_attempt.*
  into attempt
  from public.test_attempts as owned_attempt
  where owned_attempt.id = p_attempt_id
    and owned_attempt.user_id = caller_id
  for update;

  if not found then
    raise exception 'Attempt is unavailable' using errcode = '42501';
  end if;

  if attempt.status = 'submitted' then
    return next attempt;
    return;
  end if;

  if attempt.status <> 'in_progress' then
    raise exception 'Attempt is not in progress' using errcode = '55000';
  end if;

  deadline_reached := attempt.test_id is null
    and statement_timestamp() >= least(
      attempt.started_at,
      statement_timestamp()
    ) + pg_catalog.make_interval(secs => 2400);

  select count(*)::integer
  into expected_questions
  from public.test_attempt_questions as mapped
  where mapped.attempt_id = attempt.id;

  if expected_questions = 0 then
    raise exception 'Attempt has no question set' using errcode = '22023';
  end if;

  select count(*)::integer
  into answered_questions
  from public.test_attempt_answers as answer
  join public.test_attempt_questions as mapped
    on mapped.attempt_id = answer.attempt_id
   and mapped.question_id = answer.question_id
  where answer.attempt_id = attempt.id;

  if deadline_reached = false
     and answered_questions < expected_questions then
    raise exception 'Every question must be answered before submission'
      using errcode = '55000';
  end if;

  update public.test_attempt_answers as answer
  set is_correct = (answer.selected_option = question.correct_option)
  from public.test_attempt_questions as mapped
  join public.question_bank as question
    on question.id = mapped.question_id
  where mapped.attempt_id = attempt.id
    and answer.attempt_id = attempt.id
    and answer.question_id = mapped.question_id;

  select count(*) filter (where answer.is_correct)::integer
  into correct_answers
  from public.test_attempt_answers as answer
  join public.test_attempt_questions as mapped
    on mapped.attempt_id = answer.attempt_id
   and mapped.question_id = answer.question_id
  where answer.attempt_id = attempt.id;

  elapsed_seconds := greatest(
    0,
    floor(
      extract(epoch from (statement_timestamp() - attempt.started_at))
    )::integer
  );

  if attempt.test_id is null then
    elapsed_seconds := least(elapsed_seconds, 2400);
  end if;

  update public.test_attempts
  set
    status = 'submitted',
    submitted_at = statement_timestamp(),
    score_correct = coalesce(correct_answers, 0),
    score_total = expected_questions,
    score_percent = round(
      (coalesce(correct_answers, 0)::numeric / expected_questions::numeric)
      * 100,
      0
    ),
    time_elapsed_seconds = case
      when attempt.test_id is null then elapsed_seconds
      else attempt.time_elapsed_seconds
    end,
    auto_submitted = deadline_reached
  where id = attempt.id
  returning * into attempt;

  return next attempt;
end;
$function$;

revoke all privileges
  on function public.start_or_resume_test_attempt(uuid, uuid)
  from public, anon, authenticated;
grant execute
  on function public.start_or_resume_test_attempt(uuid, uuid)
  to authenticated;

revoke all privileges
  on function public.start_or_resume_test_attempt(uuid)
  from public, anon, authenticated;
grant execute
  on function public.start_or_resume_test_attempt(uuid)
  to authenticated;

revoke all privileges
  on function public.start_or_resume_random_test_attempt(uuid)
  from public, anon, authenticated;
grant execute
  on function public.start_or_resume_random_test_attempt(uuid)
  to authenticated;

revoke all privileges
  on function public.start_or_resume_random_test_attempt()
  from public, anon, authenticated;
grant execute
  on function public.start_or_resume_random_test_attempt()
  to authenticated;

revoke all privileges
  on function public.save_test_attempt_answer(uuid, uuid, text)
  from public, anon, authenticated;
grant execute
  on function public.save_test_attempt_answer(uuid, uuid, text)
  to authenticated;

revoke all privileges
  on function public.submit_test_attempt(uuid)
  from public, anon, authenticated;
grant execute
  on function public.submit_test_attempt(uuid)
  to authenticated;

comment on table public.test_attempt_questions is
  'Immutable ordered question snapshot used to resume a learning attempt.';
comment on column public.test_attempts.superseded_by is
  'Canonical in-progress attempt selected during non-destructive deduplication.';
comment on column public.test_attempts.question_set_locked_at is
  'Timestamp after which the persisted ordered question set must not change.';
comment on function public.start_or_resume_test_attempt(uuid, uuid) is
  'Atomically starts or resumes an expected-user-bound concrete-test attempt.';
comment on function public.start_or_resume_random_test_attempt(uuid) is
  'Atomically starts or resumes an expected-user-bound random test with a fixed question order.';
comment on function public.start_or_resume_test_attempt(uuid) is
  'Temporary phase-one compatibility overload; remove in the restrictive cutover.';
comment on function public.start_or_resume_random_test_attempt() is
  'Temporary phase-one compatibility overload; remove in the restrictive cutover.';
comment on function public.save_test_attempt_answer(uuid, uuid, text) is
  'Saves an owner answer transactionally: concrete tests remain revisable; random answers lock on first save.';
comment on function public.submit_test_attempt(uuid) is
  'Atomically grades and submits an authenticated owner''s attempt.';
