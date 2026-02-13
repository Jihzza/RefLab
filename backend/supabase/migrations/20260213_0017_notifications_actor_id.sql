-- Migration: Add actor_id to notifications table
-- Allows notifications to reference the user who triggered the notification
-- (e.g., the user who liked a post, commented, followed, etc.)
-- System-generated notifications (streak, plan, welcome) will have actor_id = NULL.

-- ============================================
-- 1. Add actor_id column (nullable for system notifications)
-- ============================================
alter table public.notifications
  add column actor_id uuid
  constraint notifications_actor_id_fkey
  references public.profiles(id)
  on delete set null;

-- ============================================
-- 2. Index for efficient joins on actor_id
-- ============================================
create index notifications_actor_id_idx on public.notifications(actor_id);

-- ============================================
-- 3. Composite index for the primary query pattern:
--    "get all non-dismissed notifications for a user, newest first"
-- ============================================
create index notifications_user_active_idx
  on public.notifications(user_id, created_at desc)
  where dismissed_permanently = false;
