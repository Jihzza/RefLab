-- Migration: update notification triggers to populate reference_id
-- Replaces functions from 0018 to include the related entity ID.

-- ============================================
-- 0. Updated helper: create_notification()
-- ============================================
create or replace function public.create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_reference_id uuid default null
)
returns uuid as $$
declare
  v_id uuid;
begin
  -- Self-notification guard: never notify yourself
  if p_actor_id is not null and p_actor_id = p_user_id then
    return null;
  end if;

  insert into public.notifications (user_id, actor_id, type, title, message, reference_id)
  values (p_user_id, p_actor_id, p_type, p_title, p_message, p_reference_id)
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer;


-- ============================================
-- 1. post_likes -> liked_post (with post reference)
-- ============================================
create or replace function public.handle_post_like_notification()
returns trigger as $$
declare
  v_post_author_id uuid;
begin
  select user_id into v_post_author_id
  from public.posts
  where id = new.post_id;

  if v_post_author_id is null then
    return new;
  end if;

  perform public.create_notification(
    v_post_author_id,
    new.user_id,
    'liked_post',
    'New Like',
    'liked your post',
    new.post_id              -- reference: the liked post
  );

  return new;
end;
$$ language plpgsql security definer;


-- ============================================
-- 2. post_comments -> comment/reply/mention (with post reference)
-- ============================================
create or replace function public.handle_post_comment_notification()
returns trigger as $$
declare
  v_post_author_id uuid;
  v_parent_author_id uuid;
  v_primary_recipient_id uuid;
  v_mention text;
  v_mentioned_user_id uuid;
begin
  if new.parent_comment_id is null then
    select user_id into v_post_author_id
    from public.posts
    where id = new.post_id;

    if v_post_author_id is not null then
      perform public.create_notification(
        v_post_author_id,
        new.user_id,
        'comment_on_post',
        'New Comment',
        'commented on your post',
        new.post_id            -- reference: the commented post
      );
    end if;

    v_primary_recipient_id := v_post_author_id;
  else
    select user_id into v_parent_author_id
    from public.post_comments
    where id = new.parent_comment_id;

    if v_parent_author_id is not null then
      perform public.create_notification(
        v_parent_author_id,
        new.user_id,
        'reply_to_comment',
        'New Reply',
        'replied to your comment',
        new.post_id            -- reference: the post containing the reply
      );
    end if;

    v_primary_recipient_id := v_parent_author_id;
  end if;

  -- @mention notifications
  for v_mention in
    select distinct (regexp_matches(new.content, '@([a-z0-9_.]{3,30})', 'gi'))[1]
  loop
    select id into v_mentioned_user_id
    from public.profiles
    where lower(username) = lower(v_mention);

    if v_mentioned_user_id is not null
       and v_mentioned_user_id <> new.user_id
       and (v_primary_recipient_id is null or v_mentioned_user_id <> v_primary_recipient_id)
    then
      perform public.create_notification(
        v_mentioned_user_id,
        new.user_id,
        'mentioned_in_comment',
        'New Mention',
        'mentioned you in a comment',
        new.post_id            -- reference: the post containing the mention
      );
    end if;
  end loop;

  return new;
end;
$$ language plpgsql security definer;


-- ============================================
-- 3. posts -> reposted_post (with original post reference)
-- ============================================
create or replace function public.handle_repost_notification()
returns trigger as $$
declare
  v_original_author_id uuid;
begin
  if new.original_post_id is null then
    return new;
  end if;

  select user_id into v_original_author_id
  from public.posts
  where id = new.original_post_id;

  if v_original_author_id is null then
    return new;
  end if;

  perform public.create_notification(
    v_original_author_id,
    new.user_id,
    'reposted_post',
    'New Repost',
    'reposted your post',
    new.original_post_id     -- reference: the original post
  );

  return new;
end;
$$ language plpgsql security definer;


-- ============================================
-- 4. user_follows -> new_follower (no reference needed, actor IS the reference)
-- ============================================
-- No change needed — actor_id is the follower's profile, which is the destination.


-- ============================================
-- 5. test_attempts -> streak_track (no reference)
-- ============================================
-- No change needed — system notification, navigates to dashboard.


-- ============================================
-- 6a. stripe_subscriptions INSERT -> welcome_to_plan (no reference)
-- ============================================
-- No change needed — system notification, navigates to billing.


-- ============================================
-- 6b. stripe_subscriptions UPDATE -> plan_expired (no reference)
-- ============================================
-- No change needed — system notification, navigates to billing.


-- ============================================
-- 7. tests -> new_content_available (with test reference)
-- ============================================
create or replace function public.handle_new_test_notification()
returns trigger as $$
begin
  if new.is_active <> true then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, message, reference_id)
  select
    p.id,
    'new_content_available',
    'New Content Available',
    'A new test "' || new.title || '" is now available. Check it out!',
    new.id                   -- reference: the new test
  from public.profiles p;

  return new;
end;
$$ language plpgsql security definer;
