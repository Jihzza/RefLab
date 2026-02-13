-- Migration: settings tables for user preferences
-- Creates notification_preferences and user_settings tables

-- ============================================
-- 1. Messaging privacy enum
-- ============================================
create type messaging_privacy as enum ('everyone', 'following', 'mutual', 'nobody');

-- ============================================
-- 2. notification_preferences table
-- ============================================
-- Sparse design: missing rows mean "enabled" (default).
-- Only rows where the user explicitly changes a preference are stored.
create table if not exists public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_type)
);

-- Constrain notification_type to known toggleable types
alter table public.notification_preferences
  add constraint notification_preferences_valid_type check (
    notification_type in (
      'liked_post',
      'comment_on_post',
      'reply_to_comment',
      'mentioned_in_comment',
      'reposted_post',
      'new_follower',
      'new_message',
      'streak_track',
      'streak_reminder',
      'streak_loss',
      'new_content_available'
    )
  );

create index notification_preferences_user_id_idx
  on public.notification_preferences(user_id);

create trigger on_notification_preferences_updated
  before update on public.notification_preferences
  for each row execute function public.handle_updated_at();

-- ============================================
-- 3. user_settings table
-- ============================================
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  messaging_privacy messaging_privacy not null default 'everyone',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger on_user_settings_updated
  before update on public.user_settings
  for each row execute function public.handle_updated_at();

-- ============================================
-- 4. Auto-create user_settings on signup
-- ============================================
-- Extend handle_new_user to also create a user_settings row.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, public.generate_username());

  -- Create default user_settings row
  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

-- ============================================
-- 5. Backfill user_settings for existing users
-- ============================================
insert into public.user_settings (user_id)
select p.id from public.profiles p
where not exists (
  select 1 from public.user_settings us where us.user_id = p.id
);
