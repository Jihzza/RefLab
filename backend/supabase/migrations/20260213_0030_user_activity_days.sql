-- 20260213_0030_user_activity_days.sql
-- Dedicated activity tracking for dashboard streaks and calendar.
-- One row per user per active day. Decoupled from notifications.

-- ============================================
-- 1. user_activity_days table
-- ============================================
create table if not exists public.user_activity_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

-- Descending index for streak queries (scan backwards from today)
create index idx_user_activity_days_user_date
  on public.user_activity_days(user_id, activity_date desc);

-- ============================================
-- 2. RLS: users can only read their own activity
-- ============================================
alter table public.user_activity_days enable row level security;

create policy "activity_days_select_own"
  on public.user_activity_days for select
  to authenticated
  using (auth.uid() = user_id);

-- No direct insert/update/delete by users (system-managed via triggers)

-- ============================================
-- 3. Trigger: auto-log activity on test submission
-- ============================================
create or replace function public.handle_activity_day_on_test_submit()
returns trigger as $$
begin
  -- Only fire when status transitions to 'submitted'
  if new.status <> 'submitted' or old.status = 'submitted' then
    return new;
  end if;

  -- Upsert: one row per user per day
  insert into public.user_activity_days (user_id, activity_date)
  values (new.user_id, current_date)
  on conflict (user_id, activity_date) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_test_submitted_activity_day on public.test_attempts;
create trigger on_test_submitted_activity_day
  after update on public.test_attempts
  for each row execute function public.handle_activity_day_on_test_submit();

-- ============================================
-- 4. Backfill: populate from existing test_attempts
-- ============================================
insert into public.user_activity_days (user_id, activity_date)
select distinct
  ta.user_id,
  (ta.submitted_at at time zone 'UTC')::date
from public.test_attempts ta
where ta.status = 'submitted'
  and ta.submitted_at is not null
on conflict (user_id, activity_date) do nothing;
