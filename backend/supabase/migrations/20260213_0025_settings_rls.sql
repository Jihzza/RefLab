-- Migration: RLS policies for settings tables

-- ============================================
-- 1. Enable RLS
-- ============================================
alter table public.notification_preferences enable row level security;
alter table public.user_settings enable row level security;

-- ============================================
-- 2. notification_preferences policies
-- ============================================
create policy "Users can read own notification preferences"
  on public.notification_preferences for select
  using (user_id = auth.uid());

create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  with check (user_id = auth.uid());

create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own notification preferences"
  on public.notification_preferences for delete
  using (user_id = auth.uid());

-- ============================================
-- 3. user_settings policies
-- ============================================
create policy "Users can read own settings"
  on public.user_settings for select
  using (user_id = auth.uid());

create policy "Users can update own settings"
  on public.user_settings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (user_id = auth.uid());
