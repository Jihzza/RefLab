-- Migration: Add time tracking fields to test_attempts table
-- Created: 2026-02-18
-- Description: Adds time_limit_seconds, time_elapsed_seconds, and auto_submitted columns
--              to support 40-minute timed tests with auto-submission

-- Add time tracking columns to test_attempts
ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER DEFAULT 2400,  -- 40 minutes
  ADD COLUMN IF NOT EXISTS time_elapsed_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS auto_submitted BOOLEAN DEFAULT FALSE;

-- Create index for dashboard timing queries
CREATE INDEX IF NOT EXISTS idx_test_attempts_timing
  ON public.test_attempts(user_id, time_elapsed_seconds)
  WHERE status = 'submitted' AND time_elapsed_seconds IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.test_attempts.time_limit_seconds IS 'Time limit in seconds (default 2400 = 40 minutes)';
COMMENT ON COLUMN public.test_attempts.time_elapsed_seconds IS 'Actual time taken to complete test in seconds';
COMMENT ON COLUMN public.test_attempts.auto_submitted IS 'True if test was auto-submitted when timer expired';
