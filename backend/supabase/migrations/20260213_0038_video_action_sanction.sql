-- ================================================================
-- Video Scenarios: Two-Step Decision (Action + Sanction)
-- ================================================================
-- Changes the video flow from a single "correct_decision" to two
-- separate questions: what ACTION the referee takes, and what
-- SANCTION (card) is applied.
-- ================================================================


-- ============================================
-- STEP 1: UPDATE video_scenarios
-- ============================================

-- Add new columns
ALTER TABLE public.video_scenarios ADD COLUMN correct_action text;
ALTER TABLE public.video_scenarios ADD COLUMN correct_sanction text;

-- Migrate existing data
UPDATE public.video_scenarios
SET correct_action = correct_decision,
    correct_sanction = 'No card';

-- Make NOT NULL and drop old column
ALTER TABLE public.video_scenarios ALTER COLUMN correct_action SET NOT NULL;
ALTER TABLE public.video_scenarios ALTER COLUMN correct_sanction SET NOT NULL;
ALTER TABLE public.video_scenarios DROP COLUMN correct_decision;


-- ============================================
-- STEP 2: UPDATE video_attempts
-- ============================================

-- Add new columns
ALTER TABLE public.video_attempts ADD COLUMN selected_action text;
ALTER TABLE public.video_attempts ADD COLUMN selected_sanction text;
ALTER TABLE public.video_attempts ADD COLUMN action_correct boolean;
ALTER TABLE public.video_attempts ADD COLUMN sanction_correct boolean;

-- Migrate existing data
UPDATE public.video_attempts
SET selected_action = selected_decision,
    selected_sanction = 'Unknown',
    action_correct = is_correct,
    sanction_correct = is_correct;

-- Make NOT NULL and drop old column
ALTER TABLE public.video_attempts ALTER COLUMN selected_action SET NOT NULL;
ALTER TABLE public.video_attempts ALTER COLUMN selected_sanction SET NOT NULL;
ALTER TABLE public.video_attempts ALTER COLUMN action_correct SET NOT NULL;
ALTER TABLE public.video_attempts ALTER COLUMN sanction_correct SET NOT NULL;
ALTER TABLE public.video_attempts DROP COLUMN selected_decision;


-- ============================================
-- STEP 3: UPDATE existing scenario sanctions
-- ============================================
-- Fix the sanctions for the seed scenarios that were migrated as 'No card'

UPDATE public.video_scenarios SET correct_sanction = 'Yellow card (caution)'
WHERE title = 'Penalty Area Challenge';

UPDATE public.video_scenarios SET correct_sanction = 'Red card (sending off)'
WHERE title = 'Last Man Foul';


-- ============================================
-- STEP 4: DEACTIVATE placeholder seed scenarios
-- ============================================
-- These were inserted by 0034 with example.com URLs.
-- After 0037 stripped the prefixes, only filenames remain
-- but the actual video files don't exist in the bucket.

UPDATE public.video_scenarios
SET is_active = false
WHERE video_url IN (
  'penalty-area-challenge.mp4',
  'offside-run.mp4',
  'handball-wall.mp4',
  'last-man-foul.mp4',
  'advantage-goal.mp4',
  'var-offside-goal.mp4'
);


-- ============================================
-- STEP 5: INSERT the first real video
-- ============================================

INSERT INTO public.video_scenarios (title, description, video_url, topic, correct_action, correct_sanction, is_active)
VALUES (
  'Offside Analysis 1',
  'Analyze this offside situation and determine the correct referee decision.',
  'offside-analysis-1.mp4',
  'Offside',
  'Indirect free kick',
  'No card',
  true
);
