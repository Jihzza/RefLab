-- ================================================================
-- FRESH REBUILD: Tests, Videos, Activity Tracking, Dashboard RPC
-- ================================================================
-- Run this in the Supabase SQL Editor.
-- Drops all related tables and recreates everything from scratch.
-- ================================================================

-- ============================================
-- STEP 1: DROP EVERYTHING (order matters for FK deps)
-- ============================================

-- Drop dashboard RPC
drop function if exists public.get_dashboard_stats(uuid);

-- Drop triggers first
drop trigger if exists on_test_submitted_activity_day on public.test_attempts;
drop trigger if exists on_video_attempt_activity_day on public.video_attempts;
drop trigger if exists trg_tests_updated_at on public.tests;
drop trigger if exists trg_test_questions_updated_at on public.test_questions;
drop trigger if exists trg_test_attempts_updated_at on public.test_attempts;
drop trigger if exists trg_video_scenarios_updated_at on public.video_scenarios;

-- Drop trigger functions
drop function if exists public.handle_activity_day_on_test_submit();
drop function if exists public.handle_activity_day_on_video_attempt();

-- Drop tables (CASCADE handles FK references)
drop table if exists public.test_attempt_answers cascade;
drop table if exists public.test_attempts cascade;
drop table if exists public.test_questions cascade;
drop table if exists public.tests cascade;
drop table if exists public.video_attempts cascade;
drop table if exists public.video_scenarios cascade;
drop table if exists public.user_activity_days cascade;


-- ============================================
-- STEP 2: TESTS TABLES (with topic column)
-- ============================================

create extension if not exists "pgcrypto";

-- Tests
create table public.tests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  topic text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint tests_valid_topic check (
    topic is null or topic in (
      'Offside', 'Fouls', 'Handball', 'Penalties', 'Advantage',
      'Cards', 'Substitutions', 'VAR', 'Free Kicks', 'Throw-Ins',
      'Goal Kicks', 'Corner Kicks', 'General'
    )
  )
);

create index idx_tests_topic on public.tests(topic);

-- Test questions
create table public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  order_index int not null,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A','B','C','D')),
  updated_at timestamptz not null default now(),
  unique(test_id, order_index)
);

-- Test attempts
create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  status text not null check (status in ('in_progress','submitted')) default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz null,
  score_correct int null,
  score_total int null,
  score_percent numeric null,
  updated_at timestamptz not null default now()
);

create index idx_test_attempts_user_test_status
  on public.test_attempts (user_id, test_id, status);

-- Test attempt answers
create table public.test_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  question_id uuid not null references public.test_questions(id) on delete cascade,
  selected_option text not null check (selected_option in ('A','B','C','D')),
  is_correct boolean null,
  confirmed_at timestamptz not null default now(),
  ai_explanation text null,
  ai_explanation_created_at timestamptz null,
  unique(attempt_id, question_id)
);

create index idx_attempt_answers_attempt on public.test_attempt_answers (attempt_id);
create index idx_attempt_answers_question on public.test_attempt_answers (question_id);

-- Updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tests_updated_at
  before update on public.tests
  for each row execute function public.set_updated_at();

create trigger trg_test_questions_updated_at
  before update on public.test_questions
  for each row execute function public.set_updated_at();

create trigger trg_test_attempts_updated_at
  before update on public.test_attempts
  for each row execute function public.set_updated_at();


-- ============================================
-- STEP 3: TESTS RLS
-- ============================================

alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.test_attempt_answers enable row level security;

-- Tests + Questions: readable by authenticated
create policy "tests_select_authenticated"
  on public.tests for select to authenticated using (true);

create policy "test_questions_select_authenticated"
  on public.test_questions for select to authenticated using (true);

-- Attempts: user can only read/write their own
create policy "test_attempts_select_own"
  on public.test_attempts for select to authenticated
  using (auth.uid() = user_id);

create policy "test_attempts_insert_own"
  on public.test_attempts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "test_attempts_update_own"
  on public.test_attempts for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Attempt Answers: user can only access answers linked to their attempts
create policy "attempt_answers_select_own"
  on public.test_attempt_answers for select to authenticated
  using (exists (
    select 1 from public.test_attempts a
    where a.id = attempt_id and a.user_id = auth.uid()
  ));

create policy "attempt_answers_insert_own"
  on public.test_attempt_answers for insert to authenticated
  with check (exists (
    select 1 from public.test_attempts a
    where a.id = attempt_id and a.user_id = auth.uid()
  ));

create policy "attempt_answers_update_own"
  on public.test_attempt_answers for update to authenticated
  using (exists (
    select 1 from public.test_attempts a
    where a.id = attempt_id and a.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.test_attempts a
    where a.id = attempt_id and a.user_id = auth.uid()
  ));


-- ============================================
-- STEP 4: USER ACTIVITY DAYS
-- ============================================

create table public.user_activity_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index idx_user_activity_days_user_date
  on public.user_activity_days(user_id, activity_date desc);

alter table public.user_activity_days enable row level security;

create policy "activity_days_select_own"
  on public.user_activity_days for select to authenticated
  using (auth.uid() = user_id);

-- Trigger: log activity day when a test is submitted
create or replace function public.handle_activity_day_on_test_submit()
returns trigger as $$
begin
  if new.status <> 'submitted' or old.status = 'submitted' then
    return new;
  end if;
  insert into public.user_activity_days (user_id, activity_date)
  values (new.user_id, current_date)
  on conflict (user_id, activity_date) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_test_submitted_activity_day
  after update on public.test_attempts
  for each row execute function public.handle_activity_day_on_test_submit();


-- ============================================
-- STEP 5: VIDEO SCENARIOS & ATTEMPTS
-- ============================================

create table public.video_scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_url text not null,
  topic text,
  correct_decision text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_video_scenarios_updated_at
  before update on public.video_scenarios
  for each row execute function public.set_updated_at();

create table public.video_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references public.video_scenarios(id) on delete cascade,
  selected_decision text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index idx_video_attempts_user on public.video_attempts(user_id);
create index idx_video_attempts_scenario on public.video_attempts(scenario_id);

alter table public.video_scenarios enable row level security;
alter table public.video_attempts enable row level security;

create policy "video_scenarios_select_authenticated"
  on public.video_scenarios for select to authenticated using (true);

create policy "video_attempts_select_own"
  on public.video_attempts for select to authenticated
  using (auth.uid() = user_id);

create policy "video_attempts_insert_own"
  on public.video_attempts for insert to authenticated
  with check (auth.uid() = user_id);

-- Trigger: log activity day on video attempt
create or replace function public.handle_activity_day_on_video_attempt()
returns trigger as $$
begin
  insert into public.user_activity_days (user_id, activity_date)
  values (new.user_id, current_date)
  on conflict (user_id, activity_date) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_video_attempt_activity_day
  after insert on public.video_attempts
  for each row execute function public.handle_activity_day_on_video_attempt();


-- ============================================
-- STEP 6: DASHBOARD RPC
-- ============================================

create or replace function public.get_dashboard_stats(p_user_id uuid)
returns json as $$
declare
  v_overall_accuracy numeric;
  v_accuracy_by_topic json;
  v_match_sim_accuracy numeric;
  v_pass_rate numeric;
  v_accuracy_this_week numeric;
  v_accuracy_last_week numeric;
  v_accuracy_change numeric;
  v_total_questions_answered bigint;
  v_total_tests_passed bigint;
  v_calendar json;
  v_current_streak integer;
  v_longest_streak integer;
  v_active_days_last_7 integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- PERFORMANCE: Overall Accuracy
  select case when count(*) = 0 then null
    else round((sum(case when taa.is_correct then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1)
  end into v_overall_accuracy
  from public.test_attempt_answers taa
  join public.test_attempts ta on ta.id = taa.attempt_id
  where ta.user_id = p_user_id and ta.status = 'submitted';

  -- PERFORMANCE: Accuracy by Topic
  select coalesce(json_agg(row_to_json(t)), '[]'::json) into v_accuracy_by_topic
  from (
    select coalesce(te.topic, 'Uncategorized') as topic,
      round((sum(case when taa.is_correct then 1 else 0 end)::numeric / nullif(count(*)::numeric, 0)) * 100, 1) as accuracy,
      count(*)::integer as total_questions
    from public.test_attempt_answers taa
    join public.test_attempts ta on ta.id = taa.attempt_id
    join public.tests te on te.id = ta.test_id
    where ta.user_id = p_user_id and ta.status = 'submitted'
    group by te.topic order by accuracy desc nulls last
  ) t;

  -- PERFORMANCE: Match Simulation Accuracy
  select case when count(*) = 0 then null
    else round((sum(case when va.is_correct then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1)
  end into v_match_sim_accuracy
  from public.video_attempts va where va.user_id = p_user_id;

  -- PERFORMANCE: Pass Rate (>= 80%)
  select case when count(*) = 0 then null
    else round((sum(case when ta.score_percent >= 80 then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1)
  end into v_pass_rate
  from public.test_attempts ta
  where ta.user_id = p_user_id and ta.status = 'submitted';

  -- PROGRESS: Accuracy this week
  select case when count(*) = 0 then null
    else round((sum(case when taa.is_correct then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1)
  end into v_accuracy_this_week
  from public.test_attempt_answers taa
  join public.test_attempts ta on ta.id = taa.attempt_id
  where ta.user_id = p_user_id and ta.status = 'submitted'
    and ta.submitted_at >= date_trunc('week', current_date);

  -- PROGRESS: Accuracy last week
  select case when count(*) = 0 then null
    else round((sum(case when taa.is_correct then 1 else 0 end)::numeric / count(*)::numeric) * 100, 1)
  end into v_accuracy_last_week
  from public.test_attempt_answers taa
  join public.test_attempts ta on ta.id = taa.attempt_id
  where ta.user_id = p_user_id and ta.status = 'submitted'
    and ta.submitted_at >= date_trunc('week', current_date) - interval '7 days'
    and ta.submitted_at < date_trunc('week', current_date);

  -- PROGRESS: Accuracy change
  if v_accuracy_this_week is not null and v_accuracy_last_week is not null then
    v_accuracy_change := round(v_accuracy_this_week - v_accuracy_last_week, 1);
  else
    v_accuracy_change := null;
  end if;

  -- PROGRESS: Total Questions Answered
  select count(*) into v_total_questions_answered
  from public.test_attempt_answers taa
  join public.test_attempts ta on ta.id = taa.attempt_id
  where ta.user_id = p_user_id and ta.status = 'submitted';

  -- PROGRESS: Total Tests Passed
  select count(*) into v_total_tests_passed
  from public.test_attempts ta
  where ta.user_id = p_user_id and ta.status = 'submitted' and ta.score_percent >= 80;

  -- HABITS: 30-day Calendar
  select coalesce(json_agg(row_to_json(t) order by t.date), '[]'::json) into v_calendar
  from (
    select d.day::date as date,
      exists(select 1 from public.user_activity_days uad
        where uad.user_id = p_user_id and uad.activity_date = d.day::date) as active
    from generate_series(current_date - interval '29 days', current_date, interval '1 day') as d(day)
  ) t;

  -- HABITS: Streaks
  with activity_with_gaps as (
    select activity_date,
      activity_date - (row_number() over (order by activity_date))::integer as streak_group
    from public.user_activity_days where user_id = p_user_id
  ),
  streaks as (
    select streak_group, count(*) as streak_length, max(activity_date) as streak_end
    from activity_with_gaps group by streak_group
  )
  select
    coalesce((select s.streak_length::integer from streaks s
      where s.streak_end >= current_date - 1 order by s.streak_end desc limit 1), 0),
    coalesce((select max(s.streak_length)::integer from streaks s), 0)
  into v_current_streak, v_longest_streak;

  -- HABITS: Active Days Last 7
  select count(*)::integer into v_active_days_last_7
  from public.user_activity_days
  where user_id = p_user_id and activity_date >= current_date - 6;

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

-- Update clear_learning_history to also clear activity days + video attempts
create or replace function public.clear_learning_history(p_user_id uuid)
returns json as $$
declare v_deleted_attempts integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  delete from public.test_attempts where user_id = p_user_id;
  get diagnostics v_deleted_attempts = row_count;
  delete from public.video_attempts where user_id = p_user_id;
  delete from public.user_activity_days where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id
    and type in ('streak_track', 'streak_reminder', 'streak_loss');
  return json_build_object('success', true, 'deleted_attempts', v_deleted_attempts);
end;
$$ language plpgsql security definer set search_path = public;

-- Grants
revoke all on function public.get_dashboard_stats(uuid) from public;
grant execute on function public.get_dashboard_stats(uuid) to authenticated;
revoke all on function public.clear_learning_history(uuid) from public;
grant execute on function public.clear_learning_history(uuid) to authenticated;


-- ============================================
-- STEP 7: PERFORMANCE INDEXES
-- ============================================

create index idx_test_attempts_user_submitted
  on public.test_attempts(user_id, submitted_at) where status = 'submitted';

create index idx_test_attempt_answers_correct
  on public.test_attempt_answers(attempt_id, is_correct);

create index idx_video_attempts_user_correct
  on public.video_attempts(user_id, is_correct);


-- ============================================
-- STEP 8: SEED DATA — 9 Tests, 72 Questions, 6 Videos
-- ============================================

-- Tests
insert into public.tests (slug, title, topic, is_active) values
  ('offside-fundamentals',   'Offside Fundamentals',     'Offside',    true),
  ('fouls-and-misconduct',   'Fouls & Misconduct',       'Fouls',      true),
  ('handball-decisions',     'Handball Decisions',        'Handball',   true),
  ('penalty-situations',     'Penalty Situations',        'Penalties',  true),
  ('advantage-application',  'Advantage Application',     'Advantage',  true),
  ('cards-and-discipline',   'Cards & Discipline',        'Cards',      true),
  ('var-protocol',           'VAR Protocol',              'VAR',        true),
  ('free-kicks-basics',      'Free Kicks Basics',         'Free Kicks', true),
  ('general-laws',           'General Laws of the Game',  'General',    true);

-- Offside questions
insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.* from public.tests t
cross join (values
  (1, 'A player is in an offside position. When is the offence penalised?',
    'As soon as they are in an offside position', 'When they become involved in active play',
    'When the ball crosses the halfway line', 'When any teammate touches the ball', 'B'),
  (2, 'Which body parts are used to determine offside position?',
    'Any part of the body including hands and arms', 'Any part of the body that can legally play the ball',
    'Only the feet', 'Head, body, and feet only', 'B'),
  (3, 'A player receives the ball directly from a goal kick. Can they be offside?',
    'Yes, offside applies on all restarts', 'No, there is no offside from a goal kick',
    'Only if they are in the penalty area', 'Only if the goalkeeper takes the goal kick', 'B'),
  (4, 'An attacker is level with the second-last defender. Are they offside?',
    'Yes, level is offside', 'No, level is onside',
    'Only if the ball is in the air', 'It depends on the phase of play', 'B'),
  (5, 'A player in an offside position deliberately prevents the goalkeeper from playing the ball. What is the decision?',
    'Indirect free kick for offside', 'Corner kick', 'Drop ball', 'Direct free kick and possible caution', 'A'),
  (6, 'Can a player be offside from a throw-in?',
    'Yes, standard offside rules apply', 'No, there is no offside offence from a throw-in',
    'Only in the attacking half', 'Only in the penalty area', 'B'),
  (7, 'An attacker in an offside position runs towards the ball but a teammate in an onside position plays it. What is the decision?',
    'Offside — the attacker impacted the play', 'Play on — the onside player played the ball',
    'It depends on whether the offside player touched the ball', 'It depends on whether the offside player was in the opponents half', 'C'),
  (8, 'A defender deliberately steps off the field to place an attacker in an offside position. What should the referee do?',
    'Award offside', 'Allow play to continue and caution the defender at the next stoppage',
    'Stop play immediately and caution the defender', 'Award an indirect free kick to the attacking team', 'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'offside-fundamentals';

-- Fouls questions
insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.* from public.tests t
cross join (values
  (1, 'What type of free kick is awarded for a direct free kick offence committed inside the offenders penalty area?',
    'Indirect free kick', 'Direct free kick on the penalty area line', 'Penalty kick', 'Drop ball', 'C'),
  (2, 'A player uses excessive force when challenging an opponent. What is the minimum sanction?',
    'Caution (yellow card)', 'Sending off (red card)', 'Indirect free kick only', 'Verbal warning', 'B'),
  (3, 'Which of the following is NOT a direct free kick offence?',
    'Kicking an opponent', 'Pushing an opponent', 'Playing in a dangerous manner', 'Tripping an opponent', 'C'),
  (4, 'A player commits a reckless challenge. What is the correct sanction?',
    'No card, just a free kick', 'Caution (yellow card)', 'Sending off (red card)', 'Verbal warning', 'B'),
  (5, 'An attacker is fouled simultaneously by two defenders in the penalty area. How many penalty kicks are awarded?',
    'Two penalty kicks', 'One penalty kick', 'One penalty kick and a caution for each defender', 'Indirect free kick', 'B'),
  (6, 'A player tackles from behind and makes contact with the ball first, then the opponent falls. What is the decision?',
    'Always a foul', 'It depends on whether the tackle was careless, reckless, or with excessive force',
    'Never a foul if ball is played first', 'Indirect free kick', 'B'),
  (7, 'What restart is given when a player impedes the progress of an opponent without any contact?',
    'Direct free kick', 'Indirect free kick', 'Drop ball', 'No foul — play continues', 'B'),
  (8, 'A goalkeeper handles the ball outside their penalty area. What is the decision?',
    'Indirect free kick', 'Direct free kick', 'Penalty kick', 'Drop ball', 'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'fouls-and-misconduct';

-- Handball questions
insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.* from public.tests t
cross join (values
  (1, 'A player scores a goal immediately after the ball accidentally hits their hand. What is the decision?',
    'Goal stands — it was accidental', 'No goal — handball offence even if accidental',
    'Goal stands only if the player did not move their hand', 'It depends on the referee''s judgement', 'B'),
  (2, 'A defender in the wall jumps and the ball hits their arm which is by their side. Is it handball?',
    'Yes, always', 'No, if the arm is in a natural position close to the body',
    'Yes, because it stopped a goal-scoring opportunity', 'Only if the referee deems it intentional', 'B'),
  (3, 'A player makes their body unnaturally bigger with their arm and blocks a cross. What is the decision?',
    'Play on — no offence', 'Indirect free kick', 'Direct free kick or penalty', 'Drop ball', 'C'),
  (4, 'The ball hits a player''s hand that is supporting their body while on the ground. Is it handball?',
    'Yes, always a handball', 'No, the hand is supporting the body in a natural way',
    'Only if they scored from it', 'Only in the penalty area', 'B'),
  (5, 'An attacker''s teammate handles the ball, then the attacker scores in a subsequent phase of play. What is the decision?',
    'Goal stands — it was a different player', 'No goal — handball in the build-up',
    'Goal stands if several passes occurred after the handball', 'No goal only if the handball was deliberate', 'B'),
  (6, 'A player deliberately handles the ball to prevent a goal. What is the sanction?',
    'Caution (yellow card) and penalty', 'Sending off (red card) and penalty',
    'Direct free kick only', 'Indirect free kick and caution', 'B'),
  (7, 'The ball rebounds off a player''s foot onto their own arm from very close range. Is this handball?',
    'Yes — arm contact is always penalised', 'No — the ball came from the player''s own body at close range',
    'Only if it led to a goal', 'Only outside the penalty area', 'B'),
  (8, 'Where does the arm begin for handball decisions according to IFAB?',
    'At the wrist', 'At the elbow', 'At the bottom of the armpit', 'At the shoulder joint', 'C')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'handball-decisions';

-- Penalty questions
insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.* from public.tests t
cross join (values
  (1, 'During a penalty kick, the goalkeeper moves off the goal line before the ball is kicked and saves the shot. What is the decision?',
    'Goal kick', 'Retake the penalty kick', 'Indirect free kick to the defending team', 'Play continues', 'B'),
  (2, 'A penalty kick hits the post and rebounds to the kicker who scores. What is the decision?',
    'Goal stands', 'No goal — the kicker cannot touch the ball twice',
    'Retake the penalty', 'Indirect free kick to the defending team', 'B'),
  (3, 'Both teams commit infringements during a penalty kick. What is the decision?',
    'Goal stands if scored', 'Retake the penalty kick', 'Indirect free kick to the defending team', 'Drop ball', 'B'),
  (4, 'Where exactly must the ball be placed for a penalty kick?',
    'Anywhere within the penalty area', 'On the penalty mark', 'On the penalty area line', 'Within 1 metre of the penalty mark', 'B'),
  (5, 'An attacker enters the penalty area before the kick and scores from the rebound. What is the decision?',
    'Goal stands', 'Retake the penalty', 'No goal — indirect free kick to the defending team', 'No goal — the penalty is retaken', 'D'),
  (6, 'The goalkeeper and an attacker both infringe during a penalty kick that is scored. What is the decision?',
    'Goal stands', 'Retake the penalty', 'Indirect free kick to defending team', 'Goal kick', 'B'),
  (7, 'Can the referee award a penalty kick after the final whistle has blown?',
    'No, never', 'Yes, if the foul occurred before the whistle', 'Only in extra time', 'Only if VAR reviews it', 'B'),
  (8, 'A teammate of the kicker takes the penalty instead after the referee has confirmed the kicker. What happens?',
    'If a goal is scored, it is disallowed and the correct kicker retakes',
    'The incorrect kicker is cautioned and an indirect free kick is awarded',
    'The goal stands regardless', 'Retake with any player', 'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'penalty-situations';

-- Advantage questions
insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.* from public.tests t
cross join (values
  (1, 'A player is fouled but their teammate gains possession and attacks. The referee plays advantage. The attack breaks down 5 seconds later. What should the referee do?',
    'Go back and award the free kick', 'Play continues — advantage has been played',
    'Award a drop ball', 'Award the free kick only if a card is needed', 'B'),
  (2, 'Can advantage be applied for a sending-off offence?',
    'No, play must always be stopped for a red card', 'Yes, but the player must still be sent off at the next stoppage',
    'Only in the attacking third', 'Only if a goal is scored', 'B'),
  (3, 'How long does a referee typically wait before deciding if advantage has materialised?',
    'Exactly 5 seconds', 'Until the next pass',
    'A few seconds — it depends on the situation', '10 seconds maximum', 'C'),
  (4, 'The referee signals advantage but the fouled player immediately loses the ball. What should happen?',
    'Play continues', 'The referee stops play and awards the original free kick', 'Drop ball',
    'The referee cannot go back once advantage is signalled', 'B'),
  (5, 'A defender commits a cautionable foul in their own half. The attacker keeps the ball and continues. Should the referee still caution the defender?',
    'No, advantage removes the card', 'Yes, the caution is still given at the next stoppage',
    'Only if the attack results in a goal', 'Only if the foul was reckless', 'B'),
  (6, 'Can advantage be applied inside the penalty area?',
    'No, a penalty must always be awarded', 'Yes, if the attacking team has a clear advantage',
    'Only if the ball is already heading into the goal', 'Never — the penalty area is a special zone', 'B'),
  (7, 'A foul is committed and the referee plays advantage. A goal is scored directly from the advantage. What happens to the card?',
    'No card — the goal cancels the sanction', 'The card is still shown at the next stoppage after the goal celebration',
    'The card is only shown if it was a red card offence', 'The referee decides after the match', 'B'),
  (8, 'What signal does the referee use to indicate advantage?',
    'Blowing the whistle twice', 'Raising both arms upward',
    'Sweeping one or both arms upward in the direction of play', 'Pointing at the fouled player', 'C')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'advantage-application';

-- Cards & Discipline questions
insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.* from public.tests t
cross join (values
  (1, 'A player receives a second yellow card in the same match. What is the procedure?',
    'Show the second yellow card, then the red card, and send the player off', 'Show only the red card',
    'Show only the second yellow card', 'Verbal warning first, then red if repeated', 'A'),
  (2, 'Which of the following is a sending-off offence?',
    'Persistent fouling', 'Denying an obvious goal-scoring opportunity by handling the ball',
    'Dissent by word or action', 'Delaying the restart', 'B'),
  (3, 'A substitute uses offensive language from the bench. Can they be sanctioned?',
    'No, only players on the field can be carded', 'Yes, they can be shown a yellow or red card',
    'Only a verbal warning', 'The team manager receives the card instead', 'B'),
  (4, 'A player removes their shirt while celebrating a goal. What is the sanction?',
    'No sanction — it is a normal celebration', 'Verbal warning', 'Caution (yellow card)', 'Sending off (red card)', 'C'),
  (5, 'Can a referee show a card to a player after the final whistle?',
    'No, disciplinary action ends with the match', 'Yes, until the referee has left the field of play',
    'Only for violent conduct', 'Only during the cooling-off period', 'B'),
  (6, 'A player delays the restart of play by kicking the ball away after a foul is called. What is the minimum sanction?',
    'Verbal warning', 'Indirect free kick', 'Caution (yellow card)', 'No sanction required', 'C'),
  (7, 'A team official is sent off from the technical area. Where must they go?',
    'They can stay in the stands', 'They must leave the vicinity of the field of play and technical area',
    'They can sit behind the bench', 'They go to the dressing room only', 'B'),
  (8, 'What does DOGSO stand for?',
    'Denial Of Goal Scoring Offence', 'Denying an Obvious Goal-Scoring Opportunity',
    'Direct Offence in the Goal-Scoring Option', 'Denial Of Game by Serious Offence', 'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'cards-and-discipline';

-- VAR Protocol questions
insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.* from public.tests t
cross join (values
  (1, 'Which of the following situations can VAR intervene on?',
    'All foul decisions', 'Goals, penalty decisions, direct red cards, and mistaken identity',
    'Yellow cards and throw-ins', 'Offside only', 'B'),
  (2, 'What is the minimum requirement for VAR to overturn a decision?',
    'Any doubt about the decision', 'A clear and obvious error',
    'Agreement from all VAR officials', 'Request from a team captain', 'B'),
  (3, 'Who makes the final decision when VAR is used?',
    'The VAR operator', 'The fourth official', 'The referee on the field', 'A panel of video officials', 'C'),
  (4, 'What signal does the referee make to indicate a VAR review?',
    'A circular hand motion', 'Drawing a rectangle (TV screen shape) in the air',
    'Pointing to their ear', 'Raising a flag', 'B'),
  (5, 'Can VAR be used to review a yellow card decision?',
    'Yes, for all yellow cards', 'No, VAR cannot review yellow cards',
    'Only for second yellow cards', 'Only in the penalty area', 'B'),
  (6, 'After the referee goes to the Review Area (OFR), what can they do?',
    'Only confirm their original decision', 'Change the decision, confirm it, or add additional sanctions',
    'Only overturn the decision', 'Ask the VAR to make the decision', 'B'),
  (7, 'Can a goal be disallowed by VAR for a foul in the build-up?',
    'No, only offside can cancel a goal via VAR', 'Yes, if there was an offence in the attacking phase leading to the goal',
    'Only for handball', 'Only if the referee requests a review', 'B'),
  (8, 'What does OFR stand for in VAR protocol?',
    'Official Field Review', 'On-Field Review', 'Official Footage Replay', 'Onsite Final Review', 'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'var-protocol';

-- Free Kicks questions
insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.* from public.tests t
cross join (values
  (1, 'Can a goal be scored directly from an indirect free kick?',
    'Yes, any free kick can result in a goal', 'No, the ball must touch another player first',
    'Only if it is inside the penalty area', 'Only if the goalkeeper touches it', 'B'),
  (2, 'How far must opponents stand from the ball on a free kick?',
    'At least 5 metres', 'At least 9.15 metres (10 yards)', 'At least 11 metres', 'At least 7 metres', 'B'),
  (3, 'A free kick is taken inside the kickers own penalty area. When is the ball in play?',
    'When the ball is kicked and clearly moves', 'When the ball leaves the penalty area',
    'When the referee blows the whistle', 'When an opponent touches it', 'A'),
  (4, 'The referee signals an indirect free kick. How is this indicated?',
    'By pointing in the direction of play',
    'By raising an arm above the head until the ball is touched by another player or goes out of play',
    'By blowing the whistle twice', 'By waving both arms', 'B'),
  (5, 'A player takes a quick free kick before opponents have retreated 9.15m. Is this allowed?',
    'No, the referee must always ensure the distance', 'Yes, the kicker accepts the position of the opponents',
    'Only if the referee has blown the whistle', 'Only in the attacking half', 'B'),
  (6, 'A defending team forms a wall of 4 players. Can attacking players stand in the wall?',
    'Yes, they can stand wherever they want',
    'No, attacking players must be at least 1 metre from the wall of 3 or more defenders',
    'Only if the referee permits it', 'Only one attacking player may join the wall', 'B'),
  (7, 'What happens if a free kick is kicked directly into the teams own goal?',
    'Own goal is awarded', 'Corner kick to the opposing team', 'The kick is retaken', 'Goal kick', 'B'),
  (8, 'A player kicks the ball and then touches it again before anyone else. What is the decision?',
    'Play continues', 'Indirect free kick to the opposing team',
    'Direct free kick to the opposing team', 'The free kick is retaken', 'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'free-kicks-basics';

-- General Laws questions
insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.* from public.tests t
cross join (values
  (1, 'How many players must a team have to start a match?',
    'At least 9', 'At least 7', 'Exactly 11', 'At least 8', 'B'),
  (2, 'How long is each half of a standard match?',
    '40 minutes', '45 minutes', '50 minutes', '35 minutes', 'B'),
  (3, 'What is the circumference of a regulation football?',
    '55-60 cm', '68-70 cm', '72-75 cm', '60-65 cm', 'B'),
  (4, 'A drop ball is awarded. Who can participate?',
    'Any player from both teams', 'Only the player who last touched the ball',
    'One player from the team that last touched the ball (or goalkeeper if in penalty area)', 'Only goalkeepers', 'C'),
  (5, 'When is the ball out of play?',
    'When any part of the ball is on the line', 'When the whole of the ball crosses the whole of the line',
    'When the referee blows the whistle', 'Both B and C', 'D'),
  (6, 'How many substitutions are allowed in a standard competitive match under IFAB rules?',
    '3 substitutions', '5 substitutions', 'Unlimited', '4 substitutions', 'B'),
  (7, 'What is the maximum number of people allowed in the technical area?',
    'No specific limit in the Laws', 'The competition rules determine this',
    'Maximum 10 people', 'Maximum 6 people', 'B'),
  (8, 'The ball strikes the referee and goes into the goal. What is the decision?',
    'Goal stands', 'Drop ball from where the referee was struck', 'Goal kick', 'Corner kick', 'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'general-laws';

-- Video scenarios
insert into public.video_scenarios (title, description, video_url, topic, correct_decision, is_active) values
  ('Penalty Area Challenge', 'A defender slides in from behind as the attacker enters the penalty area.',
   'https://example.com/videos/penalty-area-challenge.mp4', 'Penalties', 'Penalty kick and yellow card', true),
  ('Offside Run on Through Ball', 'An attacker makes a run behind the defensive line on a through ball.',
   'https://example.com/videos/offside-run.mp4', 'Offside', 'Offside — attacker beyond second-last defender', true),
  ('Handball in the Wall', 'During a free kick, the ball strikes a defender''s arm in the wall.',
   'https://example.com/videos/handball-wall.mp4', 'Handball', 'No handball — arm in natural position', true),
  ('Last Man Foul', 'A defender pulls back an attacker who is through on goal with no other defenders.',
   'https://example.com/videos/last-man-foul.mp4', 'Cards', 'Direct free kick and red card (DOGSO)', true),
  ('Advantage Leading to Goal', 'A midfielder is fouled but keeps the ball and assists a teammate who scores.',
   'https://example.com/videos/advantage-goal.mp4', 'Advantage', 'Goal stands — advantage played successfully', true),
  ('VAR Intervention — Offside Goal', 'A goal is scored but the assistant flags for offside. VAR checks.',
   'https://example.com/videos/var-offside-goal.mp4', 'VAR', 'Goal disallowed — offside confirmed by VAR', true);
