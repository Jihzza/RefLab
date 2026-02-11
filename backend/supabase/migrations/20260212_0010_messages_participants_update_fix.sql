-- Migration: conversation_participants update hardening
-- Prevents update failures when legacy triggers expect updated_at

-- Ensure updated_at exists for trigger compatibility.
alter table public.conversation_participants
  add column if not exists updated_at timestamptz not null default now();

-- Recreate update trigger in a known-good state.
drop trigger if exists on_conversation_participants_updated on public.conversation_participants;
create trigger on_conversation_participants_updated
  before update on public.conversation_participants
  for each row execute function public.handle_updated_at();
