-- Migration: BLOCKER (HIGH) — world-readable answer keys + client-side grading
-- ============================================================================
-- question_bank.correct_option is selectable by every authenticated user (RLS
-- `using (true)` + table-wide SELECT grant), and grading happens in the browser
-- (testsApi submitAttempt/submitRandomTest select correct_option and compute
-- is_correct client-side, then write scores). A user can read every answer key
-- and forge is_correct / scores. This migration:
--
--   A. Column-level GRANTs so clients can read questions but NOT correct_option,
--      and cannot write the trust-bearing columns (is_correct, scores).
--   B. Recreates get_random_questions to omit correct_option.
--   C. grade_practice_answer() — server-side grading for the Questions practice
--      flow (immediate per-question feedback), returning is_correct + the key
--      only AFTER the answer is recorded.
--   D. submit_test_attempt() — server-side grading + scoring for classic and
--      random tests (idempotent).
--   E. get_attempt_corrections() — reveals per-question keys only for the
--      caller's OWN submitted attempt; plus an ownership guard on
--      get_attempt_topic_breakdown (previously an IDOR).
--
-- COUPLING: the frontend must switch to explicit question columns and these RPCs
-- in the SAME release (apps/frontend/src/features/learn — testsApi.ts,
-- QuestionsSession.tsx, QuestionsReview.tsx, RandomTestResults.tsx, types.ts).
-- The column REVOKE makes PostgREST reject select('*') on question_bank, so the
-- migration and the frontend explicit-column reads are inseparable. Apply the
-- migration FIRST (or atomically), then deploy the frontend.
--
-- NOTE: additive migration — does not edit prior migrations. NOT yet applied to a
-- live database; apply and test on a Supabase branch before production.
-- ============================================================================

-- ── PART A: lock down columns ────────────────────────────────────────────────

-- question_bank: clients may read questions but never the answer key.
revoke select on public.question_bank from authenticated, anon;
grant select
  (id, question_text, option_a, option_b, option_c, option_d, topic, law, created_at, updated_at)
  on public.question_bank to authenticated;

-- Legacy test_questions (superseded by question_bank in 0047, no frontend reader)
-- still carries answer keys with a `using (true)` policy — remove client access.
revoke all on public.test_questions from authenticated, anon;

-- test_attempt_answers: is_correct / ai_explanation are server-owned. Allow
-- clients to write only their selection (keeps saveAnswer's upsert working).
revoke insert, update on public.test_attempt_answers from authenticated;
grant insert (attempt_id, question_id, selected_option, confirmed_at)
  on public.test_attempt_answers to authenticated;
grant update (selected_option, confirmed_at)
  on public.test_attempt_answers to authenticated;
-- SELECT stays table-wide (own rows via RLS) so getAttemptAnswers/resume work.

-- test_attempts: scores/status are set only by submit_test_attempt(). Clients
-- keep INSERT (create/resume an attempt) but lose direct UPDATE.
revoke update on public.test_attempts from authenticated;

-- question_practice_answers: is_correct is server-owned; only the grading RPC
-- inserts. SELECT stays for KPI reads.
revoke insert on public.question_practice_answers from authenticated;


-- ── PART B: random questions without the answer key ──────────────────────────
-- Return type changes, so CREATE OR REPLACE is not enough — drop first.
drop function if exists public.get_random_questions();

create function public.get_random_questions()
returns table (
  id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  topic text,
  law smallint,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select qb.id, qb.question_text, qb.option_a, qb.option_b, qb.option_c,
         qb.option_d, qb.topic, qb.law, qb.created_at, qb.updated_at
  from public.question_bank qb
  order by random()
  limit 20;
$$;

revoke all on function public.get_random_questions() from public, anon;
grant execute on function public.get_random_questions() to authenticated;


-- ── PART C: server-side practice grading ─────────────────────────────────────
create or replace function public.grade_practice_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_selected_option text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correct text;
  v_is_correct boolean;
begin
  if p_selected_option not in ('A', 'B', 'C', 'D') then
    raise exception 'Invalid option' using errcode = '22023';
  end if;

  -- Caller must own the session and it must still be open.
  if not exists (
    select 1 from public.question_sessions s
    where s.id = p_session_id
      and s.user_id = auth.uid()
      and s.ended_at is null
  ) then
    raise exception 'Not authorized for this session' using errcode = '42501';
  end if;

  select qb.correct_option into v_correct
  from public.question_bank qb
  where qb.id = p_question_id;

  if v_correct is null then
    raise exception 'Question not found' using errcode = 'P0002';
  end if;

  v_is_correct := (p_selected_option = v_correct);

  insert into public.question_practice_answers
    (user_id, question_id, selected_option, is_correct, session_id)
  values
    (auth.uid(), p_question_id, p_selected_option, v_is_correct, p_session_id);

  return json_build_object('is_correct', v_is_correct, 'correct_option', v_correct);
end;
$$;

revoke all on function public.grade_practice_answer(uuid, uuid, text) from public, anon;
grant execute on function public.grade_practice_answer(uuid, uuid, text) to authenticated;


-- ── PART D: server-side test submission + scoring ────────────────────────────
create or replace function public.submit_test_attempt(
  p_attempt_id uuid,
  p_time_elapsed_seconds integer default null,
  p_auto_submitted boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_total integer;
  v_correct integer;
  v_percent integer;
  v_attempt public.test_attempts;
begin
  -- Lock and verify ownership.
  select status into v_status
  from public.test_attempts
  where id = p_attempt_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt not found' using errcode = '42501';
  end if;

  -- Idempotent: a double submit (e.g. timer expiry + manual) returns the row.
  if v_status = 'submitted' then
    select * into v_attempt from public.test_attempts where id = p_attempt_id;
    return row_to_json(v_attempt);
  end if;

  -- Grade every recorded answer against the authoritative key.
  update public.test_attempt_answers taa
  set is_correct = (taa.selected_option = qb.correct_option)
  from public.question_bank qb
  where qb.id = taa.question_id
    and taa.attempt_id = p_attempt_id;

  select
    count(*)::int,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::int
  into v_total, v_correct
  from public.test_attempt_answers
  where attempt_id = p_attempt_id;

  v_percent := case when v_total > 0
                 then round((v_correct::numeric / v_total::numeric) * 100)::int
                 else 0 end;

  update public.test_attempts
  set status = 'submitted',
      submitted_at = now(),
      score_correct = v_correct,
      score_total = v_total,
      score_percent = v_percent,
      time_elapsed_seconds = coalesce(p_time_elapsed_seconds, time_elapsed_seconds),
      auto_submitted = p_auto_submitted
  where id = p_attempt_id
  returning * into v_attempt;

  return row_to_json(v_attempt);
end;
$$;

revoke all on function public.submit_test_attempt(uuid, integer, boolean) from public, anon;
grant execute on function public.submit_test_attempt(uuid, integer, boolean) to authenticated;


-- ── PART E: post-submission corrections + topic-breakdown ownership guard ─────
create or replace function public.get_attempt_corrections(p_attempt_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  -- Keys are revealed only for the caller's OWN, already-submitted attempt.
  if not exists (
    select 1 from public.test_attempts
    where id = p_attempt_id
      and user_id = auth.uid()
      and status = 'submitted'
  ) then
    raise exception 'Not authorized for this attempt' using errcode = '42501';
  end if;

  select coalesce(json_agg(row_to_json(c) order by c.confirmed_at), '[]'::json)
  into v_result
  from (
    select
      taa.selected_option,
      taa.is_correct,
      qb.correct_option,
      taa.confirmed_at,
      json_build_object(
        'id', qb.id,
        'question_text', qb.question_text,
        'option_a', qb.option_a,
        'option_b', qb.option_b,
        'option_c', qb.option_c,
        'option_d', qb.option_d,
        'topic', qb.topic,
        'law', qb.law
      ) as question
    from public.test_attempt_answers taa
    join public.question_bank qb on qb.id = taa.question_id
    where taa.attempt_id = p_attempt_id
  ) c;

  return v_result;
end;
$$;

revoke all on function public.get_attempt_corrections(uuid) from public, anon;
grant execute on function public.get_attempt_corrections(uuid) to authenticated;

-- Add an ownership guard to the existing topic-breakdown RPC (was an IDOR:
-- SECURITY DEFINER with no auth.uid() check). Body unchanged from 0047 except
-- the guard.
create or replace function public.get_attempt_topic_breakdown(p_attempt_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_strong json;
  v_weak json;
begin
  if not exists (
    select 1 from public.test_attempts
    where id = p_attempt_id and user_id = auth.uid()
  ) then
    raise exception 'Not authorized for this attempt' using errcode = '42501';
  end if;

  -- Strong topics (>= 75% accuracy with at least 2 questions)
  select coalesce(json_agg(row_to_json(t)), '[]'::json) into v_strong
  from (
    select
      qb.topic,
      round((sum(case when taa.is_correct then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1) as accuracy,
      sum(case when taa.is_correct then 1 else 0 end)::integer as correct,
      count(*)::integer as total
    from public.test_attempt_answers taa
    join public.question_bank qb on qb.id = taa.question_id
    where taa.attempt_id = p_attempt_id
      and qb.topic is not null
    group by qb.topic
    having count(*) >= 2
      and (sum(case when taa.is_correct then 1 else 0 end)::numeric / count(*)::numeric) >= 0.75
    order by accuracy desc
  ) t;

  -- Weak topics (< 50% accuracy)
  select coalesce(json_agg(row_to_json(t)), '[]'::json) into v_weak
  from (
    select
      qb.topic,
      round((sum(case when taa.is_correct then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1) as accuracy,
      sum(case when taa.is_correct then 1 else 0 end)::integer as correct,
      count(*)::integer as total
    from public.test_attempt_answers taa
    join public.question_bank qb on qb.id = taa.question_id
    where taa.attempt_id = p_attempt_id
      and qb.topic is not null
    group by qb.topic
    having (sum(case when taa.is_correct then 1 else 0 end)::numeric / count(*)::numeric) < 0.50
    order by accuracy asc
  ) t;

  return json_build_object('strong', v_strong, 'weak', v_weak);
end;
$$;

grant execute on function public.get_attempt_topic_breakdown(uuid) to authenticated;
