-- ================================================================
-- Practice Question Answers + Updated Dashboard RPC
-- ================================================================
-- This migration:
-- 1. Creates question_practice_answers table for tracking practice mode answers
-- 2. Adds RLS policies
-- 3. Adds activity day trigger for practice answers
-- 4. Replaces get_dashboard_stats to include practice + video data
-- 5. Updates clear_learning_history to also clear practice answers
-- ================================================================


-- ============================================
-- STEP 1: QUESTION PRACTICE ANSWERS TABLE
-- ============================================

CREATE TABLE public.question_practice_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  selected_option text NOT NULL CHECK (selected_option IN ('A','B','C','D')),
  is_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_practice_answers_user
  ON public.question_practice_answers(user_id);

CREATE INDEX idx_practice_answers_question
  ON public.question_practice_answers(question_id);

CREATE INDEX idx_practice_answers_user_created
  ON public.question_practice_answers(user_id, created_at);


-- ============================================
-- STEP 2: RLS FOR PRACTICE ANSWERS
-- ============================================

ALTER TABLE public.question_practice_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_answers_select_own"
  ON public.question_practice_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "practice_answers_insert_own"
  ON public.question_practice_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- STEP 3: ACTIVITY DAY TRIGGER FOR PRACTICE
-- ============================================

-- RLS policy to allow trigger inserts into user_activity_days
-- (The trigger runs as SECURITY DEFINER so it bypasses RLS,
--  but we need an INSERT policy for the direct API calls)
CREATE POLICY "activity_days_insert_own"
  ON public.user_activity_days FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_activity_day_on_practice_answer()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_activity_days (user_id, activity_date)
  VALUES (new.user_id, current_date)
  ON CONFLICT (user_id, activity_date) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_practice_answer_activity_day
  AFTER INSERT ON public.question_practice_answers
  FOR EACH ROW EXECUTE FUNCTION public.handle_activity_day_on_practice_answer();


-- ============================================
-- STEP 4: UPDATED DASHBOARD RPC
-- ============================================
-- Now includes practice questions and video attempts in:
--   - Overall Accuracy (Tests + Questions + Videos)
--   - Accuracy by Topic (Tests + Questions + Videos)
--   - Accuracy Change (Tests + Questions + Videos)
--   - Total Questions Answered (Tests + Questions + Videos)
-- Adds:
--   - total_tests_completed (all submitted tests)
-- Unchanged:
--   - Match Simulation Accuracy (Videos only)
--   - Pass Rate (Tests only)
--   - Total Tests Passed (Tests only)
--   - Calendar / Streaks / Active Days (all via user_activity_days triggers)

DROP FUNCTION IF EXISTS public.get_dashboard_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_overall_accuracy numeric;
  v_accuracy_by_topic json;
  v_match_sim_accuracy numeric;
  v_pass_rate numeric;
  v_accuracy_this_week numeric;
  v_accuracy_last_week numeric;
  v_accuracy_change numeric;
  v_total_questions_answered bigint;
  v_total_tests_completed bigint;
  v_total_tests_passed bigint;
  v_calendar json;
  v_current_streak integer;
  v_longest_streak integer;
  v_active_days_last_7 integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  -- ── PERFORMANCE: Overall Accuracy (Tests + Questions + Videos) ──
  WITH all_answers AS (
    SELECT taa.is_correct
    FROM public.test_attempt_answers taa
    JOIN public.test_attempts ta ON ta.id = taa.attempt_id
    WHERE ta.user_id = p_user_id AND ta.status = 'submitted'
    UNION ALL
    SELECT qpa.is_correct
    FROM public.question_practice_answers qpa
    WHERE qpa.user_id = p_user_id
    UNION ALL
    SELECT va.is_correct
    FROM public.video_attempts va
    WHERE va.user_id = p_user_id
  )
  SELECT CASE WHEN count(*) = 0 THEN NULL
    ELSE round((sum(CASE WHEN is_correct THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100, 1)
  END INTO v_overall_accuracy
  FROM all_answers;

  -- ── PERFORMANCE: Accuracy by Topic (Tests + Questions + Videos) ──
  WITH all_topic_answers AS (
    SELECT coalesce(te.topic, 'Uncategorized') AS topic, taa.is_correct
    FROM public.test_attempt_answers taa
    JOIN public.test_attempts ta ON ta.id = taa.attempt_id
    JOIN public.tests te ON te.id = ta.test_id
    WHERE ta.user_id = p_user_id AND ta.status = 'submitted'
    UNION ALL
    SELECT coalesce(te.topic, 'Uncategorized') AS topic, qpa.is_correct
    FROM public.question_practice_answers qpa
    JOIN public.test_questions tq ON tq.id = qpa.question_id
    JOIN public.tests te ON te.id = tq.test_id
    WHERE qpa.user_id = p_user_id
    UNION ALL
    SELECT coalesce(vs.topic, 'Uncategorized') AS topic, va.is_correct
    FROM public.video_attempts va
    JOIN public.video_scenarios vs ON vs.id = va.scenario_id
    WHERE va.user_id = p_user_id
  )
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_accuracy_by_topic
  FROM (
    SELECT topic,
      round((sum(CASE WHEN is_correct THEN 1 ELSE 0 END)::numeric / nullif(count(*)::numeric, 0)) * 100, 1) AS accuracy,
      count(*)::integer AS total_questions
    FROM all_topic_answers
    GROUP BY topic ORDER BY accuracy DESC NULLS LAST
  ) t;

  -- ── PERFORMANCE: Match Simulation Accuracy (Videos only) ──
  SELECT CASE WHEN count(*) = 0 THEN NULL
    ELSE round((sum(CASE WHEN va.is_correct THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100, 1)
  END INTO v_match_sim_accuracy
  FROM public.video_attempts va WHERE va.user_id = p_user_id;

  -- ── PERFORMANCE: Pass Rate (Tests only, >= 80%) ──
  SELECT CASE WHEN count(*) = 0 THEN NULL
    ELSE round((sum(CASE WHEN ta.score_percent >= 80 THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100, 1)
  END INTO v_pass_rate
  FROM public.test_attempts ta
  WHERE ta.user_id = p_user_id AND ta.status = 'submitted';

  -- ── PROGRESS: Accuracy this week (Tests + Questions + Videos) ──
  WITH all_this_week AS (
    SELECT taa.is_correct
    FROM public.test_attempt_answers taa
    JOIN public.test_attempts ta ON ta.id = taa.attempt_id
    WHERE ta.user_id = p_user_id AND ta.status = 'submitted'
      AND ta.submitted_at >= date_trunc('week', current_date)
    UNION ALL
    SELECT qpa.is_correct
    FROM public.question_practice_answers qpa
    WHERE qpa.user_id = p_user_id
      AND qpa.created_at >= date_trunc('week', current_date)
    UNION ALL
    SELECT va.is_correct
    FROM public.video_attempts va
    WHERE va.user_id = p_user_id
      AND va.created_at >= date_trunc('week', current_date)
  )
  SELECT CASE WHEN count(*) = 0 THEN NULL
    ELSE round((sum(CASE WHEN is_correct THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100, 1)
  END INTO v_accuracy_this_week
  FROM all_this_week;

  -- ── PROGRESS: Accuracy last week (Tests + Questions + Videos) ──
  WITH all_last_week AS (
    SELECT taa.is_correct
    FROM public.test_attempt_answers taa
    JOIN public.test_attempts ta ON ta.id = taa.attempt_id
    WHERE ta.user_id = p_user_id AND ta.status = 'submitted'
      AND ta.submitted_at >= date_trunc('week', current_date) - interval '7 days'
      AND ta.submitted_at < date_trunc('week', current_date)
    UNION ALL
    SELECT qpa.is_correct
    FROM public.question_practice_answers qpa
    WHERE qpa.user_id = p_user_id
      AND qpa.created_at >= date_trunc('week', current_date) - interval '7 days'
      AND qpa.created_at < date_trunc('week', current_date)
    UNION ALL
    SELECT va.is_correct
    FROM public.video_attempts va
    WHERE va.user_id = p_user_id
      AND va.created_at >= date_trunc('week', current_date) - interval '7 days'
      AND va.created_at < date_trunc('week', current_date)
  )
  SELECT CASE WHEN count(*) = 0 THEN NULL
    ELSE round((sum(CASE WHEN is_correct THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100, 1)
  END INTO v_accuracy_last_week
  FROM all_last_week;

  -- ── PROGRESS: Accuracy Change ──
  IF v_accuracy_this_week IS NOT NULL AND v_accuracy_last_week IS NOT NULL THEN
    v_accuracy_change := round(v_accuracy_this_week - v_accuracy_last_week, 1);
  ELSE
    v_accuracy_change := NULL;
  END IF;

  -- ── PROGRESS: Total Questions Answered (Tests + Questions + Videos) ──
  SELECT (
    (SELECT count(*) FROM public.test_attempt_answers taa
     JOIN public.test_attempts ta ON ta.id = taa.attempt_id
     WHERE ta.user_id = p_user_id AND ta.status = 'submitted')
    +
    (SELECT count(*) FROM public.question_practice_answers
     WHERE user_id = p_user_id)
    +
    (SELECT count(*) FROM public.video_attempts
     WHERE user_id = p_user_id)
  ) INTO v_total_questions_answered;

  -- ── PROGRESS: Total Tests Completed (Tests only) ──
  SELECT count(*) INTO v_total_tests_completed
  FROM public.test_attempts ta
  WHERE ta.user_id = p_user_id AND ta.status = 'submitted';

  -- ── PROGRESS: Total Tests Passed (Tests only, >= 80%) ──
  SELECT count(*) INTO v_total_tests_passed
  FROM public.test_attempts ta
  WHERE ta.user_id = p_user_id AND ta.status = 'submitted' AND ta.score_percent >= 80;

  -- ── HABITS: 30-day Calendar ──
  SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json) INTO v_calendar
  FROM (
    SELECT d.day::date AS date,
      EXISTS(SELECT 1 FROM public.user_activity_days uad
        WHERE uad.user_id = p_user_id AND uad.activity_date = d.day::date) AS active
    FROM generate_series(current_date - interval '29 days', current_date, interval '1 day') AS d(day)
  ) t;

  -- ── HABITS: Streaks ──
  WITH activity_with_gaps AS (
    SELECT activity_date,
      activity_date - (row_number() OVER (ORDER BY activity_date))::integer AS streak_group
    FROM public.user_activity_days WHERE user_id = p_user_id
  ),
  streaks AS (
    SELECT streak_group, count(*) AS streak_length, max(activity_date) AS streak_end
    FROM activity_with_gaps GROUP BY streak_group
  )
  SELECT
    coalesce((SELECT s.streak_length::integer FROM streaks s
      WHERE s.streak_end >= current_date - 1 ORDER BY s.streak_end DESC LIMIT 1), 0),
    coalesce((SELECT max(s.streak_length)::integer FROM streaks s), 0)
  INTO v_current_streak, v_longest_streak;

  -- ── HABITS: Active Days Last 7 ──
  SELECT count(*)::integer INTO v_active_days_last_7
  FROM public.user_activity_days
  WHERE user_id = p_user_id AND activity_date >= current_date - 6;

  RETURN json_build_object(
    'performance', json_build_object(
      'overall_accuracy', v_overall_accuracy,
      'accuracy_by_topic', v_accuracy_by_topic,
      'match_simulation_accuracy', v_match_sim_accuracy,
      'pass_rate', v_pass_rate
    ),
    'progress', json_build_object(
      'accuracy_change', v_accuracy_change,
      'accuracy_this_week', v_accuracy_this_week,
      'accuracy_last_week', v_accuracy_last_week,
      'total_questions_answered', v_total_questions_answered,
      'total_tests_completed', v_total_tests_completed,
      'total_tests_passed', v_total_tests_passed
    ),
    'habits', json_build_object(
      'calendar', v_calendar,
      'current_streak', v_current_streak,
      'longest_streak', v_longest_streak,
      'active_days_last_7', v_active_days_last_7
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;


-- ============================================
-- STEP 5: UPDATE CLEAR LEARNING HISTORY
-- ============================================

CREATE OR REPLACE FUNCTION public.clear_learning_history(p_user_id uuid)
RETURNS json AS $$
DECLARE v_deleted_attempts integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;
  DELETE FROM public.test_attempts WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_attempts = ROW_COUNT;
  DELETE FROM public.question_practice_answers WHERE user_id = p_user_id;
  DELETE FROM public.video_attempts WHERE user_id = p_user_id;
  DELETE FROM public.user_activity_days WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id
    AND type IN ('streak_track', 'streak_reminder', 'streak_loss');
  RETURN json_build_object('success', true, 'deleted_attempts', v_deleted_attempts);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================
-- STEP 6: GRANTS
-- ============================================

REVOKE ALL ON FUNCTION public.get_dashboard_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.clear_learning_history(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.clear_learning_history(uuid) TO authenticated;
