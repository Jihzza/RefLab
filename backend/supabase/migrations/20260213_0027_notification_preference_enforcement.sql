-- Migration: enforce notification preferences in create_notification helper
-- Updates the central create_notification() function to check if the user
-- has disabled the given notification type before inserting.

-- ============================================
-- 1. Updated create_notification() with preference check
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
  v_enabled boolean;
begin
  -- Self-notification guard: never notify yourself
  if p_actor_id is not null and p_actor_id = p_user_id then
    return null;
  end if;

  -- Preference check: if user has explicitly disabled this type, skip.
  -- Missing row = enabled (default). Required types (welcome_to_plan,
  -- plan_expiration_reminder, plan_expired, profile_incomplete) are not
  -- in the CHECK constraint, so no preference row can exist for them.
  select np.enabled into v_enabled
  from public.notification_preferences np
  where np.user_id = p_user_id
    and np.notification_type = p_type;

  if v_enabled is not null and v_enabled = false then
    return null;
  end if;

  insert into public.notifications (user_id, actor_id, type, title, message, reference_id)
  values (p_user_id, p_actor_id, p_type, p_title, p_message, p_reference_id)
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- 2. Update streak_track trigger to respect preferences
-- ============================================
create or replace function public.handle_streak_track_notification()
returns trigger as $$
begin
  -- Only fire when status transitions to 'submitted'
  if new.status <> 'submitted' or old.status = 'submitted' then
    return new;
  end if;

  -- Preference check: skip if user disabled streak_track
  if exists (
    select 1 from public.notification_preferences
    where user_id = new.user_id
      and notification_type = 'streak_track'
      and enabled = false
  ) then
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

-- ============================================
-- 3. Update new_content_available trigger to respect preferences
-- ============================================
create or replace function public.handle_new_test_notification()
returns trigger as $$
begin
  if new.is_active <> true then
    return new;
  end if;

  -- Batch insert, skip users who disabled new_content_available
  insert into public.notifications (user_id, type, title, message, reference_id)
  select
    p.id,
    'new_content_available',
    'New Content Available',
    'A new test "' || new.title || '" is now available. Check it out!',
    new.id
  from public.profiles p
  where not exists (
    select 1 from public.notification_preferences np
    where np.user_id = p.id
      and np.notification_type = 'new_content_available'
      and np.enabled = false
  );

  return new;
end;
$$ language plpgsql security definer;
