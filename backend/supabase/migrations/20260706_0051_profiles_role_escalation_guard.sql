-- Migration: BLOCKER (CRITICAL) — prevent privilege escalation via profiles.role
-- ============================================================================
-- The self-update policy "Users can update own profile" (20260123_0002) grants
-- UPDATE with `with check (id = auth.uid())` and NO column restriction, and no
-- trigger guards the `role` column. Any authenticated user could therefore run
--   update public.profiles set role = 'admin' where id = auth.uid()
-- and become an admin, because public.is_admin() keys off profiles.role. That
-- unlocks reading all profiles/PII, updating any profile, deleting any post, and
-- reading every moderation report.
--
-- Fix: a BEFORE UPDATE trigger that rejects any change to `role` unless the
-- current user is already an admin. RLS `with check` cannot compare against the
-- OLD row, so a trigger is the correct mechanism. Legitimate admin role changes
-- (via the "Admins can update any profile" policy) still pass because
-- public.is_admin() returns true for them.
--
-- NOTE: additive migration — does not edit 20260123_0001/0002. NOT yet applied
-- to a live database; apply and test on a Supabase branch before production.
-- ============================================================================

create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Not authorized to change account role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Runs alongside the existing on_profiles_updated (updated_at) trigger.
drop trigger if exists on_profiles_prevent_role_change on public.profiles;
create trigger on_profiles_prevent_role_change
  before update on public.profiles
  for each row
  execute function public.prevent_role_self_change();
