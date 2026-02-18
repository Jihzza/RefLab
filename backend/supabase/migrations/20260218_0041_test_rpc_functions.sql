-- Migration: Add RPC functions for random test generation and topic analysis
-- Created: 2026-02-18
-- Description: Creates get_random_questions() and get_attempt_topic_breakdown()
--              functions to support the new random test format

-- ============================================================
-- Function 1: Generate 20 random questions from active tests
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_random_questions()
RETURNS SETOF public.test_questions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT tq.*
  FROM public.test_questions tq
  WHERE tq.test_id IN (
    SELECT id FROM public.tests WHERE is_active = true
  )
  ORDER BY random()
  LIMIT 20;
END;
$$;

COMMENT ON FUNCTION public.get_random_questions() IS
  'Generates 20 random questions from all active tests for random test format';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_random_questions() TO authenticated;

-- ============================================================
-- Function 2: Analyze topic performance for a test attempt
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
      tq.topic,
      ROUND((SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 1) as accuracy,
      SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::integer as correct,
      COUNT(*)::integer as total
    FROM public.test_attempt_answers taa
    JOIN public.test_questions tq ON tq.id = taa.question_id
    WHERE taa.attempt_id = p_attempt_id
      AND tq.topic IS NOT NULL
    GROUP BY tq.topic
    HAVING COUNT(*) >= 2
      AND (SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) >= 0.75
    ORDER BY accuracy DESC
  ) t;

  -- Weak topics (< 50% accuracy)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_weak
  FROM (
    SELECT
      tq.topic,
      ROUND((SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 1) as accuracy,
      SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::integer as correct,
      COUNT(*)::integer as total
    FROM public.test_attempt_answers taa
    JOIN public.test_questions tq ON tq.id = taa.question_id
    WHERE taa.attempt_id = p_attempt_id
      AND tq.topic IS NOT NULL
    GROUP BY tq.topic
    HAVING (SUM(CASE WHEN taa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) < 0.50
    ORDER BY accuracy ASC
  ) t;

  RETURN json_build_object('strong', v_strong, 'weak', v_weak);
END;
$$;

COMMENT ON FUNCTION public.get_attempt_topic_breakdown(UUID) IS
  'Analyzes topic performance for a test attempt, returning strong (>=75%) and weak (<50%) topics';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_attempt_topic_breakdown(UUID) TO authenticated;
