-- 20260213_0032_dashboard_rpc.sql
-- Single RPC that returns all dashboard metrics in one call.
-- Returns JSON with three sections: performance, progress, habits.

create or replace function public.get_dashboard_stats(
  p_user_id uuid
)
returns json as $$
declare
  -- Performance
  v_overall_accuracy numeric;
  v_accuracy_by_topic json;
  v_match_sim_accuracy numeric;
  v_pass_rate numeric;
  -- Progress
  v_accuracy_this_week numeric;
  v_accuracy_last_week numeric;
  v_accuracy_change numeric;
  v_total_questions_answered bigint;
  v_total_tests_passed bigint;
  -- Habits
  v_calendar json;
  v_current_streak integer;
  v_longest_streak integer;
  v_active_days_last_7 integer;
begin
  -- =============================================
  -- Authorization
  -- =============================================
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- =============================================
  -- PERFORMANCE SECTION
  -- =============================================

  -- 1. Overall Accuracy %
  -- total correct answers / total answers * 100 (submitted attempts only)
  select
    case
      when count(*) = 0 then null
      else round(
        (sum(case when taa.is_correct then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1
      )
    end
  into v_overall_accuracy
  from public.test_attempt_answers taa
  join public.test_attempts ta on ta.id = taa.attempt_id
  where ta.user_id = p_user_id
    and ta.status = 'submitted';

  -- 2. Accuracy by Topic
  -- Groups by tests.topic, returns array of {topic, accuracy, total_questions}
  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  into v_accuracy_by_topic
  from (
    select
      coalesce(te.topic, 'Uncategorized') as topic,
      round(
        (sum(case when taa.is_correct then 1 else 0 end)::numeric
         / nullif(count(*)::numeric, 0)) * 100, 1
      ) as accuracy,
      count(*)::integer as total_questions
    from public.test_attempt_answers taa
    join public.test_attempts ta on ta.id = taa.attempt_id
    join public.tests te on te.id = ta.test_id
    where ta.user_id = p_user_id
      and ta.status = 'submitted'
    group by te.topic
    order by accuracy desc nulls last
  ) t;

  -- 3. Match Simulation Accuracy %
  -- correct video decisions / total video decisions * 100
  select
    case
      when count(*) = 0 then null
      else round(
        (sum(case when va.is_correct then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1
      )
    end
  into v_match_sim_accuracy
  from public.video_attempts va
  where va.user_id = p_user_id;

  -- 4. Pass Rate %
  -- tests with score_percent >= 80 / total completed tests * 100
  select
    case
      when count(*) = 0 then null
      else round(
        (sum(case when ta.score_percent >= 80 then 1 else 0 end)::numeric
         / count(*)::numeric) * 100, 1
      )
    end
  into v_pass_rate
  from public.test_attempts ta
  where ta.user_id = p_user_id
    and ta.status = 'submitted';

  -- =============================================
  -- PROGRESS SECTION
  -- =============================================

  -- 5. Accuracy this week (from Monday of current week)
  select
    case
      when count(*) = 0 then null
      else round(
        (sum(case when taa.is_correct then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1
      )
    end
  into v_accuracy_this_week
  from public.test_attempt_answers taa
  join public.test_attempts ta on ta.id = taa.attempt_id
  where ta.user_id = p_user_id
    and ta.status = 'submitted'
    and ta.submitted_at >= date_trunc('week', current_date);

  -- 6. Accuracy last week (previous Monday to Sunday)
  select
    case
      when count(*) = 0 then null
      else round(
        (sum(case when taa.is_correct then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1
      )
    end
  into v_accuracy_last_week
  from public.test_attempt_answers taa
  join public.test_attempts ta on ta.id = taa.attempt_id
  where ta.user_id = p_user_id
    and ta.status = 'submitted'
    and ta.submitted_at >= date_trunc('week', current_date) - interval '7 days'
    and ta.submitted_at < date_trunc('week', current_date);

  -- Accuracy change = this week - last week (null if either is null)
  if v_accuracy_this_week is not null and v_accuracy_last_week is not null then
    v_accuracy_change := round(v_accuracy_this_week - v_accuracy_last_week, 1);
  else
    v_accuracy_change := null;
  end if;

  -- 7. Total Questions Answered (lifetime, submitted attempts only)
  select count(*)
  into v_total_questions_answered
  from public.test_attempt_answers taa
  join public.test_attempts ta on ta.id = taa.attempt_id
  where ta.user_id = p_user_id
    and ta.status = 'submitted';

  -- 8. Total Tests Passed (score_percent >= 80)
  select count(*)
  into v_total_tests_passed
  from public.test_attempts ta
  where ta.user_id = p_user_id
    and ta.status = 'submitted'
    and ta.score_percent >= 80;

  -- =============================================
  -- HABITS SECTION
  -- =============================================

  -- 9. Training Calendar: 30-day grid
  -- Returns array of {date, active} for last 30 days (today inclusive)
  select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json)
  into v_calendar
  from (
    select
      d.day::date as date,
      exists(
        select 1
        from public.user_activity_days uad
        where uad.user_id = p_user_id
          and uad.activity_date = d.day::date
      ) as active
    from generate_series(
      current_date - interval '29 days',
      current_date,
      interval '1 day'
    ) as d(day)
  ) t;

  -- 10 & 11. Current Streak and Longest Streak
  -- Uses gaps-and-islands pattern with row_number to group consecutive dates
  with activity_with_gaps as (
    select
      activity_date,
      activity_date - (row_number() over (order by activity_date))::integer as streak_group
    from public.user_activity_days
    where user_id = p_user_id
  ),
  streaks as (
    select
      streak_group,
      count(*) as streak_length,
      max(activity_date) as streak_end
    from activity_with_gaps
    group by streak_group
  )
  select
    -- Current streak: the streak that includes today or yesterday
    coalesce(
      (select s.streak_length::integer
       from streaks s
       where s.streak_end >= current_date - 1
       order by s.streak_end desc
       limit 1),
      0
    ),
    -- Longest streak: historical max
    coalesce(
      (select max(s.streak_length)::integer from streaks s),
      0
    )
  into v_current_streak, v_longest_streak;

  -- 12. Active Days Last 7 (today inclusive)
  select count(*)::integer
  into v_active_days_last_7
  from public.user_activity_days
  where user_id = p_user_id
    and activity_date >= current_date - 6;

  -- =============================================
  -- BUILD RESPONSE
  -- =============================================
  return json_build_object(
    'performance', json_build_object(
      'overall_accuracy', v_overall_accuracy,
      'accuracy_by_topic', v_accuracy_by_topic,
      'match_simulation_accuracy', v_match_sim_accuracy,
      'pass_rate', v_pass_rate
    ),
    'progress', json_build_object(
      'accuracy_change', v_accuracy_change,
      'accuracy_this_week', v_accuracy_this_week,
      'accuracy_last_week', v_accuracy_last_week,
      'total_questions_answered', v_total_questions_answered,
      'total_tests_passed', v_total_tests_passed
    ),
    'habits', json_build_object(
      'calendar', v_calendar,
      'current_streak', v_current_streak,
      'longest_streak', v_longest_streak,
      'active_days_last_7', v_active_days_last_7
    )
  );
end;
$$ language plpgsql security definer stable set search_path = public;

-- ============================================
-- Update clear_learning_history to also clear activity days and video attempts
-- ============================================
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

  -- Delete video attempts
  delete from public.video_attempts
  where user_id = p_user_id;

  -- Delete activity days (streaks reset)
  delete from public.user_activity_days
  where user_id = p_user_id;

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
-- Grants
-- ============================================
revoke all on function public.get_dashboard_stats(uuid) from public;
grant execute on function public.get_dashboard_stats(uuid) to authenticated;

revoke all on function public.clear_learning_history(uuid) from public;
grant execute on function public.clear_learning_history(uuid) to authenticated;
