-- Migration: Billing tables for Stripe integration
-- Tables: customers, subscriptions, invoices, webhook_events, ai_usage_log

-- ============================================
-- 1. customers table
-- Links auth.users to Stripe customer ID
-- ============================================
create table if not exists public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_stripe_customer_id_idx
  on public.customers (stripe_customer_id);

create trigger on_customers_updated
  before update on public.customers
  for each row execute function public.handle_updated_at();

-- ============================================
-- 2. subscriptions table
-- Cached projection of Stripe subscription state
-- ============================================
create type subscription_status as enum (
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'unpaid',
  'paused'
);

create table if not exists public.subscriptions (
  id text primary key,                    -- Stripe subscription ID (sub_xxx)
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  status subscription_status not null,
  plan_id text not null,                  -- 'pro' | 'enterprise'
  billing_interval text not null          -- 'monthly' | 'yearly'
    check (billing_interval in ('monthly', 'yearly')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  ended_at timestamptz,
  stripe_price_id text not null,
  amount integer not null,                -- EUR cents
  currency text not null default 'eur',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_stripe_customer_id_idx on public.subscriptions (stripe_customer_id);
create index subscriptions_status_idx on public.subscriptions (status);

create trigger on_subscriptions_updated
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- ============================================
-- 3. invoices table
-- Payment history from Stripe
-- ============================================
create table if not exists public.invoices (
  id text primary key,                    -- Stripe invoice ID (in_xxx)
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null,                   -- 'paid', 'open', 'void', 'uncollectible'
  amount_due integer not null,            -- EUR cents
  amount_paid integer not null default 0, -- EUR cents
  currency text not null default 'eur',
  invoice_url text,                       -- Stripe hosted invoice URL
  invoice_pdf text,                       -- PDF download URL
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_user_id_idx on public.invoices (user_id);
create index invoices_stripe_subscription_id_idx on public.invoices (stripe_subscription_id);

create trigger on_invoices_updated
  before update on public.invoices
  for each row execute function public.handle_updated_at();

-- ============================================
-- 4. webhook_events table
-- Idempotency tracking + debugging for Stripe webhooks
-- ============================================
create table if not exists public.webhook_events (
  id text primary key,                    -- Stripe event ID (evt_xxx)
  type text not null,                     -- Event type (e.g., 'checkout.session.completed')
  processed_at timestamptz not null default now(),
  payload jsonb
);

create index webhook_events_type_idx on public.webhook_events (type);

-- ============================================
-- 5. ai_usage_log table
-- Internal AI usage tracking (service_role only, no client access)
-- ============================================
create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,                     -- 'explanation', 'chat', 'analysis', etc.
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  model text,
  cost_estimate_cents integer default 0,  -- Internal cost estimate in EUR cents
  created_at timestamptz not null default now()
);

create index ai_usage_log_user_id_idx on public.ai_usage_log (user_id);
create index ai_usage_log_type_idx on public.ai_usage_log (type);
create index ai_usage_log_created_at_idx on public.ai_usage_log (created_at);
