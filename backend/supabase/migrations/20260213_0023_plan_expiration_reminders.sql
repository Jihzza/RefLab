-- Migration: plan expiration reminder cron job
-- Sends notifications at 72h, 48h, and 24h before a subscription expires.
-- Requires pg_cron extension (enable via Supabase Dashboard > Database > Extensions).

-- ============================================
-- 1. Enable pg_cron (idempotent)
-- ============================================
create extension if not exists pg_cron;

-- ============================================
-- 2. Reminder function
-- ============================================
-- Scans active subscriptions expiring within 73 hours.
-- For each, determines which reminder threshold applies (72h / 48h / 24h)
-- and creates a notification if that specific reminder hasn't been sent yet.
create or replace function public.check_plan_expiration_reminders()
returns void as $$
declare
  v_sub record;
  v_hours_left numeric;
  v_plan_display text;
  v_message text;
begin
  for v_sub in
    select s.user_id, s.plan, s.current_period_end
    from public.stripe_subscriptions s
    where s.status in ('active', 'trialing')
      and s.current_period_end is not null
      and s.current_period_end > now()
      and s.current_period_end <= now() + interval '73 hours'
  loop
    v_hours_left := extract(epoch from (v_sub.current_period_end - now())) / 3600;
    v_plan_display := initcap(v_sub.plan);

    -- Determine which reminder to send based on hours remaining
    if v_hours_left <= 25 then
      v_message := 'Your ' || v_plan_display || ' plan expires tomorrow. Renew to keep your premium features.';
    elsif v_hours_left <= 49 then
      v_message := 'Your ' || v_plan_display || ' plan expires in 2 days. Renew to keep your premium features.';
    else
      v_message := 'Your ' || v_plan_display || ' plan expires in 3 days. Renew to keep your premium features.';
    end if;

    -- Dedup: skip if this exact reminder already exists for this user
    if not exists (
      select 1 from public.notifications
      where user_id = v_sub.user_id
        and type = 'plan_expiration_reminder'
        and message = v_message
    ) then
      insert into public.notifications (user_id, type, title, message)
      values (v_sub.user_id, 'plan_expiration_reminder', 'Plan Expiring Soon', v_message);
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================
-- 3. Schedule: run every hour
-- ============================================
select cron.schedule(
  'plan-expiration-reminders',
  '0 * * * *',
  'select public.check_plan_expiration_reminders()'
);
