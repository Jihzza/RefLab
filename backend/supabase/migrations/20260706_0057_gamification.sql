-- Migration: Gamification persistence ("A Carreira do Árbitro")
-- ============================================================================
-- Authoritative, tamper-proof XP / streak / achievements. The frontend currently
-- DERIVES these from existing stats (see src/features/gamification/engine.ts) so
-- the UI is complete without this table; this migration is the production source
-- of truth. XP should be awarded server-side inside the existing SECURITY DEFINER
-- grading RPCs (grade_practice_answer, submit_test_attempt) via award_xp() so it
-- can never be forged from the client. The client's XP formula mirrors XP here.
--
-- NOTE: additive migration — does not edit prior migrations. NOT applied/tested
-- against a live database; apply on a Supabase branch and wire award_xp() into
-- the grading RPCs before relying on it.
-- ============================================================================

-- Per-user rollup (one row per user).
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  daily_xp integer not null default 0,
  daily_xp_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

drop policy if exists "user_stats_select_own" on public.user_stats;
create policy "user_stats_select_own"
  on public.user_stats for select
  using (user_id = auth.uid());
-- No client INSERT/UPDATE: only award_xp() (SECURITY DEFINER) mutates this table.

-- Append-only XP ledger (audit + recompute).
create table if not exists public.user_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('practice', 'test', 'video', 'daily_bonus')),
  xp integer not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists user_xp_events_user_created_idx
  on public.user_xp_events (user_id, created_at desc);

alter table public.user_xp_events enable row level security;

drop policy if exists "user_xp_events_select_own" on public.user_xp_events;
create policy "user_xp_events_select_own"
  on public.user_xp_events for select
  using (user_id = auth.uid());
-- No client writes: award_xp() inserts.

-- Unlocked achievements.
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

drop policy if exists "user_achievements_select_own" on public.user_achievements;
create policy "user_achievements_select_own"
  on public.user_achievements for select
  using (user_id = auth.uid());

-- Award XP for the current user and keep the rollup + daily counter in sync.
-- Called from the grading RPCs (server-side); never granted to clients directly
-- for arbitrary amounts — callers pass the XP the shared formula computed.
create or replace function public.award_xp(
  p_source text,
  p_xp integer,
  p_ref_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_xp is null or p_xp < 0 or p_xp > 500 then
    raise exception 'Invalid XP amount' using errcode = '22023';
  end if;

  insert into public.user_xp_events (user_id, source, xp, ref_id)
  values (v_uid, p_source, p_xp, p_ref_id);

  insert into public.user_stats (user_id, total_xp, daily_xp, daily_xp_date, updated_at)
  values (v_uid, p_xp, p_xp, v_today, now())
  on conflict (user_id) do update
  set total_xp = public.user_stats.total_xp + p_xp,
      daily_xp = case when public.user_stats.daily_xp_date = v_today
                      then public.user_stats.daily_xp + p_xp
                      else p_xp end,
      daily_xp_date = v_today,
      updated_at = now();
end;
$$;

revoke all on function public.award_xp(text, integer, uuid) from public, anon, authenticated;
-- Only other SECURITY DEFINER functions (the grading RPCs) call award_xp; it is
-- intentionally NOT granted to authenticated so clients cannot mint XP.

-- Read the player's stats (own row only).
create or replace function public.get_player_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select row_to_json(s) from public.user_stats s where s.user_id = auth.uid()),
    json_build_object('total_xp', 0, 'current_streak', 0, 'best_streak', 0, 'daily_xp', 0)
  );
$$;

revoke all on function public.get_player_stats() from public, anon;
grant execute on function public.get_player_stats() to authenticated;
