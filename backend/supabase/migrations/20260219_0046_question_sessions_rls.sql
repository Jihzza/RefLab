-- Migration: RLS policies for question_sessions
-- Created: 2026-02-19
-- Description: Enables row-level security on question_sessions table and
--              adds an activity day trigger when a session is started.

-- ============================================================
-- RLS for question_sessions
-- ============================================================

ALTER TABLE public.question_sessions ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist (safe to re-run)
DROP POLICY IF EXISTS "question_sessions_select_own" ON public.question_sessions;
DROP POLICY IF EXISTS "question_sessions_insert_own" ON public.question_sessions;
DROP POLICY IF EXISTS "question_sessions_update_own" ON public.question_sessions;

-- Users may only read their own sessions
CREATE POLICY "question_sessions_select_own"
  ON public.question_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users may only insert sessions for themselves
CREATE POLICY "question_sessions_insert_own"
  ON public.question_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users may only update their own sessions (needed to write ended_at, duration, totals on session end)
CREATE POLICY "question_sessions_update_own"
  ON public.question_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Activity day trigger for question sessions
-- ============================================================
-- Fires when a session row is inserted (session start = user activity for that day).

CREATE OR REPLACE FUNCTION public.handle_activity_day_on_session_start()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_activity_days (user_id, activity_date)
  VALUES (NEW.user_id, current_date)
  ON CONFLICT (user_id, activity_date) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_question_session_activity_day ON public.question_sessions;

CREATE TRIGGER on_question_session_activity_day
  AFTER INSERT ON public.question_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_activity_day_on_session_start();
