-- Migration: Make test_id nullable in test_attempts
-- Created: 2026-02-18
-- Description: Allows test_id to be null for random tests that don't belong to a specific test

-- Make test_id nullable (for random tests)
ALTER TABLE public.test_attempts
  ALTER COLUMN test_id DROP NOT NULL;

-- Add comment to clarify
COMMENT ON COLUMN public.test_attempts.test_id IS 'Foreign key to tests table. NULL for random tests that pull questions from multiple tests.';
