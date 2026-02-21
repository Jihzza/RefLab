-- ================================================================
-- Migration: question_bank — single source of truth for all questions
-- Created: 2026-02-20
-- Description:
--   1. Creates question_bank table (the table already exists with data,
--      so IF NOT EXISTS is used for idempotency).
--   2. Adds RLS policies for question_bank.
--   3. Creates test_question_items bridge table (tests ↔ question_bank).
--   4. Migrates data from test_questions → question_bank (preserving IDs).
--   5. Populates bridge table from test_questions.
--   6. Re-points FKs on test_attempt_answers and question_practice_answers
--      to question_bank.
--   7. Recreates RPC functions to use question_bank.
-- ================================================================


-- ============================================================
-- STEP 1: Create question_bank table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.question_bank (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL,
  topic text NULL,
  law smallint NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_bank_pkey PRIMARY KEY (id),
  CONSTRAINT question_bank_correct_option_check CHECK (
    correct_option = ANY (ARRAY['A','B','C','D'])
  ),
  CONSTRAINT question_bank_law_check CHECK (
    (law IS NULL) OR ((law >= 1) AND (law <= 17))
  )
);

CREATE INDEX IF NOT EXISTS idx_question_bank_topic
  ON public.question_bank USING btree (topic)
  WHERE topic IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_bank_law
  ON public.question_bank USING btree (law)
  WHERE law IS NOT NULL;

-- updated_at trigger (set_updated_at already exists from 0001)
DROP TRIGGER IF EXISTS trg_question_bank_updated_at ON public.question_bank;
CREATE TRIGGER trg_question_bank_updated_at
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- STEP 2: RLS for question_bank
-- ============================================================

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'question_bank' AND policyname = 'question_bank_select_authenticated'
  ) THEN
    CREATE POLICY "question_bank_select_authenticated"
      ON public.question_bank FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;


-- ============================================================
-- STEP 3: Bridge table — test_question_items
-- ============================================================
-- Links a test to specific question_bank entries with ordering.

CREATE TABLE IF NOT EXISTS public.test_question_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  order_index int NOT NULL,
  UNIQUE(test_id, order_index),
  UNIQUE(test_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_test_question_items_test
  ON public.test_question_items(test_id);

CREATE INDEX IF NOT EXISTS idx_test_question_items_question
  ON public.test_question_items(question_id);

-- RLS: readable by authenticated users (same as tests)
ALTER TABLE public.test_question_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'test_question_items' AND policyname = 'test_question_items_select_authenticated'
  ) THEN
    CREATE POLICY "test_question_items_select_authenticated"
      ON public.test_question_items FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;


-- ============================================================
-- STEP 4: Migrate data from test_questions → question_bank
-- ============================================================
-- Preserves UUIDs so existing answer records remain valid.

INSERT INTO public.question_bank (
  id, question_text, option_a, option_b, option_c, option_d,
  correct_option, topic, law, created_at, updated_at
)
SELECT
  tq.id,
  tq.question_text,
  tq.option_a, tq.option_b, tq.option_c, tq.option_d,
  tq.correct_option,
  tq.topic,
  tq.law,
  now(),
  tq.updated_at
FROM public.test_questions tq
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- STEP 5: Populate bridge table from test_questions
-- ============================================================

INSERT INTO public.test_question_items (test_id, question_id, order_index)
SELECT tq.test_id, tq.id, tq.order_index
FROM public.test_questions tq
ON CONFLICT (test_id, order_index) DO NOTHING;


-- ============================================================
-- STEP 6: Re-point FK on test_attempt_answers → question_bank
-- ============================================================

ALTER TABLE public.test_attempt_answers
  DROP CONSTRAINT IF EXISTS test_attempt_answers_question_id_fkey;

ALTER TABLE public.test_attempt_answers
  ADD CONSTRAINT test_attempt_answers_question_id_fkey
    FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


-- ============================================================
-- STEP 7: Re-point FK on question_practice_answers → question_bank
-- ============================================================

ALTER TABLE public.question_practice_answers
  DROP CONSTRAINT IF EXISTS question_practice_answers_question_id_fkey;

ALTER TABLE public.question_practice_answers
  ADD CONSTRAINT question_practice_answers_question_id_fkey
    FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


-- ============================================================
-- STEP 8: Recreate get_random_questions() → question_bank
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_random_questions()
RETURNS SETOF public.question_bank
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT qb.*
  FROM public.question_bank qb
  ORDER BY random()
  LIMIT 20;
END;
$$;

COMMENT ON FUNCTION public.get_random_questions() IS
  'Returns 20 random questions from the question_bank for random test format';

GRANT EXECUTE ON FUNCTION public.get_random_questions() TO authenticated;


-- ============================================================
-- STEP 9: Recreate get_attempt_topic_breakdown() → question_bank
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_attempt_topic_breakdown(p_attempt_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_strong JSON;
  v_weak JSON;
BEGIN
  -- Strong topics (>= 75% accuracy with at least 2 questions)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_strong
  FROM (
    SELECT
      qb.topic,
      ROUND((SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 1) AS accuracy,
      SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::integer AS correct,
      COUNT(*)::integer AS total
    FROM public.test_attempt_answers taa
    JOIN public.question_bank qb ON qb.id = taa.question_id
    WHERE taa.attempt_id = p_attempt_id
      AND qb.topic IS NOT NULL
    GROUP BY qb.topic
    HAVING COUNT(*) >= 2
      AND (SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) >= 0.75
    ORDER BY accuracy DESC
  ) t;

  -- Weak topics (< 50% accuracy)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_weak
  FROM (
    SELECT
      qb.topic,
      ROUND((SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 1) AS accuracy,
      SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::integer AS correct,
      COUNT(*)::integer AS total
    FROM public.test_attempt_answers taa
    JOIN public.question_bank qb ON qb.id = taa.question_id
    WHERE taa.attempt_id = p_attempt_id
      AND qb.topic IS NOT NULL
    GROUP BY qb.topic
    HAVING (SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) < 0.50
    ORDER BY accuracy ASC
  ) t;

  RETURN json_build_object('strong', v_strong, 'weak', v_weak);
END;
$$;

COMMENT ON FUNCTION public.get_attempt_topic_breakdown(UUID) IS
  'Analyzes topic performance for a test attempt using question_bank, returning strong (>=75%) and weak (<50%) topics';

GRANT EXECUTE ON FUNCTION public.get_attempt_topic_breakdown(UUID) TO authenticated;


-- ============================================================
-- STEP 10: Recreate get_dashboard_stats() → question_bank
-- ============================================================

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
  v_avg_test_duration integer;
  v_last_test_duration integer;
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

  -- ── PERFORMANCE: Accuracy by Topic (Tests + Questions + Videos) via question_bank ──
  WITH all_topic_answers AS (
    SELECT COALESCE(qb.topic, 'Uncategorized') AS topic, taa.is_correct
    FROM public.test_attempt_answers taa
    JOIN public.test_attempts ta ON ta.id = taa.attempt_id
    JOIN public.question_bank qb ON qb.id = taa.question_id
    WHERE ta.user_id = p_user_id AND ta.status = 'submitted'
      AND qb.topic IS NOT NULL
    UNION ALL
    SELECT COALESCE(qb.topic, 'Uncategorized') AS topic, qpa.is_correct
    FROM public.question_practice_answers qpa
    JOIN public.question_bank qb ON qb.id = qpa.question_id
    WHERE qpa.user_id = p_user_id
      AND qb.topic IS NOT NULL
    UNION ALL
    SELECT COALESCE(vs.topic, 'Uncategorized') AS topic, va.is_correct
    FROM public.video_attempts va
    JOIN public.video_scenarios vs ON vs.id = va.scenario_id
    WHERE va.user_id = p_user_id
  )
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_accuracy_by_topic
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

  -- ── PROGRESS: Total Tests Completed ──
  SELECT count(*) INTO v_total_tests_completed
  FROM public.test_attempts ta
  WHERE ta.user_id = p_user_id AND ta.status = 'submitted';

  -- ── PROGRESS: Total Tests Passed (>= 80%) ──
  SELECT count(*) INTO v_total_tests_passed
  FROM public.test_attempts ta
  WHERE ta.user_id = p_user_id AND ta.status = 'submitted' AND ta.score_percent >= 80;

  -- ── PROGRESS: Average Test Duration ──
  SELECT AVG(time_elapsed_seconds)::integer
  INTO v_avg_test_duration
  FROM public.test_attempts
  WHERE user_id = p_user_id
    AND status = 'submitted'
    AND time_elapsed_seconds IS NOT NULL;

  -- ── PROGRESS: Last Test Duration ──
  SELECT time_elapsed_seconds::integer
  INTO v_last_test_duration
  FROM public.test_attempts
  WHERE user_id = p_user_id
    AND status = 'submitted'
    AND time_elapsed_seconds IS NOT NULL
  ORDER BY submitted_at DESC
  LIMIT 1;

  -- ── HABITS: 30-day Calendar ──
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json) INTO v_calendar
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
    COALESCE((SELECT s.streak_length::integer FROM streaks s
      WHERE s.streak_end >= current_date - 1 ORDER BY s.streak_end DESC LIMIT 1), 0),
    COALESCE((SELECT max(s.streak_length)::integer FROM streaks s), 0)
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
      'total_tests_passed', v_total_tests_passed,
      'average_test_duration', v_avg_test_duration,
      'last_test_duration', v_last_test_duration
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

REVOKE ALL ON FUNCTION public.get_dashboard_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;


-- ============================================================
-- STEP 11: Update clear_learning_history → also clear question_sessions
-- ============================================================

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
  DELETE FROM public.question_sessions WHERE user_id = p_user_id;
  DELETE FROM public.video_attempts WHERE user_id = p_user_id;
  DELETE FROM public.user_activity_days WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id
    AND type IN ('streak_track', 'streak_reminder', 'streak_loss');
  RETURN json_build_object('success', true, 'deleted_attempts', v_deleted_attempts);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.clear_learning_history(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.clear_learning_history(uuid) TO authenticated;
