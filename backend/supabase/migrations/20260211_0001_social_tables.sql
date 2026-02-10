-- Migration: social tables
-- Creates all tables for the social media feature: posts, interactions, comments, reports, blocks

-- ============================================
-- 1. Media type enum
-- ============================================
create type post_media_type as enum ('text', 'image', 'video', 'audio');

-- ============================================
-- 2. Posts table
-- ============================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  media_type post_media_type not null default 'text',
  media_url text,
  media_metadata jsonb,

  -- Repost support: SET NULL so the repost survives if original is deleted
  original_post_id uuid references public.posts(id) on delete set null,

  -- Denormalized counts for feed performance (maintained by triggers)
  like_count integer not null default 0,
  comment_count integer not null default 0,
  repost_count integer not null default 0,
  save_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_user_id_idx on public.posts(user_id);
create index posts_created_at_idx on public.posts(created_at desc);
create index posts_media_type_idx on public.posts(media_type);
create index posts_original_post_id_idx on public.posts(original_post_id);

-- Reuse existing updated_at trigger from profiles migration
create trigger on_posts_updated
  before update on public.posts
  for each row execute function public.handle_updated_at();

-- ============================================
-- 3. Post likes table
-- ============================================
create table if not exists public.post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index post_likes_post_id_idx on public.post_likes(post_id);

-- ============================================
-- 4. Post saves (bookmarks) table
-- ============================================
create table if not exists public.post_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index post_saves_post_id_idx on public.post_saves(post_id);

-- ============================================
-- 5. Comments table (supports 2-level nesting)
-- ============================================
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.post_comments(id) on delete cascade,
  content text not null,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index post_comments_post_id_idx on public.post_comments(post_id);
create index post_comments_parent_id_idx on public.post_comments(parent_comment_id);
create index post_comments_user_id_idx on public.post_comments(user_id);

create trigger on_post_comments_updated
  before update on public.post_comments
  for each row execute function public.handle_updated_at();

-- ============================================
-- 6. Comment likes table
-- ============================================
create table if not exists public.comment_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create index comment_likes_comment_id_idx on public.comment_likes(comment_id);

-- ============================================
-- 7. Post reports
-- ============================================
create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index post_reports_post_id_idx on public.post_reports(post_id);

-- ============================================
-- 8. Comment reports
-- ============================================
create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

-- ============================================
-- 9. User reports
-- ============================================
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

-- ============================================
-- 10. User blocks
-- ============================================
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create index user_blocks_blocker_id_idx on public.user_blocks(blocker_id);
create index user_blocks_blocked_id_idx on public.user_blocks(blocked_id);

-- ============================================
-- 11. Storage bucket for post media
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  52428800, -- 50MB
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'
  ]
);
