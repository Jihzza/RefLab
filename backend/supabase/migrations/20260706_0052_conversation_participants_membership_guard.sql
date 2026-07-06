-- Migration: BLOCKER (HIGH) — conversation_participants join-any-conversation hole
-- ============================================================================
-- The INSERT policy "Users can insert own conversation participants"
-- (20260212_0007) only checks `user_id = auth.uid()` — it never verifies the
-- caller actually belongs to the referenced conversation. A user who obtains a
-- conversation UUID could insert themselves as a participant, then read the full
-- history and inject messages into two strangers' DM thread (the messages
-- SELECT/INSERT policies grant access to any participant row).
--
-- Fix: require the conversation to be one the caller is part of. The normal flow
-- creates conversations via the SECURITY DEFINER get_or_create_conversation RPC,
-- which is unaffected; this only tightens the directly-reachable RLS path.
--
-- The EXISTS subquery reads public.conversations, whose own SELECT policy already
-- restricts rows to `auth.uid() in (user_a_id, user_b_id)`, so it is consistent
-- and non-recursive.
--
-- NOTE: additive migration — does not edit 20260212_0007. NOT yet applied to a
-- live database; apply and test on a Supabase branch before production.
-- ============================================================================

drop policy if exists "Users can insert own conversation participants"
  on public.conversation_participants;

create policy "Users can insert own conversation participants"
  on public.conversation_participants for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
  );
