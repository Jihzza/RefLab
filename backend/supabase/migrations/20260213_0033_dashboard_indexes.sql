-- 20260213_0033_dashboard_indexes.sql
-- Performance indexes for dashboard RPC queries

-- Submitted attempts by user with submitted_at for week-based filtering
create index if not exists idx_test_attempts_user_submitted
  on public.test_attempts(user_id, submitted_at)
  where status = 'submitted';

-- Attempt answers for accuracy count queries (index-only scan)
create index if not exists idx_test_attempt_answers_correct
  on public.test_attempt_answers(attempt_id, is_correct);

-- Video attempts by user for match simulation accuracy
create index if not exists idx_video_attempts_user_correct
  on public.video_attempts(user_id, is_correct);
