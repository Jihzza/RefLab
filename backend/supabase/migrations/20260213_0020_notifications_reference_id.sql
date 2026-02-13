-- Migration: add reference_id to notifications
-- Stores the ID of the related entity (post, test, etc.) so the frontend
-- can navigate to the relevant content when a notification is tapped.

alter table public.notifications
  add column reference_id uuid;

create index notifications_reference_id_idx on public.notifications(reference_id);
