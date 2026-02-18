-- Migration: Add topic column to test_questions table
-- Created: 2026-02-18
-- Description: Adds topic column to test_questions for strong/weak point analysis
--              Populates it from the parent test's topic

-- Add topic column to test_questions
ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS topic TEXT;

-- Populate topic from parent test
UPDATE public.test_questions tq
SET topic = t.topic
FROM public.tests t
WHERE tq.test_id = t.id
  AND tq.topic IS NULL;  -- Only update if not already set

-- Add index for topic queries (used in topic breakdown analysis)
CREATE INDEX IF NOT EXISTS idx_test_questions_topic
  ON public.test_questions(topic)
  WHERE topic IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.test_questions.topic IS 'Topic category inherited from parent test (Offside, Fouls, Handball, etc.)';
