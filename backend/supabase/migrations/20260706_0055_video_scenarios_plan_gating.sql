-- Migration: BLOCKER (MEDIUM) — paid video library is not gated
-- ============================================================================
-- The "Full video scenario library" is a Pro/Plus feature (pricing page), but
-- the RLS policy "video_scenarios_select_authenticated" is `using (true)`, so
-- every authenticated user — including Free — reads every scenario directly via
-- the REST API regardless of plan. isPro/isPlus were computed in the frontend
-- but consumed nowhere.
--
-- Fix: gate SELECT by plan using the existing get_user_plan(auth.uid()) helper.
--   * Pro / Plus  -> all active scenarios
--   * Free        -> a small teaser (the first N active scenarios) so the tab
--                    is not empty and the upgrade CTA has context.
--
-- The teaser membership is computed in a SECURITY DEFINER helper so the policy
-- does not recursively evaluate RLS on video_scenarios (a self-referential
-- subquery inside the table's own SELECT policy would recurse).
--
-- Frontend (shipped same release): LearnPage videos tab reads isPro and, for
-- Free users, shows the teaser plus an "Unlock full library" CTA to /app/pricing.
-- The client-side gate is defense-in-depth; this RLS policy is the real boundary.
--
-- NOTE: additive migration — does not edit 20260213_0031/0035. NOT yet applied to
-- a live database; apply and test on a Supabase branch before production. The
-- separate video answer-key exposure (correct_action/correct_sanction readable
-- pre-answer) is tracked as a remaining blocker and intentionally NOT bundled
-- here to keep this change small and testable.
-- ============================================================================

-- Number of active scenarios a Free user may preview.
create or replace function public.is_free_tier_video(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from (
      select id, row_number() over (order by created_at, id) as rn
      from public.video_scenarios
      where is_active = true
    ) ranked
    where ranked.id = p_id
      and ranked.rn <= 2
  );
$$;

revoke all on function public.is_free_tier_video(uuid) from public, anon;
grant execute on function public.is_free_tier_video(uuid) to authenticated;

drop policy if exists "video_scenarios_select_authenticated" on public.video_scenarios;

create policy "video_scenarios_select_by_plan"
  on public.video_scenarios for select
  to authenticated
  using (
    public.get_user_plan(auth.uid()) in ('pro', 'plus')
    or public.is_free_tier_video(id)
  );
