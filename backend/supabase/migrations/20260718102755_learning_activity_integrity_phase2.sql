-- ╔═════════════════════════════════════════════════════════════════════╗
-- ║ STOP: STAGED PHASE 2 -- DO NOT APPLY WITH PHASE 1.                 ║
-- ║ This removes the legacy browser mutation surface.                 ║
-- ╚════════════════════════════════════════════════════════════════════════╝
--
-- Apply only after 20260718102753 is live, the RPC frontend is deployed, and
-- session/practice/video smoke tests pass. Follow LEARNING_ATTEMPT_CUTOVER.md;
-- never run `supabase db push` while both phases are pending.

do $owner_bound_contract_must_exist$
begin
  if to_regprocedure(
    'public.start_question_session(uuid,uuid,text,smallint[],text[])'
  ) is null
     or to_regprocedure(
       'public.save_video_attempt(uuid,uuid,uuid,text,text)'
     ) is null then
    raise exception
      'Expected-user learning activity RPC contract is incomplete; refusing restrictive cutover'
      using errcode = '55000';
  end if;
end;
$owner_bound_contract_must_exist$;

drop function if exists public.start_question_session(uuid, text, smallint[], text[]);
drop function if exists public.save_video_attempt(uuid, uuid, text, text);

lock table public.question_sessions in share row exclusive mode;
lock table public.question_practice_answers in share row exclusive mode;
lock table public.video_attempts in share row exclusive mode;

drop policy if exists "question_sessions_insert_own"
  on public.question_sessions;
drop policy if exists "question_sessions_update_own"
  on public.question_sessions;
drop policy if exists "practice_answers_insert_own"
  on public.question_practice_answers;
drop policy if exists "video_attempts_insert_own"
  on public.video_attempts;

revoke all privileges
  on table public.question_sessions
  from public, anon, authenticated;
revoke all privileges
  on table public.question_practice_answers
  from public, anon, authenticated;
revoke all privileges
  on table public.video_attempts
  from public, anon, authenticated;

-- A table-level REVOKE does not remove separately granted column privileges.
do $column_privileges$
declare
  target_table regclass;
  target_columns text;
begin
  foreach target_table in array array[
    'public.question_sessions'::regclass,
    'public.question_practice_answers'::regclass,
    'public.video_attempts'::regclass
  ]
  loop
    select string_agg(
      format('%I', attribute.attname),
      ', ' order by attribute.attnum
    )
    into target_columns
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = target_table
      and attribute.attnum > 0
      and not attribute.attisdropped;

    execute format(
      'revoke insert (%s), update (%s), references (%s) on table %s from public, anon, authenticated',
      target_columns,
      target_columns,
      target_columns,
      target_table
    );
  end loop;
end;
$column_privileges$;

grant select on table public.question_sessions to authenticated;
grant select on table public.question_practice_answers to authenticated;
grant select on table public.video_attempts to authenticated;

grant all privileges on table public.question_sessions to service_role;
grant all privileges on table public.question_practice_answers to service_role;
grant all privileges on table public.video_attempts to service_role;

-- Compatibility derivation triggers remain installed as defence in depth for
-- trusted maintenance and any accidentally reintroduced table grant.
