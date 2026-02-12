-- Migration: Minimal Stripe MVP tables + RLS
-- Keeps legacy billing tables intact while introducing the simplified stripe_* model.

-- ============================================
-- 1) Core Stripe tables
-- ============================================
create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_customers_customer_id_idx
  on public.stripe_customers (stripe_customer_id);

create table if not exists public.stripe_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text not null unique,
  price_id text not null,
  plan text not null check (plan in ('pro', 'plus')),
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (stripe_subscription_id)
);

create index if not exists stripe_subscriptions_user_id_idx
  on public.stripe_subscriptions (user_id);

create index if not exists stripe_subscriptions_status_idx
  on public.stripe_subscriptions (status);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  type text not null,
  created timestamptz not null,
  processed_at timestamptz not null default now(),
  payload jsonb
);

create index if not exists stripe_webhook_events_type_idx
  on public.stripe_webhook_events (type);

-- ============================================
-- 2) updated_at triggers (only if helper exists)
-- ============================================
do $$
begin
  if to_regprocedure('public.handle_updated_at()') is not null then
    drop trigger if exists on_stripe_customers_updated on public.stripe_customers;
    create trigger on_stripe_customers_updated
      before update on public.stripe_customers
      for each row execute function public.handle_updated_at();

    drop trigger if exists on_stripe_subscriptions_updated on public.stripe_subscriptions;
    create trigger on_stripe_subscriptions_updated
      before update on public.stripe_subscriptions
      for each row execute function public.handle_updated_at();
  end if;
end $$;

-- ============================================
-- 3) RLS policies
-- ============================================
alter table public.stripe_customers enable row level security;
alter table public.stripe_subscriptions enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Users can read own stripe customer record" on public.stripe_customers;
create policy "Users can read own stripe customer record"
  on public.stripe_customers
  for select
  using (user_id = auth.uid());

drop policy if exists "Users can read own stripe subscriptions" on public.stripe_subscriptions;
create policy "Users can read own stripe subscriptions"
  on public.stripe_subscriptions
  for select
  using (user_id = auth.uid());

-- No policies for stripe_webhook_events (service_role only)

-- ============================================
-- 4) Backfill from legacy billing tables (if present)
-- ============================================
do $$
declare
  has_user_id boolean;
  has_id boolean;
  has_stripe_subscription_id boolean;
  has_stripe_price_id boolean;
  has_price_id boolean;
  has_plan_id boolean;
  has_plan boolean;
  has_status boolean;
  has_current_period_end boolean;
  has_cancel_at_period_end boolean;
  has_created_at boolean;
  has_updated_at boolean;
  has_webhook_id boolean;
  has_webhook_event_id boolean;
  has_webhook_type boolean;
  has_webhook_created boolean;
  has_webhook_processed_at boolean;
  has_webhook_payload boolean;
  subscription_id_expr text;
  price_expr text;
  plan_expr text;
  status_expr text;
  current_period_end_expr text;
  cancel_at_period_end_expr text;
  created_at_expr text;
  updated_at_expr text;
  webhook_event_id_expr text;
  webhook_type_expr text;
  webhook_created_expr text;
  webhook_processed_at_expr text;
  webhook_payload_expr text;
begin
  if to_regclass('public.customers') is not null then
    insert into public.stripe_customers (user_id, stripe_customer_id, created_at, updated_at)
    select c.id, c.stripe_customer_id, c.created_at, c.updated_at
    from public.customers c
    on conflict (user_id) do update
      set stripe_customer_id = excluded.stripe_customer_id,
          updated_at = excluded.updated_at;
  end if;

  if to_regclass('public.subscriptions') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'user_id'
    ) into has_user_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'id'
    ) into has_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'stripe_subscription_id'
    ) into has_stripe_subscription_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'stripe_price_id'
    ) into has_stripe_price_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'price_id'
    ) into has_price_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'plan_id'
    ) into has_plan_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'plan'
    ) into has_plan;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'status'
    ) into has_status;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'current_period_end'
    ) into has_current_period_end;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'cancel_at_period_end'
    ) into has_cancel_at_period_end;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'created_at'
    ) into has_created_at;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'updated_at'
    ) into has_updated_at;

    if has_user_id and (has_id or has_stripe_subscription_id) and (has_stripe_price_id or has_price_id) then
      if has_id then
        subscription_id_expr := 's.id';
      else
        subscription_id_expr := 's.stripe_subscription_id';
      end if;

      if has_stripe_price_id then
        price_expr := 's.stripe_price_id';
      else
        price_expr := 's.price_id';
      end if;

      if has_plan_id then
        plan_expr := 'case when s.plan_id = ''enterprise'' then ''plus'' when s.plan_id in (''pro'', ''plus'') then s.plan_id else ''pro'' end';
      elsif has_plan then
        plan_expr := 'case when s.plan = ''enterprise'' then ''plus'' when s.plan in (''pro'', ''plus'') then s.plan else ''pro'' end';
      else
        plan_expr := '''pro''';
      end if;

      if has_status then
        status_expr := 's.status::text';
      else
        status_expr := '''incomplete''';
      end if;

      if has_current_period_end then
        current_period_end_expr := 's.current_period_end';
      else
        current_period_end_expr := 'null::timestamptz';
      end if;

      if has_cancel_at_period_end then
        cancel_at_period_end_expr := 'coalesce(s.cancel_at_period_end, false)';
      else
        cancel_at_period_end_expr := 'false';
      end if;

      if has_created_at then
        created_at_expr := 's.created_at';
      else
        created_at_expr := 'now()';
      end if;

      if has_updated_at then
        updated_at_expr := 's.updated_at';
      else
        updated_at_expr := 'now()';
      end if;

      execute format(
        $backfill$
        insert into public.stripe_subscriptions (
          user_id,
          stripe_subscription_id,
          price_id,
          plan,
          status,
          current_period_end,
          cancel_at_period_end,
          created_at,
          updated_at
        )
        select
          s.user_id,
          %1$s as stripe_subscription_id,
          %2$s as price_id,
          %3$s as plan,
          %4$s as status,
          %5$s as current_period_end,
          %6$s as cancel_at_period_end,
          %7$s as created_at,
          %8$s as updated_at
        from public.subscriptions s
        on conflict (stripe_subscription_id) do update
          set user_id = excluded.user_id,
              price_id = excluded.price_id,
              plan = excluded.plan,
              status = excluded.status,
              current_period_end = excluded.current_period_end,
              cancel_at_period_end = excluded.cancel_at_period_end,
              updated_at = excluded.updated_at
        $backfill$,
        subscription_id_expr,
        price_expr,
        plan_expr,
        status_expr,
        current_period_end_expr,
        cancel_at_period_end_expr,
        created_at_expr,
        updated_at_expr
      );
    end if;
  end if;

  if to_regclass('public.webhook_events') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'webhook_events' and column_name = 'id'
    ) into has_webhook_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'webhook_events' and column_name = 'event_id'
    ) into has_webhook_event_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'webhook_events' and column_name = 'type'
    ) into has_webhook_type;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'webhook_events' and column_name = 'created'
    ) into has_webhook_created;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'webhook_events' and column_name = 'processed_at'
    ) into has_webhook_processed_at;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'webhook_events' and column_name = 'payload'
    ) into has_webhook_payload;

    if has_webhook_id or has_webhook_event_id then
      if has_webhook_id then
        webhook_event_id_expr := 'w.id';
      else
        webhook_event_id_expr := 'w.event_id';
      end if;

      if has_webhook_type then
        webhook_type_expr := 'w.type';
      else
        webhook_type_expr := '''unknown''';
      end if;

      if has_webhook_created then
        webhook_created_expr := 'coalesce(w.created, now())';
      elsif has_webhook_processed_at then
        webhook_created_expr := 'coalesce(w.processed_at, now())';
      else
        webhook_created_expr := 'now()';
      end if;

      if has_webhook_processed_at then
        webhook_processed_at_expr := 'coalesce(w.processed_at, now())';
      elsif has_webhook_created then
        webhook_processed_at_expr := 'coalesce(w.created, now())';
      else
        webhook_processed_at_expr := 'now()';
      end if;

      if has_webhook_payload then
        webhook_payload_expr := 'w.payload';
      else
        webhook_payload_expr := 'null::jsonb';
      end if;

      execute format(
        $webhook_backfill$
        insert into public.stripe_webhook_events (event_id, type, created, processed_at, payload)
        select
          %1$s as event_id,
          %2$s as type,
          %3$s as created,
          %4$s as processed_at,
          %5$s as payload
        from public.webhook_events w
        on conflict (event_id) do nothing
        $webhook_backfill$,
        webhook_event_id_expr,
        webhook_type_expr,
        webhook_created_expr,
        webhook_processed_at_expr,
        webhook_payload_expr
      );
    end if;
  end if;
end $$;

-- ============================================
-- 5) Helper: current user plan
-- ============================================
create or replace function public.get_user_plan(uid uuid)
returns text as $$
  select coalesce(
    (
      select s.plan
      from public.stripe_subscriptions s
      where s.user_id = uid
        and s.status in ('active', 'trialing', 'past_due')
      order by s.updated_at desc
      limit 1
    ),
    'free'
  );
$$ language sql security definer stable;
