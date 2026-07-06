-- Migration: BLOCKER (HIGH) — private DM attachments are world-readable
-- ============================================================================
-- The message-media bucket is created PUBLIC (20260212_0006) and the storage
-- SELECT policy is world-readable ("Anyone can read message media",
-- 20260212_0007). Because the bucket is public, any /storage/v1/object/public/
-- URL bypasses RLS entirely — private DM images/video/audio are readable by
-- anyone who has (or guesses) the URL, with no auth.
--
-- Fix:
--   1. Flip the bucket private (kills the public URL path).
--   2. Replace the world-read policy with one scoped to conversation
--      participants. Objects are stored at `<sender_uuid>/<uuid>.<ext>`; the
--      uploader can always read their own objects (covers the upload->insert
--      window and orphaned uploads), and the other participant can read once a
--      message row references the object.
--   3. The frontend switches from getPublicUrl to createSignedUrl (shipped in
--      the same release; signed URLs work on public buckets too, so the frontend
--      change is backward-compatible and can deploy first).
--
-- The `<sender_uuid>/<uuid>` path layout is intentionally preserved: a
-- conversation-scoped policy on the path would strand every existing object,
-- whereas matching the stored message row works for old and new objects alike.
--
-- NOTE: additive migration — does not edit 20260212_0006/0007. NOT yet applied to
-- a live database; apply and test on a Supabase branch before production.
-- ============================================================================

-- 1. Make the bucket private.
update storage.buckets set public = false where id = 'message-media';

-- 2. Participation check. SECURITY DEFINER so the storage policy does not
--    recursively evaluate RLS on messages/conversation_participants and stays
--    fast; it only ever returns a boolean scoped to the calling user.
create or replace function public.can_access_message_media(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    join public.conversation_participants cp
      on cp.conversation_id = m.conversation_id
    where m.media_url = p_object_name
      and cp.user_id = auth.uid()
  );
$$;

revoke all on function public.can_access_message_media(text) from public, anon;
grant execute on function public.can_access_message_media(text) to authenticated;

-- Supporting index so the helper's lookup is not a seq scan on messages.
create index if not exists messages_media_url_idx
  on public.messages (media_url)
  where media_url is not null;

-- 3. Replace world-read with participant-scoped read.
drop policy if exists "Anyone can read message media" on storage.objects;
create policy "Participants can read message media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_access_message_media(name)
    )
  );

-- 4. Defensive normalization: the app always stored bare storage paths, but if
--    any row ever captured a full public/signed URL, strip it back to the path
--    so the participant policy can match it. Expected no-op.
update public.messages
set media_url = regexp_replace(
      media_url,
      '^https?://[^/]+/storage/v1/object/(?:public|sign)/message-media/',
      ''
    )
where media_url ~ '^https?://[^/]+/storage/v1/object/(?:public|sign)/message-media/';
