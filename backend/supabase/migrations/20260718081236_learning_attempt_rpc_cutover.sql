-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ STOP: STAGED PHASE 2 -- DO NOT APPLY IN THE SAME BATCH AS PHASE 1.      ║
-- ║ NEVER use `supabase db push` while 81235 and 81236 are both pending.     ║
-- ║ This phase revokes the legacy frontend's direct mutation privileges.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Required order (do not collapse these release gates):
--   1. Individually apply 20260718081235_learning_attempt_integrity.sql.
--   2. Deploy the exact RPC-based frontend and smoke start/resume/save/submit.
--   3. Individually apply this migration only after the smoke passes.
--   4. Smoke start/resume/save/submit again and confirm direct DML is denied.
--
-- Follow backend/supabase/LEARNING_ATTEMPT_CUTOVER.md exactly. Automated
-- migration runners that apply every pending file make this sequence unsafe.
--
-- Phase 1 deliberately kept the old browser writes alive. Reconcile any
-- duplicates or attempts created in that transition window, then add the final
-- unique indexes and remove the legacy mutation surface.

do $owner_bound_contract_must_exist$
begin
  if to_regprocedure(
    'public.start_or_resume_test_attempt(uuid,uuid)'
  ) is null
     or to_regprocedure(
       'public.start_or_resume_random_test_attempt(uuid)'
     ) is null then
    raise exception
      'Expected-user learning attempt RPC contract is incomplete; refusing restrictive cutover'
      using errcode = '55000';
  end if;
end;
$owner_bound_contract_must_exist$;

-- The old bundle inferred ownership from whichever session happened to be
-- active when a queued request executed. It is safe only during maintenance.
drop function if exists public.start_or_resume_test_attempt(uuid);
drop function if exists public.start_or_resume_random_test_attempt();

lock table public.test_attempts in share row exclusive mode;
lock table public.test_attempt_answers in share row exclusive mode;

-- Close the phase-1 compatibility window by normalizing any random attempt an
-- old bundle created or mutated after phase 1. A trigger and a check below
-- keep the fixed 40-minute contract true after the cutover.
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

create temporary table learning_attempt_cutover_deduplication
on commit drop
as
with candidates as (
  select
    attempt.id,
    attempt.user_id,
    attempt.test_id,
    attempt.started_at,
    (
      select count(*)
      from public.test_attempt_answers as answer
      where answer.attempt_id = attempt.id
    ) as answer_count
  from public.test_attempts as attempt
  where attempt.status = 'in_progress'
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

with copy_candidates as (
  select distinct on (dedupe.survivor_id, answer.question_id)
    dedupe.survivor_id,
    answer.question_id,
    answer.selected_option,
    answer.is_correct,
    answer.confirmed_at,
    answer.ai_explanation,
    answer.ai_explanation_created_at
  from learning_attempt_cutover_deduplication as dedupe
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
from learning_attempt_cutover_deduplication as dedupe
where duplicate.id = dedupe.duplicate_id;

-- Snapshot attempts created by an old bundle during phase 1. Concrete tests
-- get their canonical bridge order; known legacy/random answers are appended
-- without deleting or rewriting their source rows.
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
  and not exists (
    select 1
    from public.test_attempt_questions as existing
    where existing.attempt_id = attempt.id
  )
on conflict do nothing;

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
    and attempt.question_set_locked_at is null
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

create unique index if not exists test_attempts_one_open_test_uidx
  on public.test_attempts(user_id, test_id)
  where status = 'in_progress' and test_id is not null;

create unique index if not exists test_attempts_one_open_random_uidx
  on public.test_attempts(user_id)
  where status = 'in_progress' and test_id is null;

drop policy if exists "test_attempts_insert_own" on public.test_attempts;
drop policy if exists "test_attempts_update_own" on public.test_attempts;
drop policy if exists "attempt_answers_insert_own" on public.test_attempt_answers;
drop policy if exists "attempt_answers_update_own" on public.test_attempt_answers;

revoke insert, update, delete
  on table public.test_attempts
  from public, anon, authenticated;
revoke insert, update, delete
  on table public.test_attempt_answers
  from public, anon, authenticated;

-- Remove any historical column-level mutation grants as well. Table-level
-- REVOKE does not override a separately granted column privilege.
do $column_privileges$
declare
  attempt_columns text;
  answer_columns text;
begin
  select string_agg(format('%I', attribute.attname), ', ' order by attribute.attnum)
  into attempt_columns
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.test_attempts'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select string_agg(format('%I', attribute.attname), ', ' order by attribute.attnum)
  into answer_columns
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.test_attempt_answers'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped;

  execute format(
    'revoke insert (%s), update (%s) on table public.test_attempts from public, anon, authenticated',
    attempt_columns,
    attempt_columns
  );
  execute format(
    'revoke insert (%s), update (%s) on table public.test_attempt_answers from public, anon, authenticated',
    answer_columns,
    answer_columns
  );
end;
$column_privileges$;

grant select on table public.test_attempts to authenticated;
grant select on table public.test_attempt_answers to authenticated;
grant all privileges on table public.test_attempts to service_role;
grant all privileges on table public.test_attempt_answers to service_role;
