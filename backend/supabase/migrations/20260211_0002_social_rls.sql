-- Migration: social RLS policies
-- Row Level Security for all social feature tables

-- ============================================
-- 1. Enable RLS on all tables
-- ============================================
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
alter table public.post_comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.post_reports enable row level security;
alter table public.comment_reports enable row level security;
alter table public.user_reports enable row level security;
alter table public.user_blocks enable row level security;

-- ============================================
-- 2. Posts policies
-- ============================================
-- Blocked-user filtering is done in the RPC function for performance
create policy "Authenticated users can read posts"
  on public.posts for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own posts"
  on public.posts for insert
  with check (user_id = auth.uid());

create policy "Users can update own posts"
  on public.posts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own posts"
  on public.posts for delete
  using (user_id = auth.uid());

create policy "Admins can delete any post"
  on public.posts for delete
  using (public.is_admin());

-- ============================================
-- 3. Post likes policies
-- ============================================
create policy "Authenticated users can read post likes"
  on public.post_likes for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own likes"
  on public.post_likes for insert
  with check (user_id = auth.uid());

create policy "Users can delete own likes"
  on public.post_likes for delete
  using (user_id = auth.uid());

-- ============================================
-- 4. Post saves policies (private bookmarks)
-- ============================================
create policy "Users can read own saves"
  on public.post_saves for select
  using (user_id = auth.uid());

create policy "Users can insert own saves"
  on public.post_saves for insert
  with check (user_id = auth.uid());

create policy "Users can delete own saves"
  on public.post_saves for delete
  using (user_id = auth.uid());

-- ============================================
-- 5. Comments policies
-- ============================================
create policy "Authenticated users can read comments"
  on public.post_comments for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own comments"
  on public.post_comments for insert
  with check (user_id = auth.uid());

create policy "Users can update own comments"
  on public.post_comments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own comments"
  on public.post_comments for delete
  using (user_id = auth.uid());

-- ============================================
-- 6. Comment likes policies
-- ============================================
create policy "Authenticated users can read comment likes"
  on public.comment_likes for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own comment likes"
  on public.comment_likes for insert
  with check (user_id = auth.uid());

create policy "Users can delete own comment likes"
  on public.comment_likes for delete
  using (user_id = auth.uid());

-- ============================================
-- 7. Reports policies (write-only for users, admin-readable)
-- ============================================
create policy "Users can insert post reports"
  on public.post_reports for insert
  with check (reporter_id = auth.uid());

create policy "Admins can read post reports"
  on public.post_reports for select
  using (public.is_admin());

create policy "Users can insert comment reports"
  on public.comment_reports for insert
  with check (reporter_id = auth.uid());

create policy "Admins can read comment reports"
  on public.comment_reports for select
  using (public.is_admin());

create policy "Users can insert user reports"
  on public.user_reports for insert
  with check (reporter_id = auth.uid());

create policy "Admins can read user reports"
  on public.user_reports for select
  using (public.is_admin());

-- ============================================
-- 8. User blocks policies
-- ============================================
create policy "Users can read own blocks"
  on public.user_blocks for select
  using (blocker_id = auth.uid());

create policy "Users can insert own blocks"
  on public.user_blocks for insert
  with check (blocker_id = auth.uid());

create policy "Users can delete own blocks"
  on public.user_blocks for delete
  using (blocker_id = auth.uid());

-- ============================================
-- 9. Storage policies for post-media bucket
-- ============================================
create policy "Authenticated users can upload post media"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can read post media"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "Users can delete own post media"
  on storage.objects for delete
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
