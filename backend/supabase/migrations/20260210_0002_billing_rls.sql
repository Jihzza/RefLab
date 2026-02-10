-- Migration: Billing RLS policies
-- Security model:
--   customers/subscriptions/invoices: users can only SELECT their own rows
--   webhook_events: NO client access (service_role only)
--   ai_usage_log: NO client access (service_role only)

-- ============================================
-- 1. Enable RLS on all billing tables
-- ============================================
alter table public.customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.webhook_events enable row level security;
alter table public.ai_usage_log enable row level security;

-- ============================================
-- 2. customers: users can read their own row only
-- ============================================
create policy "Users can read own customer record"
  on public.customers for select
  using (id = auth.uid());

-- No INSERT/UPDATE/DELETE for clients
-- All mutations come from webhook edge function using service_role

-- ============================================
-- 3. subscriptions: users can read their own rows only
-- ============================================
create policy "Users can read own subscriptions"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for clients

-- ============================================
-- 4. invoices: users can read their own rows only
-- ============================================
create policy "Users can read own invoices"
  on public.invoices for select
  using (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for clients

-- ============================================
-- 5. webhook_events: NO client access at all
-- Only service_role can read/write
-- ============================================
-- No policies = no access for authenticated/anon roles

-- ============================================
-- 6. ai_usage_log: NO client access at all
-- Only service_role can read/write
-- ============================================
-- No policies = no access for authenticated/anon roles

-- ============================================
-- 7. Helper function: get user's active plan
-- Returns 'free', 'pro', or 'enterprise'
-- ============================================
create or replace function public.get_user_plan(uid uuid)
returns text as $$
  select coalesce(
    (
      select s.plan_id
      from public.subscriptions s
      where s.user_id = uid
        and s.status in ('active', 'trialing', 'past_due')
      order by s.created_at desc
      limit 1
    ),
    'free'
  );
$$ language sql security definer stable;
