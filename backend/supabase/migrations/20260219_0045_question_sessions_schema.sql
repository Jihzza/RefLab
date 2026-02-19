-- Migration: Question sessions schema
-- Created: 2026-02-19
-- Description: Adds law column to test_questions, creates question_sessions table,
--              and adds session_id FK to question_practice_answers.

-- ============================================================
-- STEP 1: Add law column to test_questions
-- ============================================================

ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS law smallint
  CHECK (law IS NULL OR (law >= 1 AND law <= 17));

COMMENT ON COLUMN public.test_questions.law IS
  'FIFA Law of the Game number (1-17). Used for By Law filtering in practice mode.';

CREATE INDEX IF NOT EXISTS idx_test_questions_law
  ON public.test_questions(law)
  WHERE law IS NOT NULL;

-- ============================================================
-- STEP 2: Backfill law values from existing topic field
-- ============================================================
-- Maps the existing short topic strings (inherited from tests.topic) to FIFA law numbers.

UPDATE public.test_questions
SET law = CASE topic
  WHEN 'Offside'     THEN 11   -- Law 11: Offside
  WHEN 'Fouls'       THEN 12   -- Law 12: Fouls and Misconduct
  WHEN 'Handball'    THEN 12   -- Law 12: Fouls and Misconduct (handball is a sub-topic)
  WHEN 'Advantage'   THEN 12   -- Law 12: includes the advantage clause
  WHEN 'Cards'       THEN 12   -- Law 12: disciplinary sanctions
  WHEN 'Penalties'   THEN 14   -- Law 14: The Penalty Kick
  WHEN 'Free Kicks'  THEN 13   -- Law 13: Free Kicks
  -- 'VAR' and 'General' intentionally left NULL (multi-law or no single law)
  ELSE NULL
END
WHERE law IS NULL;

-- ============================================================
-- STEP 3: Create question_sessions table
-- ============================================================
-- One row per user-initiated practice session in the Questions tab.

CREATE TABLE IF NOT EXISTS public.question_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode             text        NOT NULL CHECK (mode IN ('quick', 'by_law', 'by_area')),
  -- Filter state saved at creation (for session history display)
  filter_laws      smallint[]  NULL,         -- e.g. {11, 12} — null for quick mode
  filter_areas     text[]      NULL,         -- e.g. {'Fouls', 'Handball'} — null for quick/law mode
  -- Timing
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz NULL,         -- NULL while session is still active
  duration_seconds int         NULL,         -- Computed on session end
  -- Score totals (written on session end)
  total_answered   int         NOT NULL DEFAULT 0,
  total_correct    int         NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_sessions_user
  ON public.question_sessions(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_question_sessions_user_ended
  ON public.question_sessions(user_id, ended_at)
  WHERE ended_at IS NOT NULL;

COMMENT ON TABLE public.question_sessions IS
  'Tracks user practice sessions in the Questions tab. One row per session.';

-- ============================================================
-- STEP 4: Add session_id FK to question_practice_answers
-- ============================================================
-- Links each answer to the session it was answered in.
-- Nullable so legacy answers (pre-migration) remain valid.

ALTER TABLE public.question_practice_answers
  ADD COLUMN IF NOT EXISTS session_id uuid
  REFERENCES public.question_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_practice_answers_session
  ON public.question_practice_answers(session_id)
  WHERE session_id IS NOT NULL;

COMMENT ON COLUMN public.question_practice_answers.session_id IS
  'FK to question_sessions. NULL for legacy answers saved before sessions were introduced.';
