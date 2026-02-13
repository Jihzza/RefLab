-- Migration: settings RPC functions
-- RPCs for fetching all settings, blocked users list, and clearing learning history

-- ============================================
-- 1. get_user_settings_all
-- ============================================
-- Returns all settings for a user in a single call:
-- user_settings, notification_preferences (complete map with defaults),
-- and profile fields needed by the settings page.
create or replace function public.get_user_settings_all(
  p_user_id uuid
)
returns json as $$
declare
  v_result json;
  v_settings json;
  v_preferences json;
begin
  -- Authorization check
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Fetch user_settings
  select row_to_json(s) into v_settings
  from (
    select
      us.messaging_privacy
    from public.user_settings us
    where us.user_id = p_user_id
  ) s;

  -- If no settings row exists, return defaults
  if v_settings is null then
    v_settings := json_build_object(
      'messaging_privacy', 'everyone'
    );
  end if;

  -- Build complete notification preferences map (missing = enabled)
  select json_object_agg(t.notification_type, coalesce(np.enabled, true))
  into v_preferences
  from (
    values
      ('liked_post'), ('comment_on_post'), ('reply_to_comment'),
      ('mentioned_in_comment'), ('reposted_post'), ('new_follower'),
      ('new_message'), ('streak_track'), ('streak_reminder'),
      ('streak_loss'), ('new_content_available')
  ) as t(notification_type)
  left join public.notification_preferences np
    on np.user_id = p_user_id
    and np.notification_type = t.notification_type;

  -- Combine into single response
  v_result := json_build_object(
    'settings', v_settings,
    'notification_preferences', v_preferences
  );

  return v_result;
end;
$$ language plpgsql security definer stable set search_path = public;

-- ============================================
-- 2. get_blocked_users
-- ============================================
-- Returns list of users blocked by the calling user, with profile info.
create or replace function public.get_blocked_users(
  p_user_id uuid
)
returns json as $$
declare
  v_result json;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select json_agg(row_to_json(t)) into v_result
  from (
    select
      pr.id,
      pr.username,
      pr.name,
      pr.photo_url,
      ub.created_at as blocked_at
    from public.user_blocks ub
    join public.profiles pr on pr.id = ub.blocked_id
    where ub.blocker_id = p_user_id
    order by ub.created_at desc
  ) t;

  return coalesce(v_result, '[]'::json);
end;
$$ language plpgsql security definer stable set search_path = public;

-- ============================================
-- 3. clear_learning_history
-- ============================================
-- Deletes all test attempts and their answers for the calling user.
-- Answers cascade via FK on test_attempt_answers.attempt_id.
create or replace function public.clear_learning_history(
  p_user_id uuid
)
returns json as $$
declare
  v_deleted_attempts integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Delete all test attempts (answers cascade automatically)
  delete from public.test_attempts
  where user_id = p_user_id;

  get diagnostics v_deleted_attempts = row_count;

  -- Delete streak-related notifications for a clean slate
  delete from public.notifications
  where user_id = p_user_id
    and type in ('streak_track', 'streak_reminder', 'streak_loss');

  return json_build_object(
    'success', true,
    'deleted_attempts', v_deleted_attempts
  );
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================
-- 4. Grants
-- ============================================
revoke all on function public.get_user_settings_all(uuid) from public;
revoke all on function public.get_blocked_users(uuid) from public;
revoke all on function public.clear_learning_history(uuid) from public;

grant execute on function public.get_user_settings_all(uuid) to authenticated;
grant execute on function public.get_blocked_users(uuid) to authenticated;
grant execute on function public.clear_learning_history(uuid) to authenticated;
