-- Migration: profile media storage bucket and RLS policies
-- Adds avatar upload support for authenticated users.

-- ============================================
-- 1. Storage bucket for profile media
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'profile-media',
  'profile-media',
  true,
  5242880, -- 5MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
where not exists (
  select 1 from storage.buckets where id = 'profile-media'
);

-- ============================================
-- 2. Storage policies for profile-media bucket
-- ============================================
drop policy if exists "Authenticated users can upload profile media" on storage.objects;
create policy "Authenticated users can upload profile media"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Anyone can read profile media" on storage.objects;
create policy "Anyone can read profile media"
  on storage.objects for select
  using (bucket_id = 'profile-media');

drop policy if exists "Users can delete own profile media" on storage.objects;
create policy "Users can delete own profile media"
  on storage.objects for delete
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
