-- Learning activity integrity -- staged phase 1 (additive and reversible).
--
-- This migration is deliberately safe to apply while the previous frontend is
-- still open in users' browsers. Compatibility triggers derive every
-- KPI-bearing value on direct writes, while the new SECURITY DEFINER RPCs are
-- introduced for the replacement frontend. Do not apply phase 2 until that
-- frontend has been deployed and smoke-tested; see LEARNING_ATTEMPT_CUTOVER.md.

alter table public.question_bank
  add column if not exists is_active boolean not null default true;

create index if not exists question_bank_active_law_idx
  on public.question_bank(law)
  where is_active;

create index if not exists question_bank_active_topic_idx
  on public.question_bank(topic)
  where is_active;

comment on column public.question_bank.is_active is
  'Controls availability for new practice sessions without deleting historical answers.';

-- Old bundles use only SELECT plus the documented INSERT/UPDATE paths. Remove
-- dangerous Supabase default privileges that RLS cannot make safe (TRUNCATE)
-- or that no browser workflow needs, without breaking the compatibility gate.
revoke delete, truncate, references, trigger
  on table
    public.question_sessions,
    public.question_practice_answers,
    public.video_attempts
  from public, anon, authenticated;

-- Old bundles can still write these tables during phase 1. These guards make
-- those writes authoritative on the server without changing their response
-- shape or requiring a synchronized deployment.
create or replace function public.enforce_question_session_server_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  completed_at timestamptz;
  answer_total integer;
  correct_total integer;
begin
  if actor_id is null
     and session_user::text not in ('postgres', 'service_role', 'supabase_admin')
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if actor_id is not null then
      if new.user_id is distinct from actor_id then
        raise exception 'Learner identity changed before the question session was saved'
          using errcode = '42501';
      end if;
    elsif new.user_id is null then
      raise exception 'user_id is required for trusted maintenance writes'
        using errcode = '23502';
    end if;

    perform 1
    from public.profiles as profile
    where profile.id = new.user_id
    for share;

    if exists (
      select 1
      from public.profiles as profile
      where profile.id = new.user_id
        and profile.deletion_started_at is not null
    ) then
      raise exception 'Learning writes are unavailable while account deletion is pending'
        using errcode = '55000';
    end if;

    if coalesce(cardinality(new.filter_laws), 0) > 17 then
      raise exception 'filter_laws cannot contain more than 17 values'
        using errcode = '22023';
    end if;
    if coalesce(cardinality(new.filter_areas), 0) > 50 then
      raise exception 'filter_areas cannot contain more than 50 values'
        using errcode = '22023';
    end if;

    if new.filter_laws is not null and exists (
      select 1
      from unnest(new.filter_laws) as law_number
      where law_number is null or law_number < 1 or law_number > 17
    ) then
      raise exception 'filter_laws must contain only FIFA law numbers 1 through 17'
        using errcode = '22023';
    end if;

    if new.filter_areas is not null and exists (
      select 1
      from unnest(new.filter_areas) as area_name
      where area_name is null
        or char_length(area_name) > 120
        or btrim(area_name) = ''
    ) then
      raise exception 'filter_areas values must contain 1 through 120 characters'
        using errcode = '22023';
    end if;

    select array_agg(distinct law_number order by law_number)
      into new.filter_laws
      from unnest(new.filter_laws) as law_number;

    select array_agg(distinct btrim(area_name) order by btrim(area_name))
      into new.filter_areas
      from unnest(new.filter_areas) as area_name;

    if new.mode = 'quick' then
      if new.filter_laws is not null or new.filter_areas is not null then
        raise exception 'quick sessions cannot have filters'
          using errcode = '22023';
      end if;
    elsif new.mode = 'by_law' then
      if new.filter_laws is null or new.filter_areas is not null then
        raise exception 'by_law sessions require laws and cannot have areas'
          using errcode = '22023';
      end if;
    elsif new.mode = 'by_area' then
      if new.filter_areas is null or new.filter_laws is not null then
        raise exception 'by_area sessions require areas and cannot have laws'
          using errcode = '22023';
      end if;
    else
      raise exception 'Unsupported question session mode'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.question_bank as question
      where question.is_active
        and (
          new.mode = 'quick'
          or (new.mode = 'by_law' and question.law = any(new.filter_laws))
          or (new.mode = 'by_area' and question.topic = any(new.filter_areas))
        )
    ) then
      raise exception 'No active questions match this session'
        using errcode = 'P0002';
    end if;

    new.started_at := statement_timestamp();
    new.created_at := statement_timestamp();
    new.ended_at := null;
    new.duration_seconds := null;
    new.total_answered := 0;
    new.total_correct := 0;
    return new;
  end if;

  if actor_id is not null and actor_id <> old.user_id then
    raise exception 'Question session does not belong to the authenticated user'
      using errcode = '42501';
  end if;

  perform 1
  from public.profiles as profile
  where profile.id = old.user_id
  for share;

  if exists (
    select 1
    from public.profiles as profile
    where profile.id = old.user_id
      and profile.deletion_started_at is not null
  ) then
    raise exception 'Learning writes are unavailable while account deletion is pending'
      using errcode = '55000';
  end if;

  -- Session identity and selection are immutable after creation.
  new.id := old.id;
  new.user_id := old.user_id;
  new.mode := old.mode;
  new.filter_laws := old.filter_laws;
  new.filter_areas := old.filter_areas;
  new.started_at := old.started_at;
  new.created_at := old.created_at;

  -- Repeated completion is intentionally idempotent.
  if old.ended_at is not null then
    return old;
  end if;

  if new.ended_at is null then
    new.duration_seconds := null;
    new.total_answered := 0;
    new.total_correct := 0;
    return new;
  end if;

  completed_at := statement_timestamp();
  select
    count(*)::integer,
    count(*) filter (where answer.is_correct)::integer
  into answer_total, correct_total
  from public.question_practice_answers as answer
  where answer.session_id = old.id
    and answer.user_id = old.user_id;

  new.ended_at := completed_at;
  new.duration_seconds := least(
    2147483647,
    greatest(0, floor(extract(epoch from completed_at - old.started_at)))::bigint
  )::integer;
  new.total_answered := answer_total;
  new.total_correct := correct_total;
  return new;
end;
$function$;

drop trigger if exists enforce_question_session_server_fields
  on public.question_sessions;
create trigger enforce_question_session_server_fields
  before insert or update
  on public.question_sessions
  for each row
  execute function public.enforce_question_session_server_fields();

create or replace function public.derive_question_practice_answer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  canonical_option text;
  question_law smallint;
  question_topic text;
  parent_session public.question_sessions%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new is not distinct from old then
      return old;
    end if;
    raise exception 'Practice answers are immutable'
      using errcode = '55000';
  end if;

  if actor_id is null
     and session_user::text not in ('postgres', 'service_role', 'supabase_admin')
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if actor_id is not null then
    if new.user_id is distinct from actor_id then
      raise exception 'Learner identity changed before the practice answer was saved'
        using errcode = '42501';
    end if;
  elsif new.user_id is null then
    raise exception 'user_id is required for trusted maintenance writes'
      using errcode = '23502';
  end if;

  perform 1
  from public.profiles as profile
  where profile.id = new.user_id
  for share;

  if exists (
    select 1
    from public.profiles as profile
    where profile.id = new.user_id
      and profile.deletion_started_at is not null
  ) then
    raise exception 'Learning writes are unavailable while account deletion is pending'
      using errcode = '55000';
  end if;

  new.selected_option := upper(btrim(new.selected_option));
  if new.selected_option is null
     or new.selected_option <> all(array['A', 'B', 'C', 'D']::text[]) then
    raise exception 'selected_option must be A, B, C, or D'
      using errcode = '22023';
  end if;

  select question.correct_option, question.law, question.topic
    into canonical_option, question_law, question_topic
  from public.question_bank as question
  where question.id = new.question_id
    and question.is_active;

  if not found then
    raise exception 'Question does not exist or is inactive'
      using errcode = 'P0002';
  end if;

  if new.session_id is not null then
    select session.*
      into parent_session
    from public.question_sessions as session
    where session.id = new.session_id
    for update;

    if not found then
      raise exception 'Question session does not exist'
        using errcode = 'P0002';
    end if;
    if parent_session.user_id <> new.user_id then
      raise exception 'Question session does not belong to the authenticated user'
        using errcode = '42501';
    end if;
    if parent_session.ended_at is not null then
      raise exception 'Question session is already complete'
        using errcode = '55000';
    end if;
    if exists (
      select 1
      from public.question_practice_answers as prior_answer
      where prior_answer.session_id = new.session_id
        and prior_answer.question_id = new.question_id
    ) then
      raise exception 'Question already answered in this session'
        using errcode = '23505';
    end if;
    if not (
      parent_session.mode = 'quick'
      or (
        parent_session.mode = 'by_law'
        and question_law = any(parent_session.filter_laws)
      )
      or (
        parent_session.mode = 'by_area'
        and question_topic = any(parent_session.filter_areas)
      )
    ) then
      raise exception 'Question does not belong to this session pool'
        using errcode = '22023';
    end if;
  end if;

  new.is_correct := new.selected_option = canonical_option;
  new.created_at := statement_timestamp();
  return new;
end;
$function$;

drop trigger if exists derive_question_practice_answer
  on public.question_practice_answers;
create trigger derive_question_practice_answer
  before insert or update
  on public.question_practice_answers
  for each row
  execute function public.derive_question_practice_answer();

create or replace function public.derive_video_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  canonical_action text;
  canonical_sanction text;
begin
  if tg_op = 'UPDATE' then
    if new is not distinct from old then
      return old;
    end if;
    raise exception 'Video attempts are immutable'
      using errcode = '55000';
  end if;

  if actor_id is null
     and session_user::text not in ('postgres', 'service_role', 'supabase_admin')
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if actor_id is not null then
    if new.user_id is distinct from actor_id then
      raise exception 'Learner identity changed before the video attempt was saved'
        using errcode = '42501';
    end if;
  elsif new.user_id is null then
    raise exception 'user_id is required for trusted maintenance writes'
      using errcode = '23502';
  end if;

  perform 1
  from public.profiles as profile
  where profile.id = new.user_id
  for share;

  if exists (
    select 1
    from public.profiles as profile
    where profile.id = new.user_id
      and profile.deletion_started_at is not null
  ) then
    raise exception 'Learning writes are unavailable while account deletion is pending'
      using errcode = '55000';
  end if;

  new.selected_action := btrim(new.selected_action);
  new.selected_sanction := btrim(new.selected_sanction);

  if new.selected_action is null or new.selected_action <> all(array[
    'Play on — no offence',
    'Indirect free kick',
    'Direct free kick',
    'Penalty kick',
    'Goal kick',
    'Corner kick',
    'Drop ball',
    'Goal disallowed',
    'Retake'
  ]::text[]) then
    raise exception 'Unsupported video action'
      using errcode = '22023';
  end if;

  if new.selected_sanction is null or new.selected_sanction <> all(array[
    'No card',
    'Yellow card (caution)',
    'Red card (sending off)'
  ]::text[]) then
    raise exception 'Unsupported video sanction'
      using errcode = '22023';
  end if;

  select scenario.correct_action, scenario.correct_sanction
    into canonical_action, canonical_sanction
  from public.video_scenarios as scenario
  where scenario.id = new.scenario_id
    and scenario.is_active;

  if not found then
    raise exception 'Video scenario does not exist or is inactive'
      using errcode = 'P0002';
  end if;

  if canonical_action <> all(array[
    'Play on — no offence',
    'Indirect free kick',
    'Direct free kick',
    'Penalty kick',
    'Goal kick',
    'Corner kick',
    'Drop ball',
    'Goal disallowed',
    'Retake'
  ]::text[])
  or canonical_sanction <> all(array[
    'No card',
    'Yellow card (caution)',
    'Red card (sending off)'
  ]::text[]) then
    raise exception 'Video scenario has an unsupported canonical decision'
      using errcode = '22023';
  end if;

  new.action_correct := new.selected_action = canonical_action;
  new.sanction_correct := new.selected_sanction = canonical_sanction;
  new.is_correct := new.action_correct and new.sanction_correct;
  new.created_at := statement_timestamp();
  return new;
end;
$function$;

drop trigger if exists derive_video_attempt
  on public.video_attempts;
create trigger derive_video_attempt
  before insert or update
  on public.video_attempts
  for each row
  execute function public.derive_video_attempt();

revoke all privileges
  on function public.enforce_question_session_server_fields()
  from public, anon, authenticated, service_role;
revoke all privileges
  on function public.derive_question_practice_answer()
  from public, anon, authenticated, service_role;
revoke all privileges
  on function public.derive_video_attempt()
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Authenticated mutation RPCs. Each accepts a caller-generated UUID so a
-- response-lost retry can return the original row instead of duplicating it.
-- ---------------------------------------------------------------------------

create or replace function public.start_question_session(
  p_session_id uuid,
  p_expected_user_id uuid,
  p_mode text,
  p_filter_laws smallint[] default null,
  p_filter_areas text[] default null
)
returns setof public.question_sessions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  normalized_laws smallint[];
  normalized_areas text[];
  existing_session public.question_sessions%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;
  if p_expected_user_id is null
     or p_expected_user_id is distinct from actor_id then
    raise exception 'Learner identity changed before the session was started'
      using errcode = '42501';
  end if;
  perform 1
  from public.profiles as profile
  where profile.id = actor_id
  for share;

  if exists (
    select 1
    from public.profiles as profile
    where profile.id = actor_id
      and profile.deletion_started_at is not null
  ) then
    raise exception 'Learning writes are unavailable while account deletion is pending'
      using errcode = '55000';
  end if;
  if p_session_id is null then
    raise exception 'p_session_id is required'
      using errcode = '22023';
  end if;

  if coalesce(cardinality(p_filter_laws), 0) > 17 then
    raise exception 'p_filter_laws cannot contain more than 17 values'
      using errcode = '22023';
  end if;
  if coalesce(cardinality(p_filter_areas), 0) > 50 then
    raise exception 'p_filter_areas cannot contain more than 50 values'
      using errcode = '22023';
  end if;

  if p_filter_laws is not null and exists (
    select 1
    from unnest(p_filter_laws) as law_number
    where law_number is null or law_number < 1 or law_number > 17
  ) then
    raise exception 'p_filter_laws must contain only FIFA law numbers 1 through 17'
      using errcode = '22023';
  end if;
  if p_filter_areas is not null and exists (
    select 1
    from unnest(p_filter_areas) as area_name
    where area_name is null
      or char_length(area_name) > 120
      or btrim(area_name) = ''
  ) then
    raise exception 'p_filter_areas values must contain 1 through 120 characters'
      using errcode = '22023';
  end if;

  select array_agg(distinct law_number order by law_number)
    into normalized_laws
    from unnest(p_filter_laws) as law_number;
  select array_agg(distinct btrim(area_name) order by btrim(area_name))
    into normalized_areas
    from unnest(p_filter_areas) as area_name;

  if p_mode = 'quick' then
    if normalized_laws is not null or normalized_areas is not null then
      raise exception 'quick sessions cannot have filters'
        using errcode = '22023';
    end if;
  elsif p_mode = 'by_law' then
    if normalized_laws is null or normalized_areas is not null then
      raise exception 'by_law sessions require laws and cannot have areas'
        using errcode = '22023';
    end if;
  elsif p_mode = 'by_area' then
    if normalized_areas is null or normalized_laws is not null then
      raise exception 'by_area sessions require areas and cannot have laws'
        using errcode = '22023';
    end if;
  else
    raise exception 'Unsupported question session mode'
      using errcode = '22023';
  end if;

  select session.*
    into existing_session
  from public.question_sessions as session
  where session.id = p_session_id
  for update;

  if found then
    if existing_session.user_id <> actor_id then
      raise exception 'Session id belongs to another user'
        using errcode = '42501';
    end if;
    if existing_session.mode is distinct from p_mode
       or existing_session.filter_laws is distinct from normalized_laws
       or existing_session.filter_areas is distinct from normalized_areas then
      raise exception 'Session id was already used with different parameters'
        using errcode = '23505';
    end if;
    return next existing_session;
    return;
  end if;

  if not exists (
    select 1
    from public.question_bank as question
    where question.is_active
      and (
        p_mode = 'quick'
        or (p_mode = 'by_law' and question.law = any(normalized_laws))
        or (p_mode = 'by_area' and question.topic = any(normalized_areas))
      )
  ) then
    raise exception 'No active questions match this session'
      using errcode = 'P0002';
  end if;

  insert into public.question_sessions (
    id,
    user_id,
    mode,
    filter_laws,
    filter_areas
  )
  values (
    p_session_id,
    actor_id,
    p_mode,
    normalized_laws,
    normalized_areas
  )
  on conflict (id) do nothing;

  select session.*
    into existing_session
  from public.question_sessions as session
  where session.id = p_session_id
  for update;

  if not found then
    raise exception 'Question session could not be created'
      using errcode = 'P0002';
  end if;
  if existing_session.user_id <> actor_id then
    raise exception 'Session id belongs to another user'
      using errcode = '42501';
  end if;
  if existing_session.mode is distinct from p_mode
     or existing_session.filter_laws is distinct from normalized_laws
     or existing_session.filter_areas is distinct from normalized_areas then
    raise exception 'Session id was already used with different parameters'
      using errcode = '23505';
  end if;

  return next existing_session;
end;
$function$;

create or replace function public.save_question_practice_answer(
  p_answer_id uuid,
  p_session_id uuid,
  p_question_id uuid,
  p_selected_option text
)
returns setof public.question_practice_answers
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  normalized_option text := upper(btrim(p_selected_option));
  existing_answer public.question_practice_answers%rowtype;
  parent_session public.question_sessions%rowtype;
  canonical_option text;
  question_law smallint;
  question_topic text;
begin
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;
  perform 1
  from public.profiles as profile
  where profile.id = actor_id
  for share;

  if exists (
    select 1
    from public.profiles as profile
    where profile.id = actor_id
      and profile.deletion_started_at is not null
  ) then
    raise exception 'Learning writes are unavailable while account deletion is pending'
      using errcode = '55000';
  end if;
  if p_answer_id is null or p_session_id is null or p_question_id is null then
    raise exception 'Answer, session, and question ids are required'
      using errcode = '22023';
  end if;
  if normalized_option is null
     or normalized_option <> all(array['A', 'B', 'C', 'D']::text[]) then
    raise exception 'p_selected_option must be A, B, C, or D'
      using errcode = '22023';
  end if;

  select answer.*
    into existing_answer
  from public.question_practice_answers as answer
  where answer.id = p_answer_id;

  if found then
    if existing_answer.user_id <> actor_id then
      raise exception 'Answer id belongs to another user'
        using errcode = '42501';
    end if;
    if existing_answer.session_id is distinct from p_session_id
       or existing_answer.question_id is distinct from p_question_id
       or existing_answer.selected_option is distinct from normalized_option then
      raise exception 'Answer id was already used with different parameters'
        using errcode = '23505';
    end if;
    return next existing_answer;
    return;
  end if;

  select session.*
    into parent_session
  from public.question_sessions as session
  where session.id = p_session_id
  for update;

  if not found then
    raise exception 'Question session does not exist'
      using errcode = 'P0002';
  end if;

  -- A concurrent exact retry can miss the first optimistic lookup, wait on
  -- this session lock, and then observe the committed answer. Recheck the id
  -- before the per-question duplicate guard so that retry remains idempotent.
  select answer.*
    into existing_answer
  from public.question_practice_answers as answer
  where answer.id = p_answer_id;

  if found then
    if existing_answer.user_id <> actor_id then
      raise exception 'Answer id belongs to another user'
        using errcode = '42501';
    end if;
    if existing_answer.session_id is distinct from p_session_id
       or existing_answer.question_id is distinct from p_question_id
       or existing_answer.selected_option is distinct from normalized_option then
      raise exception 'Answer id was already used with different parameters'
        using errcode = '23505';
    end if;
    return next existing_answer;
    return;
  end if;

  if parent_session.user_id <> actor_id then
    raise exception 'Question session does not belong to the authenticated user'
      using errcode = '42501';
  end if;
  if parent_session.ended_at is not null then
    raise exception 'Question session is already complete'
      using errcode = '55000';
  end if;
  if exists (
    select 1
    from public.question_practice_answers as prior_answer
    where prior_answer.session_id = p_session_id
      and prior_answer.question_id = p_question_id
  ) then
    raise exception 'Question already answered in this session'
      using errcode = '23505';
  end if;

  select question.correct_option, question.law, question.topic
    into canonical_option, question_law, question_topic
  from public.question_bank as question
  where question.id = p_question_id
    and question.is_active;

  if not found then
    raise exception 'Question does not exist or is inactive'
      using errcode = 'P0002';
  end if;
  if not (
    parent_session.mode = 'quick'
    or (
      parent_session.mode = 'by_law'
      and question_law = any(parent_session.filter_laws)
    )
    or (
      parent_session.mode = 'by_area'
      and question_topic = any(parent_session.filter_areas)
    )
  ) then
    raise exception 'Question does not belong to this session pool'
      using errcode = '22023';
  end if;

  insert into public.question_practice_answers (
    id,
    user_id,
    question_id,
    selected_option,
    is_correct,
    session_id
  )
  values (
    p_answer_id,
    actor_id,
    p_question_id,
    normalized_option,
    normalized_option = canonical_option,
    p_session_id
  )
  on conflict (id) do nothing;

  select answer.*
    into existing_answer
  from public.question_practice_answers as answer
  where answer.id = p_answer_id;

  if not found then
    raise exception 'Practice answer could not be created'
      using errcode = 'P0002';
  end if;
  if existing_answer.user_id <> actor_id then
    raise exception 'Answer id belongs to another user'
      using errcode = '42501';
  end if;
  if existing_answer.session_id is distinct from p_session_id
     or existing_answer.question_id is distinct from p_question_id
     or existing_answer.selected_option is distinct from normalized_option then
    raise exception 'Answer id was already used with different parameters'
      using errcode = '23505';
  end if;

  return next existing_answer;
end;
$function$;

create or replace function public.complete_question_session(
  p_session_id uuid
)
returns setof public.question_sessions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  completed_session public.question_sessions%rowtype;
  completed_at timestamptz := statement_timestamp();
  answer_total integer;
  correct_total integer;
begin
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;
  perform 1
  from public.profiles as profile
  where profile.id = actor_id
  for share;

  if exists (
    select 1
    from public.profiles as profile
    where profile.id = actor_id
      and profile.deletion_started_at is not null
  ) then
    raise exception 'Learning writes are unavailable while account deletion is pending'
      using errcode = '55000';
  end if;
  if p_session_id is null then
    raise exception 'p_session_id is required'
      using errcode = '22023';
  end if;

  select session.*
    into completed_session
  from public.question_sessions as session
  where session.id = p_session_id
  for update;

  if not found then
    raise exception 'Question session does not exist'
      using errcode = 'P0002';
  end if;
  if completed_session.user_id <> actor_id then
    raise exception 'Question session does not belong to the authenticated user'
      using errcode = '42501';
  end if;
  if completed_session.ended_at is not null then
    return next completed_session;
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where answer.is_correct)::integer
  into answer_total, correct_total
  from public.question_practice_answers as answer
  where answer.session_id = p_session_id
    and answer.user_id = actor_id;

  update public.question_sessions as session
  set
    ended_at = completed_at,
    duration_seconds = least(
      2147483647,
      greatest(
        0,
        floor(extract(epoch from completed_at - session.started_at))
      )::bigint
    )::integer,
    total_answered = answer_total,
    total_correct = correct_total
  where session.id = p_session_id
  returning session.* into completed_session;

  return next completed_session;
end;
$function$;

create or replace function public.save_video_attempt(
  p_attempt_id uuid,
  p_expected_user_id uuid,
  p_scenario_id uuid,
  p_selected_action text,
  p_selected_sanction text
)
returns setof public.video_attempts
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  normalized_action text := btrim(p_selected_action);
  normalized_sanction text := btrim(p_selected_sanction);
  canonical_action text;
  canonical_sanction text;
  existing_attempt public.video_attempts%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;
  if p_expected_user_id is null
     or p_expected_user_id is distinct from actor_id then
    raise exception 'Learner identity changed before the video attempt was saved'
      using errcode = '42501';
  end if;
  perform 1
  from public.profiles as profile
  where profile.id = actor_id
  for share;

  if exists (
    select 1
    from public.profiles as profile
    where profile.id = actor_id
      and profile.deletion_started_at is not null
  ) then
    raise exception 'Learning writes are unavailable while account deletion is pending'
      using errcode = '55000';
  end if;
  if p_attempt_id is null or p_scenario_id is null then
    raise exception 'Attempt and scenario ids are required'
      using errcode = '22023';
  end if;

  if normalized_action is null or normalized_action <> all(array[
    'Play on — no offence',
    'Indirect free kick',
    'Direct free kick',
    'Penalty kick',
    'Goal kick',
    'Corner kick',
    'Drop ball',
    'Goal disallowed',
    'Retake'
  ]::text[]) then
    raise exception 'Unsupported video action'
      using errcode = '22023';
  end if;
  if normalized_sanction is null or normalized_sanction <> all(array[
    'No card',
    'Yellow card (caution)',
    'Red card (sending off)'
  ]::text[]) then
    raise exception 'Unsupported video sanction'
      using errcode = '22023';
  end if;

  select attempt.*
    into existing_attempt
  from public.video_attempts as attempt
  where attempt.id = p_attempt_id;

  if found then
    if existing_attempt.user_id <> actor_id then
      raise exception 'Video attempt id belongs to another user'
        using errcode = '42501';
    end if;
    if existing_attempt.scenario_id is distinct from p_scenario_id
       or existing_attempt.selected_action is distinct from normalized_action
       or existing_attempt.selected_sanction is distinct from normalized_sanction then
      raise exception 'Video attempt id was already used with different parameters'
        using errcode = '23505';
    end if;
    return next existing_attempt;
    return;
  end if;

  select scenario.correct_action, scenario.correct_sanction
    into canonical_action, canonical_sanction
  from public.video_scenarios as scenario
  where scenario.id = p_scenario_id
    and scenario.is_active;

  if not found then
    raise exception 'Video scenario does not exist or is inactive'
      using errcode = 'P0002';
  end if;
  if canonical_action <> all(array[
    'Play on — no offence',
    'Indirect free kick',
    'Direct free kick',
    'Penalty kick',
    'Goal kick',
    'Corner kick',
    'Drop ball',
    'Goal disallowed',
    'Retake'
  ]::text[])
  or canonical_sanction <> all(array[
    'No card',
    'Yellow card (caution)',
    'Red card (sending off)'
  ]::text[]) then
    raise exception 'Video scenario has an unsupported canonical decision'
      using errcode = '22023';
  end if;

  insert into public.video_attempts (
    id,
    user_id,
    scenario_id,
    selected_action,
    selected_sanction,
    action_correct,
    sanction_correct,
    is_correct
  )
  values (
    p_attempt_id,
    actor_id,
    p_scenario_id,
    normalized_action,
    normalized_sanction,
    normalized_action = canonical_action,
    normalized_sanction = canonical_sanction,
    normalized_action = canonical_action and normalized_sanction = canonical_sanction
  )
  on conflict (id) do nothing;

  select attempt.*
    into existing_attempt
  from public.video_attempts as attempt
  where attempt.id = p_attempt_id;

  if not found then
    raise exception 'Video attempt could not be created'
      using errcode = 'P0002';
  end if;
  if existing_attempt.user_id <> actor_id then
    raise exception 'Video attempt id belongs to another user'
      using errcode = '42501';
  end if;
  if existing_attempt.scenario_id is distinct from p_scenario_id
     or existing_attempt.selected_action is distinct from normalized_action
     or existing_attempt.selected_sanction is distinct from normalized_sanction then
    raise exception 'Video attempt id was already used with different parameters'
      using errcode = '23505';
  end if;

  return next existing_attempt;
end;
$function$;

-- Compatibility overloads are kept only for the controlled phase-one
-- maintenance window. The launch frontend uses the expected-user signatures;
-- phase two removes these session-inferred wrappers.
create or replace function public.start_question_session(
  p_session_id uuid,
  p_mode text,
  p_filter_laws smallint[] default null,
  p_filter_areas text[] default null
)
returns setof public.question_sessions
language sql
volatile
security invoker
set search_path = ''
as $function$
  select *
  from public.start_question_session(
    p_session_id,
    auth.uid(),
    p_mode,
    p_filter_laws,
    p_filter_areas
  );
$function$;

create or replace function public.save_video_attempt(
  p_attempt_id uuid,
  p_scenario_id uuid,
  p_selected_action text,
  p_selected_sanction text
)
returns setof public.video_attempts
language sql
volatile
security invoker
set search_path = ''
as $function$
  select *
  from public.save_video_attempt(
    p_attempt_id,
    auth.uid(),
    p_scenario_id,
    p_selected_action,
    p_selected_sanction
  );
$function$;

revoke all privileges
  on function public.start_question_session(uuid, uuid, text, smallint[], text[])
  from public, anon, authenticated, service_role;
revoke all privileges
  on function public.start_question_session(uuid, text, smallint[], text[])
  from public, anon, authenticated, service_role;
revoke all privileges
  on function public.save_question_practice_answer(uuid, uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all privileges
  on function public.complete_question_session(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges
  on function public.save_video_attempt(uuid, uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all privileges
  on function public.save_video_attempt(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;

grant execute
  on function public.start_question_session(uuid, uuid, text, smallint[], text[])
  to authenticated;
grant execute
  on function public.start_question_session(uuid, text, smallint[], text[])
  to authenticated;
grant execute
  on function public.save_question_practice_answer(uuid, uuid, uuid, text)
  to authenticated;
grant execute
  on function public.complete_question_session(uuid)
  to authenticated;
grant execute
  on function public.save_video_attempt(uuid, uuid, uuid, text, text)
  to authenticated;
grant execute
  on function public.save_video_attempt(uuid, uuid, text, text)
  to authenticated;

comment on function public.start_question_session(uuid, uuid, text, smallint[], text[]) is
  'Starts an expected-user-bound practice session. p_session_id makes exact retries idempotent.';
comment on function public.start_question_session(uuid, text, smallint[], text[]) is
  'Temporary phase-one compatibility overload; remove in the restrictive cutover.';
comment on function public.save_question_practice_answer(uuid, uuid, uuid, text) is
  'Saves an auth-bound practice answer and derives correctness from question_bank.';
comment on function public.complete_question_session(uuid) is
  'Completes an auth-bound session and derives timing and totals from server rows.';
comment on function public.save_video_attempt(uuid, uuid, uuid, text, text) is
  'Saves an expected-user-bound video decision and derives correctness from video_scenarios.';
comment on function public.save_video_attempt(uuid, uuid, text, text) is
  'Temporary phase-one compatibility overload; remove in the restrictive cutover.';
