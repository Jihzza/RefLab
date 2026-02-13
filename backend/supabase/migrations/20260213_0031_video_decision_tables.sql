-- 20260213_0031_video_decision_tables.sql
-- Stub tables for video-based match simulation decisions.
-- Enables the dashboard RPC to query these from day one,
-- returning null/0 when no video data exists yet.

-- ============================================
-- 1. video_scenarios table (admin-managed content)
-- ============================================
create table if not exists public.video_scenarios (
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

-- ============================================
-- 2. video_attempts table (user decisions)
-- ============================================
create table if not exists public.video_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references public.video_scenarios(id) on delete cascade,
  selected_decision text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index idx_video_attempts_user
  on public.video_attempts(user_id);

create index idx_video_attempts_scenario
  on public.video_attempts(scenario_id);

-- ============================================
-- 3. RLS
-- ============================================
alter table public.video_scenarios enable row level security;
alter table public.video_attempts enable row level security;

-- Scenarios: readable by all authenticated users
create policy "video_scenarios_select_authenticated"
  on public.video_scenarios for select
  to authenticated
  using (true);

-- Attempts: users can only read their own
create policy "video_attempts_select_own"
  on public.video_attempts for select
  to authenticated
  using (auth.uid() = user_id);

-- Attempts: users can only insert their own
create policy "video_attempts_insert_own"
  on public.video_attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================
-- 4. Activity tracking: log video attempt as activity day
-- ============================================
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
