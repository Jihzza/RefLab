-- Migration: extend report tables with structured reasons
-- Adds preset reason codes + optional freeform details for post/user reports.
-- Keeps existing `reason` column for backwards compatibility with current clients.

-- ============================================
-- 1. Report reason preset enum
-- ============================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'report_reason_code') then
    create type public.report_reason_code as enum (
      'spam_scam',
      'harassment_bullying',
      'inappropriate_content',
      'other'
    );
  end if;
end $$;

-- ============================================
-- 2. Post reports: structured reasons
-- ============================================
alter table public.post_reports
  add column if not exists reason_code public.report_reason_code,
  add column if not exists reason_details text;

-- Backfill legacy rows so adding a NOT-EMPTY reason constraint won't fail.
-- Existing deployments may already have rows with NULL/blank `reason`.
update public.post_reports
set reason = 'Legacy report'
where
  (reason is null or btrim(reason) = '')
  and reason_code is null
  and (reason_details is null or btrim(reason_details) = '');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'post_reports_reason_required'
      and conrelid = 'public.post_reports'::regclass
  ) then
    alter table public.post_reports
      add constraint post_reports_reason_required
      check (
        (reason is not null and btrim(reason) <> '')
        or reason_code is not null
        or (reason_details is not null and btrim(reason_details) <> '')
      );
  end if;
end $$;

-- ============================================
-- 3. User reports: structured reasons
-- ============================================
alter table public.user_reports
  add column if not exists reason_code public.report_reason_code,
  add column if not exists reason_details text;

-- Backfill legacy rows so adding a NOT-EMPTY reason constraint won't fail.
update public.user_reports
set reason = 'Legacy report'
where
  (reason is null or btrim(reason) = '')
  and reason_code is null
  and (reason_details is null or btrim(reason_details) = '');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_reports_reason_required'
      and conrelid = 'public.user_reports'::regclass
  ) then
    alter table public.user_reports
      add constraint user_reports_reason_required
      check (
        (reason is not null and btrim(reason) <> '')
        or reason_code is not null
        or (reason_details is not null and btrim(reason_details) <> '')
      );
  end if;
end $$;
