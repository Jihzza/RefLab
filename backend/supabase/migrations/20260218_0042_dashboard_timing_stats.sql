-- Migration: Extend dashboard RPC to include test timing metrics
-- Created: 2026-02-18
-- Description: Adds average_test_duration and last_test_duration to the progress object
--              in the get_dashboard_stats RPC function

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  -- Performance
  v_overall_accuracy numeric;
  v_accuracy_by_topic json;
  v_match_sim_accuracy numeric;
  v_pass_rate numeric;
  -- Progress
  v_accuracy_this_week numeric;
  v_accuracy_last_week numeric;
  v_accuracy_change numeric;
  v_total_questions_answered bigint;
  v_total_tests_passed bigint;
  v_avg_test_duration integer;          -- NEW: Average test duration in seconds
  v_last_test_duration integer;         -- NEW: Last test duration in seconds
  -- Habits
  v_calendar json;
  v_current_streak integer;
  v_longest_streak integer;
  v_active_days_last_7 integer;
BEGIN
  -- =============================================
  -- Authorization
  -- =============================================
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  -- =============================================
  -- PERFORMANCE SECTION
  -- =============================================

  -- 1. Overall Accuracy %
  SELECT
    CASE
      WHEN count(*) = 0 THEN null
      ELSE round(
        (sum(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100, 1
      )
    END
  INTO v_overall_accuracy
  FROM public.test_attempt_answers taa
  JOIN public.test_attempts ta ON ta.id = taa.attempt_id
  WHERE ta.user_id = p_user_id
    AND ta.status = 'submitted';

  -- 2. Accuracy by Topic
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_accuracy_by_topic
  FROM (
    SELECT
      COALESCE(te.topic, 'Uncategorized') AS topic,
      round(
        (sum(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric
         / nullif(count(*)::numeric, 0)) * 100, 1
      ) AS accuracy,
      count(*)::integer AS total_questions
    FROM public.test_attempt_answers taa
    JOIN public.test_attempts ta ON ta.id = taa.attempt_id
    JOIN public.tests te ON te.id = ta.test_id
    WHERE ta.user_id = p_user_id
      AND ta.status = 'submitted'
      AND ta.test_id IS NOT NULL  -- Only include tests with a test_id (not random tests)
    GROUP BY te.topic
    ORDER BY accuracy DESC NULLS LAST
  ) t;

  -- 3. Match Simulation Accuracy %
  SELECT
    CASE
      WHEN count(*) = 0 THEN null
      ELSE round(
        (sum(CASE WHEN va.is_correct THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100, 1
      )
    END
  INTO v_match_sim_accuracy
  FROM public.video_attempts va
  WHERE va.user_id = p_user_id;

  -- 4. Pass Rate %
  SELECT
    CASE
      WHEN count(*) = 0 THEN null
      ELSE round(
        (sum(CASE WHEN ta.score_percent >= 80 THEN 1 ELSE 0 END)::numeric
         / count(*)::numeric) * 100, 1
      )
    END
  INTO v_pass_rate
  FROM public.test_attempts ta
  WHERE ta.user_id = p_user_id
    AND ta.status = 'submitted';

  -- =============================================
  -- PROGRESS SECTION
  -- =============================================

  -- 5. Accuracy this week
  SELECT
    CASE
      WHEN count(*) = 0 THEN null
      ELSE round(
        (sum(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100, 1
      )
    END
  INTO v_accuracy_this_week
  FROM public.test_attempt_answers taa
  JOIN public.test_attempts ta ON ta.id = taa.attempt_id
  WHERE ta.user_id = p_user_id
    AND ta.status = 'submitted'
    AND ta.submitted_at >= date_trunc('week', current_date);

  -- 6. Accuracy last week
  SELECT
    CASE
      WHEN count(*) = 0 THEN null
      ELSE round(
        (sum(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100, 1
      )
    END
  INTO v_accuracy_last_week
  FROM public.test_attempt_answers taa
  JOIN public.test_attempts ta ON ta.id = taa.attempt_id
  WHERE ta.user_id = p_user_id
    AND ta.status = 'submitted'
    AND ta.submitted_at >= date_trunc('week', current_date) - interval '7 days'
    AND ta.submitted_at < date_trunc('week', current_date);

  -- Accuracy change
  IF v_accuracy_this_week IS NOT NULL AND v_accuracy_last_week IS NOT NULL THEN
    v_accuracy_change := round(v_accuracy_this_week - v_accuracy_last_week, 1);
  ELSE
    v_accuracy_change := null;
  END IF;

  -- 7. Total Questions Answered
  SELECT count(*)
  INTO v_total_questions_answered
  FROM public.test_attempt_answers taa
  JOIN public.test_attempts ta ON ta.id = taa.attempt_id
  WHERE ta.user_id = p_user_id
    AND ta.status = 'submitted';

  -- 8. Total Tests Passed
  SELECT count(*)
  INTO v_total_tests_passed
  FROM public.test_attempts ta
  WHERE ta.user_id = p_user_id
    AND ta.status = 'submitted'
    AND ta.score_percent >= 80;

  -- 9. Average Test Duration (NEW)
  -- Average time_elapsed_seconds from all submitted tests with timing data
  SELECT AVG(time_elapsed_seconds)::integer
  INTO v_avg_test_duration
  FROM public.test_attempts
  WHERE user_id = p_user_id
    AND status = 'submitted'
    AND time_elapsed_seconds IS NOT NULL;

  -- 10. Last Test Duration (NEW)
  -- Most recent test's time_elapsed_seconds
  SELECT time_elapsed_seconds::integer
  INTO v_last_test_duration
  FROM public.test_attempts
  WHERE user_id = p_user_id
    AND status = 'submitted'
    AND time_elapsed_seconds IS NOT NULL
  ORDER BY submitted_at DESC
  LIMIT 1;

  -- =============================================
  -- HABITS SECTION
  -- =============================================

  -- 11. Training Calendar
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json)
  INTO v_calendar
  FROM (
    SELECT
      d.day::date AS date,
      EXISTS(
        SELECT 1
        FROM public.user_activity_days uad
        WHERE uad.user_id = p_user_id
          AND uad.activity_date = d.day::date
      ) AS active
    FROM generate_series(
      current_date - interval '29 days',
      current_date,
      interval '1 day'
    ) AS d(day)
  ) t;

  -- 12 & 13. Current Streak and Longest Streak
  WITH activity_with_gaps AS (
    SELECT
      activity_date,
      activity_date - (row_number() OVER (ORDER BY activity_date))::integer AS streak_group
    FROM public.user_activity_days
    WHERE user_id = p_user_id
  ),
  streaks AS (
    SELECT
      streak_group,
      count(*) AS streak_length,
      max(activity_date) AS streak_end
    FROM activity_with_gaps
    GROUP BY streak_group
  )
  SELECT
    COALESCE(
      (SELECT s.streak_length::integer
       FROM streaks s
       WHERE s.streak_end >= current_date - 1
       ORDER BY s.streak_end DESC
       LIMIT 1),
      0
    ),
    COALESCE(
      (SELECT max(s.streak_length)::integer FROM streaks s),
      0
    )
  INTO v_current_streak, v_longest_streak;

  -- 14. Active Days Last 7
  SELECT count(*)::integer
  INTO v_active_days_last_7
  FROM public.user_activity_days
  WHERE user_id = p_user_id
    AND activity_date >= current_date - 6;

  -- =============================================
  -- BUILD RESPONSE
  -- =============================================
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
      'total_tests_passed', v_total_tests_passed,
      'average_test_duration', v_avg_test_duration,     -- NEW
      'last_test_duration', v_last_test_duration        -- NEW
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

-- Refresh grants
REVOKE ALL ON FUNCTION public.get_dashboard_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;
