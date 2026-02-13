-- Migration: allow authenticated users to read any profile
-- The existing "Users can read own profile" policy only allows reading
-- your own profile, which breaks PostgREST joins (e.g. notification actor,
-- post author, comment author, follower lists, etc.).
-- This adds a broader SELECT policy so authenticated users can read any profile.

create policy "Authenticated users can read profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');
