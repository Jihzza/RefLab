-- Migration: BLOCKER (HIGH) — stop leaking profile PII to every authenticated user
-- ============================================================================
-- 20260213_0019 added a SELECT policy "Authenticated users can read profiles"
-- with `using (auth.role() = 'authenticated')`, letting ANY signed-in user read
-- EVERY column of EVERY profile — including email, role, and last_login_at — via
-- GET /rest/v1/profiles.
--
-- All legitimate cross-user reads need only id/username/name/photo_url, which the
-- public.public_profiles view exposes (20260123_0002), and every cross-user RPC
-- (get_social_feed, get_post_comments, get_post_by_id, get_profile_feed,
-- get_public_profile_view/feed, get_conversations, get_messages,
-- get_or_create_conversation, get_blocked_users, notification triggers) is
-- SECURITY DEFINER, so none of them depend on this broad policy. The only
-- frontend cross-user direct read was the notifications actor embed, which has
-- been switched to public_profiles in the same release.
--
-- Effect after this migration:
--   * profiles SELECT is restricted to self ("Users can read own profile") and
--     admins ("Admins can read all profiles") — both from 20260123_0002.
--   * cross-user identity continues to flow through public_profiles (safe cols)
--     and SECURITY DEFINER RPCs.
--
-- The public_profiles view was created (20260123_0002) with default options, so
-- it runs with definer/owner semantics and keeps reading profiles regardless of
-- the caller's RLS — no change to the view is required.
--
-- NOTE: additive migration — does not edit 20260123_0002 or 20260213_0019. NOT
-- yet applied to a live database; apply and test on a Supabase branch before
-- production. Deploy the frontend (notifications actor -> public_profiles) first
-- so the actor embed never briefly nulls out.
-- ============================================================================

drop policy if exists "Authenticated users can read profiles" on public.profiles;

-- Belt and braces: the anon role should never read the base profiles table.
revoke all on public.profiles from anon;
