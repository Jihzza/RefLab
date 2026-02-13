-- Migration: notification triggers
-- Creates trigger functions that automatically generate notifications
-- for social interactions, learning streaks, subscriptions, and new content.
-- All functions use SECURITY DEFINER to bypass RLS on the notifications table.

-- ============================================
-- 0. Reusable helper: create_notification()
-- ============================================
-- Centralizes the INSERT into notifications with a self-notification guard.
-- If p_actor_id = p_user_id the call is silently skipped (no self-notifications).
-- Returns the new notification id, or NULL if skipped.
create or replace function public.create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_message text
)
returns uuid as $$
declare
  v_id uuid;
begin
  -- Self-notification guard: never notify yourself
  if p_actor_id is not null and p_actor_id = p_user_id then
    return null;
  end if;

  insert into public.notifications (user_id, actor_id, type, title, message)
  values (p_user_id, p_actor_id, p_type, p_title, p_message)
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer;


-- ============================================
-- 1. post_likes -> liked_post
-- ============================================
create or replace function public.handle_post_like_notification()
returns trigger as $$
declare
  v_post_author_id uuid;
begin
  -- Look up the post author
  select user_id into v_post_author_id
  from public.posts
  where id = new.post_id;

  -- Post may have been deleted between the like and trigger execution
  if v_post_author_id is null then
    return new;
  end if;

  perform public.create_notification(
    v_post_author_id,       -- recipient: post author
    new.user_id,            -- actor: the liker
    'liked_post',
    'New Like',
    'liked your post'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_post_like_notification
  after insert on public.post_likes
  for each row execute function public.handle_post_like_notification();


-- ============================================
-- 2. post_comments -> comment_on_post / reply_to_comment / mentioned_in_comment
-- ============================================
-- Single trigger function handles three notification types:
-- A) Top-level comment → notify post author (comment_on_post)
-- B) Reply → notify parent comment author (reply_to_comment)
-- C) @mentions → notify each mentioned user (mentioned_in_comment)
create or replace function public.handle_post_comment_notification()
returns trigger as $$
declare
  v_post_author_id uuid;
  v_parent_author_id uuid;
  v_primary_recipient_id uuid;
  v_mention text;
  v_mentioned_user_id uuid;
begin
  -- ---- A) Comment or Reply notification ----

  if new.parent_comment_id is null then
    -- Top-level comment: notify post author
    select user_id into v_post_author_id
    from public.posts
    where id = new.post_id;

    if v_post_author_id is not null then
      perform public.create_notification(
        v_post_author_id,
        new.user_id,
        'comment_on_post',
        'New Comment',
        'commented on your post'
      );
    end if;

    v_primary_recipient_id := v_post_author_id;
  else
    -- Reply: notify parent comment author
    select user_id into v_parent_author_id
    from public.post_comments
    where id = new.parent_comment_id;

    if v_parent_author_id is not null then
      perform public.create_notification(
        v_parent_author_id,
        new.user_id,
        'reply_to_comment',
        'New Reply',
        'replied to your comment'
      );
    end if;

    v_primary_recipient_id := v_parent_author_id;
  end if;

  -- ---- B) @mention notifications ----
  -- Parse all @username patterns from the comment content.
  -- Username regex matches the frontend pattern: [a-z0-9_.]{3,30}
  -- For each unique match, look up the profile and create a mention notification,
  -- but skip: the commenter themselves, and whoever was already notified above.

  for v_mention in
    select distinct (regexp_matches(new.content, '@([a-z0-9_.]{3,30})', 'gi'))[1]
  loop
    -- Look up the mentioned username (case-insensitive)
    select id into v_mentioned_user_id
    from public.profiles
    where lower(username) = lower(v_mention);

    -- Skip if: user not found, is the commenter, or already notified by comment/reply
    if v_mentioned_user_id is not null
       and v_mentioned_user_id <> new.user_id
       and (v_primary_recipient_id is null or v_mentioned_user_id <> v_primary_recipient_id)
    then
      perform public.create_notification(
        v_mentioned_user_id,
        new.user_id,
        'mentioned_in_comment',
        'New Mention',
        'mentioned you in a comment'
      );
    end if;
  end loop;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_post_comment_notification
  after insert on public.post_comments
  for each row execute function public.handle_post_comment_notification();


-- ============================================
-- 3. posts -> reposted_post (when original_post_id IS NOT NULL)
-- ============================================
-- Coexists with the existing on_post_repost_insert trigger (count maintenance).
create or replace function public.handle_repost_notification()
returns trigger as $$
declare
  v_original_author_id uuid;
begin
  -- Only fire for reposts
  if new.original_post_id is null then
    return new;
  end if;

  -- Look up original post author
  select user_id into v_original_author_id
  from public.posts
  where id = new.original_post_id;

  -- Original post may have been deleted (race condition)
  if v_original_author_id is null then
    return new;
  end if;

  perform public.create_notification(
    v_original_author_id,   -- recipient: original post author
    new.user_id,            -- actor: reposter
    'reposted_post',
    'New Repost',
    'reposted your post'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_repost_notification
  after insert on public.posts
  for each row execute function public.handle_repost_notification();


-- ============================================
-- 4. user_follows -> new_follower
-- ============================================
-- Self-follow already prevented by table constraint user_follows_no_self_follow.
create or replace function public.handle_follow_notification()
returns trigger as $$
begin
  perform public.create_notification(
    new.following_id,       -- recipient: the user being followed
    new.follower_id,        -- actor: the follower
    'new_follower',
    'New Follower',
    'started following you'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_user_follow_notification
  after insert on public.user_follows
  for each row execute function public.handle_follow_notification();


-- ============================================
-- 5. test_attempts -> streak_track (on status change to 'submitted')
-- ============================================
-- Only fires when status transitions to 'submitted'.
-- Dedup: skips if user already has a streak_track notification today.
-- System notification (no actor).
create or replace function public.handle_streak_track_notification()
returns trigger as $$
begin
  -- Only fire when status transitions to 'submitted'
  if new.status <> 'submitted' or old.status = 'submitted' then
    return new;
  end if;

  -- Dedup: skip if user already has a streak_track notification today
  if exists (
    select 1
    from public.notifications
    where user_id = new.user_id
      and type = 'streak_track'
      and created_at >= date_trunc('day', now())
  ) then
    return new;
  end if;

  -- System notification (no actor)
  insert into public.notifications (user_id, type, title, message)
  values (
    new.user_id,
    'streak_track',
    'Learning Streak',
    'You completed a learning activity today. Keep it up!'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_test_submitted_streak_notification
  after update on public.test_attempts
  for each row execute function public.handle_streak_track_notification();


-- ============================================
-- 6a. stripe_subscriptions INSERT -> welcome_to_plan
-- ============================================
-- Stripe webhook uses .upsert() with onConflict, so INSERT trigger
-- only fires for genuinely new subscriptions (first-time creation).
create or replace function public.handle_subscription_welcome_notification()
returns trigger as $$
declare
  v_plan_display text;
begin
  v_plan_display := initcap(new.plan);

  insert into public.notifications (user_id, type, title, message)
  values (
    new.user_id,
    'welcome_to_plan',
    'Welcome to ' || v_plan_display,
    'Your ' || v_plan_display || ' plan is now active. Enjoy all the premium features!'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_subscription_created_notification
  after insert on public.stripe_subscriptions
  for each row execute function public.handle_subscription_welcome_notification();


-- ============================================
-- 6b. stripe_subscriptions UPDATE -> plan_expired
-- ============================================
-- Only fires when status transitions TO an expired status FROM a non-expired status.
create or replace function public.handle_subscription_expired_notification()
returns trigger as $$
declare
  v_plan_display text;
  v_expired_statuses text[] := array['canceled', 'unpaid', 'incomplete_expired'];
begin
  -- Only fire when status transitions TO an expired status FROM a non-expired status
  if new.status = any(v_expired_statuses)
     and old.status is distinct from new.status
     and not (old.status = any(v_expired_statuses))
  then
    v_plan_display := initcap(new.plan);

    insert into public.notifications (user_id, type, title, message)
    values (
      new.user_id,
      'plan_expired',
      'Plan Expired',
      'Your ' || v_plan_display || ' plan has expired. Renew to keep your premium features.'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_subscription_expired_notification
  after update on public.stripe_subscriptions
  for each row execute function public.handle_subscription_expired_notification();


-- ============================================
-- 7. tests -> new_content_available (batch notification for all users)
-- ============================================
-- Only fires for active tests. Uses a single INSERT ... SELECT
-- to create one notification per user.
create or replace function public.handle_new_test_notification()
returns trigger as $$
begin
  -- Only for active tests
  if new.is_active <> true then
    return new;
  end if;

  -- Batch insert a notification for every user
  insert into public.notifications (user_id, type, title, message)
  select
    p.id,
    'new_content_available',
    'New Content Available',
    'A new test "' || new.title || '" is now available. Check it out!'
  from public.profiles p;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_new_test_notification
  after insert on public.tests
  for each row execute function public.handle_new_test_notification();
