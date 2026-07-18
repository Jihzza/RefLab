-- Harden new user-generated-content writes and provide a private moderation
-- workflow without rewriting or truncating historical content.
--
-- Existing posts/comments/reports remain readable under the pre-existing
-- read contract. Length checks are implemented by column-specific triggers so
-- an unrelated metadata/count update never rejects a historical long row.

-- ---------------------------------------------------------------------------
-- Moderation metadata. Existing reports are intentionally retained as pending.
-- ---------------------------------------------------------------------------

create type public.ugc_report_status as enum (
  'pending',
  'reviewing',
  'actioned',
  'dismissed'
);

create type public.ugc_content_moderation_state as enum (
  'visible',
  'hidden'
);

alter table public.posts
  add column moderation_state public.ugc_content_moderation_state
    not null default 'visible',
  add column moderation_updated_at timestamptz,
  add column moderation_updated_by uuid references public.profiles(id) on delete set null,
  add column moderation_source_report_id uuid;

alter table public.post_comments
  add column moderation_state public.ugc_content_moderation_state
    not null default 'visible',
  add column moderation_updated_at timestamptz,
  add column moderation_updated_by uuid references public.profiles(id) on delete set null,
  add column moderation_source_report_id uuid;

alter table public.posts
  add constraint posts_moderation_metadata_consistent
  check (
    (
      moderation_state = 'visible'
      and moderation_updated_at is null
      and moderation_updated_by is null
      and moderation_source_report_id is null
    )
    or (
      moderation_state = 'hidden'
      and moderation_updated_at is not null
      and moderation_source_report_id is not null
    )
  ) not valid;

alter table public.post_comments
  add constraint comments_moderation_metadata_consistent
  check (
    (
      moderation_state = 'visible'
      and moderation_updated_at is null
      and moderation_updated_by is null
      and moderation_source_report_id is null
    )
    or (
      moderation_state = 'hidden'
      and moderation_updated_at is not null
      and moderation_source_report_id is not null
    )
  ) not valid;

alter table public.user_blocks
  add constraint user_blocks_no_self_v2
  check (blocker_id <> blocked_id) not valid;

alter table public.post_reports
  add column target_snapshot_id uuid,
  add column status public.ugc_report_status not null default 'pending',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles(id) on delete set null,
  add column review_note text,
  add column review_revision bigint not null default 0;

alter table public.comment_reports
  add column target_snapshot_id uuid,
  add column context_snapshot_id uuid,
  add column reason_code public.report_reason_code,
  add column reason_details text,
  add column status public.ugc_report_status not null default 'pending',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles(id) on delete set null,
  add column review_note text,
  add column review_revision bigint not null default 0;

alter table public.user_reports
  add column target_snapshot_id uuid,
  add column status public.ugc_report_status not null default 'pending',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles(id) on delete set null,
  add column review_note text,
  add column review_revision bigint not null default 0;

-- Preserve the report/review audit record if its target is later removed. The
-- immutable IDs retain correlation without copying deleted UGC or profile data.
update public.post_reports
   set target_snapshot_id = post_id;

update public.comment_reports as report
   set target_snapshot_id = report.comment_id,
       context_snapshot_id = comment.post_id
  from public.post_comments as comment
 where comment.id = report.comment_id;

update public.user_reports
   set target_snapshot_id = reported_user_id;

alter table public.post_reports
  alter column target_snapshot_id set not null,
  alter column post_id drop not null,
  alter column reporter_id drop not null,
  drop constraint if exists post_reports_post_id_fkey,
  drop constraint if exists post_reports_reporter_id_fkey,
  add constraint post_reports_post_id_fkey
    foreign key (post_id) references public.posts(id) on delete set null,
  add constraint post_reports_reporter_id_fkey
    foreign key (reporter_id) references public.profiles(id) on delete set null;

alter table public.comment_reports
  alter column target_snapshot_id set not null,
  alter column context_snapshot_id set not null,
  alter column comment_id drop not null,
  alter column reporter_id drop not null,
  drop constraint if exists comment_reports_comment_id_fkey,
  drop constraint if exists comment_reports_reporter_id_fkey,
  add constraint comment_reports_comment_id_fkey
    foreign key (comment_id) references public.post_comments(id) on delete set null,
  add constraint comment_reports_reporter_id_fkey
    foreign key (reporter_id) references public.profiles(id) on delete set null;

alter table public.user_reports
  alter column target_snapshot_id set not null,
  alter column reported_user_id drop not null,
  alter column reporter_id drop not null,
  drop constraint if exists user_reports_reported_user_id_fkey,
  drop constraint if exists user_reports_reporter_id_fkey,
  add constraint user_reports_reported_user_id_fkey
    foreign key (reported_user_id) references public.profiles(id) on delete set null,
  add constraint user_reports_reporter_id_fkey
    foreign key (reporter_id) references public.profiles(id) on delete set null;

-- A repost stores no independent body/media. SET NULL would therefore turn it
-- into an invalid empty post and fire the content trigger during account
-- deletion. Reposts follow the original lifecycle and are deleted recursively.
alter table public.posts
  drop constraint if exists posts_original_post_id_fkey,
  add constraint posts_original_post_id_fkey
    foreign key (original_post_id) references public.posts(id) on delete cascade;

-- Client operation IDs make post creation retry-safe across response loss and
-- reload reconciliation. Historical rows reuse their already-unique row ID.
alter table public.posts add column client_id uuid;
update public.posts set client_id = id where client_id is null;
alter table public.posts
  alter column client_id set default gen_random_uuid(),
  alter column client_id set not null;
create unique index posts_user_client_id_uidx
  on public.posts (user_id, client_id);

-- NOT VALID preserves any pre-existing invalid/long legacy row. PostgreSQL
-- still enforces these constraints for rows inserted or changed afterwards.
alter table public.comment_reports
  add constraint comment_reports_reason_required_v2
  check (
    (reason is not null and pg_catalog.btrim(reason) <> '')
    or reason_code is not null
    or (reason_details is not null and pg_catalog.btrim(reason_details) <> '')
  ) not valid;

alter table public.post_reports
  add constraint post_reports_review_note_limit
  check (review_note is null or pg_catalog.char_length(review_note) <= 1000)
  not valid,
  add constraint post_reports_review_revision_nonnegative
  check (review_revision >= 0) not valid;

alter table public.comment_reports
  add constraint comment_reports_review_note_limit
  check (review_note is null or pg_catalog.char_length(review_note) <= 1000)
  not valid,
  add constraint comment_reports_review_revision_nonnegative
  check (review_revision >= 0) not valid;

alter table public.user_reports
  add constraint user_reports_review_note_limit
  check (review_note is null or pg_catalog.char_length(review_note) <= 1000)
  not valid,
  add constraint user_reports_review_revision_nonnegative
  check (review_revision >= 0) not valid;

create index post_reports_moderation_queue_idx
  on public.post_reports (status, created_at desc, id desc);

create index post_reports_reporter_target_idx
  on public.post_reports (reporter_id, target_snapshot_id, created_at, id);

create index comment_reports_moderation_queue_idx
  on public.comment_reports (status, created_at desc, id desc);

create index comment_reports_reporter_target_idx
  on public.comment_reports (reporter_id, target_snapshot_id, created_at, id);

create index user_reports_moderation_queue_idx
  on public.user_reports (status, created_at desc, id desc);

create index user_reports_reporter_target_idx
  on public.user_reports (reporter_id, target_snapshot_id, created_at, id);

-- A target account becomes non-addressable as soon as either durable deletion
-- signal exists. This helper is intentionally private and not auth.uid-bound:
-- definer write/read paths need to evaluate the other party without exposing
-- the service-only deletion job table to browser roles.
create or replace function reflab_private.account_is_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_user_id is not null
     and exists (
       select 1
         from public.profiles as profile
        where profile.id = p_user_id
          and profile.deletion_started_at is null
     )
     and not exists (
       select 1
         from public.account_deletion_jobs as deletion_job
        where deletion_job.user_id = p_user_id
     );
$function$;

revoke all privileges
  on function reflab_private.account_is_active(uuid)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- New-write limits. These triggers do not fire for unrelated updates, so
-- historical content over a new limit remains intact and operable.
-- ---------------------------------------------------------------------------

create or replace function reflab_private.enforce_post_content_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  original_author_id uuid;
  original_visible boolean;
begin
  if new.content is not null
     and pg_catalog.char_length(new.content) > 2000 then
    raise exception 'Post content cannot exceed 2000 characters'
      using errcode = '22001';
  end if;

  if new.media_url is not null then
    -- Serialize reference creation with reference-aware Storage deletion.
    -- If deletion wins first this write fails the object-exists check; if this
    -- write wins, the deleter waits and then sees the committed reference.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'reflab:post-media-reference:' || new.media_url,
        0
      )
    );

    if pg_catalog.char_length(new.media_url) > 1024
       or pg_catalog.split_part(new.media_url, '/', 1) <> new.user_id::text
       or new.media_url like '/%'
       or new.media_url ~ '(^|/)\.\.?(/|$)'
       or not exists (
         select 1
           from storage.objects as object
          where object.bucket_id = 'post-media'
            and object.name = new.media_url
            and object.owner_id = new.user_id::text
       ) then
      raise exception 'Post media must be an existing object owned by its author'
        using errcode = '42501';
    end if;
  end if;

  if new.original_post_id is not null then
    if new.content is not null
       or new.media_url is not null
       or new.media_type <> 'text'::public.post_media_type then
      raise exception 'A repost cannot add separate content or media'
        using errcode = '22023';
    end if;

    select original.user_id, original.moderation_state = 'visible'
      into original_author_id, original_visible
      from public.posts as original
     where original.id = new.original_post_id;

    if original_author_id is null or not coalesce(original_visible, false) then
      raise exception 'Original post is unavailable' using errcode = '42501';
    end if;

    if not reflab_private.account_is_active(original_author_id) then
      raise exception 'Original post is unavailable' using errcode = '42501';
    end if;

    if exists (
      select 1
        from public.user_blocks as block
       where (
         block.blocker_id = new.user_id
         and block.blocked_id = original_author_id
       ) or (
         block.blocker_id = original_author_id
         and block.blocked_id = new.user_id
       )
    ) then
      raise exception 'A blocked account cannot be reposted'
        using errcode = '42501';
    end if;
  else
    if (new.content is null or pg_catalog.btrim(new.content) = '')
       and new.media_url is null then
      raise exception 'A post requires text or media'
        using errcode = '22023';
    end if;

    if new.media_type = 'text'::public.post_media_type
       and new.media_url is not null then
      raise exception 'Text posts cannot include media' using errcode = '22023';
    end if;

    if new.media_type <> 'text'::public.post_media_type
       and new.media_url is null then
      raise exception 'Media posts require an owned media object'
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$function$;

create trigger enforce_post_content_write
  before insert or update of content, media_type, media_url, original_post_id
  on public.posts
  for each row execute function reflab_private.enforce_post_content_write();

create or replace function reflab_private.enforce_comment_content_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  post_author_id uuid;
  post_visible boolean;
  parent_post_id uuid;
  parent_author_id uuid;
  parent_is_reply boolean;
  parent_visible boolean;
begin
  if new.content is null or pg_catalog.btrim(new.content) = '' then
    raise exception 'Comment content is required'
      using errcode = '22023';
  end if;

  if pg_catalog.char_length(new.content) > 1000 then
    raise exception 'Comment content cannot exceed 1000 characters'
      using errcode = '22001';
  end if;

  if tg_op = 'INSERT' then
    select post.user_id, post.moderation_state = 'visible'
      into post_author_id, post_visible
      from public.posts as post
     where post.id = new.post_id;

    if post_author_id is null or not coalesce(post_visible, false) then
      raise exception 'Post is unavailable' using errcode = '42501';
    end if;

    if not reflab_private.account_is_active(post_author_id) then
      raise exception 'Post is unavailable' using errcode = '42501';
    end if;

    if exists (
      select 1
        from public.user_blocks as block
       where (
         block.blocker_id = new.user_id
         and block.blocked_id = post_author_id
       ) or (
         block.blocker_id = post_author_id
         and block.blocked_id = new.user_id
       )
    ) then
      raise exception 'Comments are unavailable for a blocked account'
        using errcode = '42501';
    end if;

    if new.parent_comment_id is not null then
      select
        parent.post_id,
        parent.user_id,
        parent.parent_comment_id is not null,
        parent.moderation_state = 'visible'
        into
          parent_post_id,
          parent_author_id,
          parent_is_reply,
          parent_visible
        from public.post_comments as parent
       where parent.id = new.parent_comment_id;

      if parent_post_id is null
         or parent_post_id <> new.post_id
         or parent_is_reply
         or not coalesce(parent_visible, false) then
        raise exception 'Reply parent is unavailable or invalid'
          using errcode = '22023';
      end if;

      if not reflab_private.account_is_active(parent_author_id) then
        raise exception 'Reply parent is unavailable'
          using errcode = '42501';
      end if;

      if exists (
        select 1
          from public.user_blocks as block
         where (
           block.blocker_id = new.user_id
           and block.blocked_id = parent_author_id
         ) or (
           block.blocker_id = parent_author_id
           and block.blocked_id = new.user_id
         )
      ) then
        raise exception 'Replies are unavailable for a blocked account'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$function$;

create trigger enforce_comment_content_write
  before insert or update of content
  on public.post_comments
  for each row execute function reflab_private.enforce_comment_content_write();

create or replace function reflab_private.enforce_report_reason_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.reason is not null
     and pg_catalog.char_length(new.reason) > 500 then
    raise exception 'Report details cannot exceed 500 characters'
      using errcode = '22001';
  end if;

  if new.reason_details is not null
     and pg_catalog.char_length(new.reason_details) > 500 then
    raise exception 'Report details cannot exceed 500 characters'
      using errcode = '22001';
  end if;

  return new;
end;
$function$;

create trigger enforce_post_report_reason_write
  before insert or update of reason, reason_details
  on public.post_reports
  for each row execute function reflab_private.enforce_report_reason_write();

create trigger enforce_comment_report_reason_write
  before insert or update of reason, reason_details
  on public.comment_reports
  for each row execute function reflab_private.enforce_report_reason_write();

create trigger enforce_user_report_reason_write
  before insert or update of reason, reason_details
  on public.user_reports
  for each row execute function reflab_private.enforce_report_reason_write();

create or replace function reflab_private.enforce_report_not_self()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_author_id uuid;
  target_context_id uuid;
  idempotency_scope text;
begin
  -- FK ON DELETE SET NULL preserves the immutable evidence IDs. Permit only
  -- that exact target/reporter-clearing transition; no live target or
  -- snapshot metadata may change with it.
  if tg_op = 'UPDATE'
     and auth.uid() is null
     and old.reporter_id is not null
     and new.reporter_id is null
     and (pg_catalog.to_jsonb(new) - 'reporter_id')
       is not distinct from (pg_catalog.to_jsonb(old) - 'reporter_id')
     and (
       (tg_table_name = 'post_reports'
        and new.post_id is not distinct from old.post_id
        and new.target_snapshot_id is not distinct from old.target_snapshot_id)
       or (tg_table_name = 'comment_reports'
        and new.comment_id is not distinct from old.comment_id
        and new.target_snapshot_id is not distinct from old.target_snapshot_id
        and new.context_snapshot_id is not distinct from old.context_snapshot_id)
       or (tg_table_name = 'user_reports'
        and new.reported_user_id is not distinct from old.reported_user_id
        and new.target_snapshot_id is not distinct from old.target_snapshot_id)
     ) then
    return new;
  end if;

  if tg_op = 'UPDATE' and auth.uid() is null
     and tg_table_name = 'post_reports'
     and old.post_id is not null
     and new.post_id is null
     and (pg_catalog.to_jsonb(new) - 'post_id')
       is not distinct from (pg_catalog.to_jsonb(old) - 'post_id') then
    return new;
  elsif tg_op = 'UPDATE' and auth.uid() is null
     and tg_table_name = 'comment_reports'
     and old.comment_id is not null
     and new.comment_id is null
     and (pg_catalog.to_jsonb(new) - 'comment_id')
       is not distinct from (pg_catalog.to_jsonb(old) - 'comment_id') then
    return new;
  elsif tg_op = 'UPDATE' and auth.uid() is null
     and tg_table_name = 'user_reports'
     and old.reported_user_id is not null
     and new.reported_user_id is null
     and (pg_catalog.to_jsonb(new) - 'reported_user_id')
       is not distinct from (pg_catalog.to_jsonb(old) - 'reported_user_id') then
    return new;
  end if;

  if tg_table_name = 'post_reports' then
    select p.user_id
      into target_author_id
      from public.posts as p
     where p.id = new.post_id;
    if tg_op = 'INSERT' then
      new.target_snapshot_id := new.post_id;
      idempotency_scope := 'post';
    end if;
  elsif tg_table_name = 'comment_reports' then
    select c.user_id, c.post_id
      into target_author_id, target_context_id
      from public.post_comments as c
     where c.id = new.comment_id;
    if tg_op = 'INSERT' then
      new.target_snapshot_id := new.comment_id;
      new.context_snapshot_id := target_context_id;
      idempotency_scope := 'comment';
    end if;
  elsif tg_table_name = 'user_reports' then
    target_author_id := new.reported_user_id;
    if tg_op = 'INSERT' then
      new.target_snapshot_id := new.reported_user_id;
      idempotency_scope := 'user';
    end if;
  else
    raise exception 'Unsupported report table'
      using errcode = '0A000';
  end if;

  if target_author_id is null then
    raise exception 'Reported target was not found' using errcode = 'P0002';
  end if;

  if tg_op = 'UPDATE' and (
    new.target_snapshot_id is distinct from old.target_snapshot_id
    or (
      tg_table_name = 'comment_reports'
      and new.context_snapshot_id is distinct from old.context_snapshot_id
    )
  ) then
    raise exception 'Report target snapshots are immutable'
      using errcode = '22023';
  end if;

  if target_author_id = new.reporter_id then
    raise exception 'You cannot report your own content or account'
      using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'reflab:report:' || idempotency_scope || ':'
        || new.reporter_id::text || ':' || new.target_snapshot_id::text,
        0
      )
    );

    if (tg_table_name = 'post_reports' and exists (
      select 1 from public.post_reports as report
       where report.reporter_id = new.reporter_id
         and report.target_snapshot_id = new.target_snapshot_id
    )) or (tg_table_name = 'comment_reports' and exists (
      select 1 from public.comment_reports as report
       where report.reporter_id = new.reporter_id
         and report.target_snapshot_id = new.target_snapshot_id
    )) or (tg_table_name = 'user_reports' and exists (
      select 1 from public.user_reports as report
       where report.reporter_id = new.reporter_id
         and report.target_snapshot_id = new.target_snapshot_id
    )) then
      return null;
    end if;
  end if;

  return new;
end;
$function$;

create trigger enforce_post_report_not_self
  before insert or update of reporter_id, post_id
  on public.post_reports
  for each row execute function reflab_private.enforce_report_not_self();

create trigger enforce_comment_report_not_self
  before insert or update of reporter_id, comment_id
  on public.comment_reports
  for each row execute function reflab_private.enforce_report_not_self();

create trigger enforce_user_report_not_self
  before insert or update of reporter_id, reported_user_id
  on public.user_reports
  for each row execute function reflab_private.enforce_report_not_self();

create or replace function reflab_private.enforce_ugc_actor_active()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid;
  caller_uid uuid := auth.uid();
begin
  if tg_table_name = 'posts' or tg_table_name = 'post_comments' then
    actor_id := new.user_id;
  elsif tg_table_name in ('post_reports', 'comment_reports', 'user_reports') then
    actor_id := new.reporter_id;
  else
    raise exception 'Unsupported UGC table' using errcode = '0A000';
  end if;

  -- Trusted maintenance paths without an end-user subject remain possible.
  -- Every browser/RPC write is bound to the active signed subject.
  if caller_uid is not null then
    if actor_id is distinct from caller_uid then
      raise exception 'UGC actor does not match the active session'
        using errcode = '42501';
    end if;

    if not public.account_accepts_uploads(caller_uid) then
      raise exception 'Account deletion is in progress'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

-- Recent-write limits must survive source-row/object deletion. A private
-- append-only ledger records successful admissions transactionally; callers
-- cannot read or erase it, and bounded internal pruning removes only events
-- older than every active abuse window.
create table reflab_private.rate_limit_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (scope in (
    'post', 'comment', 'report', 'interaction', 'message',
    'upload_profile', 'upload_post', 'upload_message'
  )),
  created_at timestamptz not null default statement_timestamp()
);

create index rate_limit_events_actor_scope_created_idx
  on reflab_private.rate_limit_events (actor_id, scope, created_at desc);
create index rate_limit_events_created_idx
  on reflab_private.rate_limit_events (created_at, id);

revoke all privileges
  on table reflab_private.rate_limit_events
  from public, anon, authenticated, service_role;
revoke all privileges
  on sequence reflab_private.rate_limit_events_id_seq
  from public, anon, authenticated, service_role;

create or replace function reflab_private.consume_rate_limit_event(
  p_actor_id uuid,
  p_scope text,
  p_limit integer,
  p_window interval
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  recent_count bigint;
begin
  if p_actor_id is null
     or p_scope is null
     or p_limit is null or p_limit < 1
     or p_window is null or p_window <= interval '0 seconds' then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:durable-rate:' || p_scope || ':' || p_actor_id::text,
      0
    )
  );

  delete from reflab_private.rate_limit_events as expired
   where expired.id in (
     select stale.id
       from reflab_private.rate_limit_events as stale
      where stale.created_at
        < pg_catalog.statement_timestamp() - interval '2 days'
      order by stale.created_at, stale.id
      limit 1000
   );

  select pg_catalog.count(*)
    into recent_count
    from reflab_private.rate_limit_events as event
   where event.actor_id = p_actor_id
     and event.scope = p_scope
     and event.created_at
       >= pg_catalog.statement_timestamp() - p_window;

  if recent_count >= p_limit then
    return false;
  end if;

  insert into reflab_private.rate_limit_events (actor_id, scope)
  values (p_actor_id, p_scope);
  return true;
end;
$function$;

revoke all privileges
  on function reflab_private.consume_rate_limit_event(uuid, text, integer, interval)
  from public, anon, authenticated, service_role;

create or replace function reflab_private.enforce_ugc_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  rate_scope text;
  rate_allowed boolean;
begin
  if caller_uid is null then
    return new;
  end if;

  if tg_table_name = 'posts' then
    rate_scope := 'post';
  elsif tg_table_name = 'post_comments' then
    rate_scope := 'comment';
  else
    rate_scope := 'report';
  end if;

  if rate_scope = 'post' then
    rate_allowed := reflab_private.consume_rate_limit_event(
      caller_uid, rate_scope, 20, interval '10 minutes'
    );
    if not rate_allowed then
      raise exception 'Post rate limit reached; try again later'
        using errcode = 'P0001';
    end if;
  elsif rate_scope = 'comment' then
    rate_allowed := reflab_private.consume_rate_limit_event(
      caller_uid, rate_scope, 60, interval '10 minutes'
    );
    if not rate_allowed then
      raise exception 'Comment rate limit reached; try again later'
        using errcode = 'P0001';
    end if;
  else
    rate_allowed := reflab_private.consume_rate_limit_event(
      caller_uid, rate_scope, 20, interval '1 hour'
    );
    if not rate_allowed then
      raise exception 'Report rate limit reached; try again later'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$function$;

create trigger enforce_post_actor_active
  before insert on public.posts
  for each row execute function reflab_private.enforce_ugc_actor_active();
create trigger enforce_comment_actor_active
  before insert on public.post_comments
  for each row execute function reflab_private.enforce_ugc_actor_active();
create trigger enforce_post_report_actor_active
  before insert on public.post_reports
  for each row execute function reflab_private.enforce_ugc_actor_active();
create trigger enforce_comment_report_actor_active
  before insert on public.comment_reports
  for each row execute function reflab_private.enforce_ugc_actor_active();
create trigger enforce_user_report_actor_active
  before insert on public.user_reports
  for each row execute function reflab_private.enforce_ugc_actor_active();

create trigger enforce_post_rate_limit
  before insert on public.posts
  for each row execute function reflab_private.enforce_ugc_rate_limit();
create trigger enforce_comment_rate_limit
  before insert on public.post_comments
  for each row execute function reflab_private.enforce_ugc_rate_limit();
create trigger enforce_post_report_rate_limit
  before insert on public.post_reports
  for each row execute function reflab_private.enforce_ugc_rate_limit();
create trigger enforce_comment_report_rate_limit
  before insert on public.comment_reports
  for each row execute function reflab_private.enforce_ugc_rate_limit();
create trigger enforce_user_report_rate_limit
  before insert on public.user_reports
  for each row execute function reflab_private.enforce_ugc_rate_limit();

create or replace function reflab_private.enforce_social_interaction_write()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  target_author_id uuid;
  parent_post_author_id uuid;
  target_visible boolean;
  parent_post_visible boolean;
begin
  if caller_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.account_accepts_uploads(caller_uid) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if tg_table_name = 'user_follows' then
    if new.follower_id is distinct from caller_uid
       or new.following_id is null
       or new.following_id = caller_uid then
      raise exception 'Invalid follow relationship' using errcode = '22023';
    end if;
    target_author_id := new.following_id;
  elsif tg_table_name in ('post_likes', 'post_saves') then
    if new.user_id is distinct from caller_uid then
      raise exception 'Interaction owner does not match the active session'
        using errcode = '42501';
    end if;

    select post.user_id, post.moderation_state = 'visible'
      into target_author_id, target_visible
      from public.posts as post
     where post.id = new.post_id;

    if target_author_id is null or not coalesce(target_visible, false) then
      raise exception 'Post is unavailable' using errcode = '42501';
    end if;
  elsif tg_table_name = 'comment_likes' then
    if new.user_id is distinct from caller_uid then
      raise exception 'Interaction owner does not match the active session'
        using errcode = '42501';
    end if;

    select
      comment.user_id,
      comment.moderation_state = 'visible',
      post.user_id,
      post.moderation_state = 'visible'
      into
        target_author_id,
        target_visible,
        parent_post_author_id,
        parent_post_visible
      from public.post_comments as comment
      join public.posts as post on post.id = comment.post_id
     where comment.id = new.comment_id;

    if target_author_id is null
       or not coalesce(target_visible, false)
       or not coalesce(parent_post_visible, false) then
      raise exception 'Comment is unavailable' using errcode = '42501';
    end if;
  else
    raise exception 'Unsupported social interaction table'
      using errcode = '0A000';
  end if;

  if not reflab_private.account_is_active(target_author_id)
     or (
       parent_post_author_id is not null
       and not reflab_private.account_is_active(parent_post_author_id)
     ) then
    raise exception 'Interaction target is unavailable' using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.user_blocks as block
     where (
       block.blocker_id = caller_uid
       and block.blocked_id = target_author_id
     ) or (
       block.blocker_id = target_author_id
       and block.blocked_id = caller_uid
     ) or (
       parent_post_author_id is not null
       and block.blocker_id = caller_uid
       and block.blocked_id = parent_post_author_id
     ) or (
       parent_post_author_id is not null
       and block.blocker_id = parent_post_author_id
       and block.blocked_id = caller_uid
     )
  ) then
    raise exception 'Interaction is unavailable for a blocked account'
      using errcode = '42501';
  end if;

  if not reflab_private.consume_rate_limit_event(
    caller_uid, 'interaction', 120, interval '10 minutes'
  ) then
    raise exception 'Interaction rate limit reached; try again later'
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_follow_relationship on public.user_follows;
create trigger enforce_follow_relationship
  before insert on public.user_follows
  for each row execute function reflab_private.enforce_social_interaction_write();

drop trigger if exists enforce_post_like_target on public.post_likes;
create trigger enforce_post_like_target
  before insert on public.post_likes
  for each row execute function reflab_private.enforce_social_interaction_write();

drop trigger if exists enforce_post_save_target on public.post_saves;
create trigger enforce_post_save_target
  before insert on public.post_saves
  for each row execute function reflab_private.enforce_social_interaction_write();

drop trigger if exists enforce_comment_like_target on public.comment_likes;
create trigger enforce_comment_like_target
  before insert on public.comment_likes
  for each row execute function reflab_private.enforce_social_interaction_write();

create or replace function reflab_private.enforce_message_write_rate()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
begin
  if new.content is not null and pg_catalog.char_length(new.content) > 4000 then
    raise exception 'Message content cannot exceed 4000 characters'
      using errcode = '22001';
  end if;

  if new.content is null and new.media_url is null then
    raise exception 'Message content or media is required'
      using errcode = '22023';
  end if;

  -- Trusted fixture/maintenance writes do not carry an end-user subject.
  if caller_uid is null then
    return new;
  end if;

  if new.sender_id is distinct from caller_uid then
    raise exception 'Message sender does not match the active session'
      using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(caller_uid) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if new.media_url is not null then
    if (storage.foldername(new.media_url))[1]
         is distinct from new.conversation_id::text
       or (storage.foldername(new.media_url))[2]
         is distinct from caller_uid::text
       or pg_catalog.split_part(storage.filename(new.media_url), '.', 1)
         is distinct from new.client_id::text
       or new.media_url ~ '(^|/)\.\.?(/|$)' then
      raise exception 'Invalid message media path' using errcode = '22023';
    end if;

    -- Serialize reference creation with direct orphan deletion. If deletion
    -- commits first, the fresh existence check below fails; if this INSERT
    -- commits first, the deleter waits and then observes the durable message.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'reflab:message-media-reference:' || new.media_url,
        0
      )
    );

    if not exists (
      select 1
        from storage.objects as object
       where object.bucket_id = 'message-media'
         and object.name = new.media_url
         and object.owner_id = caller_uid::text
    ) then
      raise exception 'Message media upload was not found or is not owned by the sender'
        using errcode = '42501';
    end if;
  end if;

  -- Serialize the idempotency decision with the rate-limit count. Without the
  -- lock first, a concurrent retry can miss the first row and then fail at the
  -- boundary even though the unique client ID makes it the same operation.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:message-rate:' || caller_uid::text,
      0
    )
  );

  -- Exact client-id retries remain idempotent even after the rate window fills.
  if exists (
    select 1
      from public.messages as existing
     where existing.sender_id = caller_uid
       and existing.client_id = new.client_id
  ) then
    return new;
  end if;

  if not reflab_private.consume_rate_limit_event(
    caller_uid, 'message', 60, interval '10 minutes'
  ) then
    raise exception 'Message rate limit reached; try again later'
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_message_write_rate on public.messages;
create trigger enforce_message_write_rate
  before insert on public.messages
  for each row execute function reflab_private.enforce_message_write_rate();

revoke all privileges
  on function reflab_private.enforce_message_write_rate()
  from public, anon, authenticated, service_role;

-- A conversation owns exactly one durable new-message delivery row. The
-- notifications page marks rows read as soon as they are shown, so limiting
-- deduplication to unread rows would still create one row per message. Remove
-- historical duplicates before making the invariant concurrency-safe.
with ranked_new_message_notifications as (
  select
    notification.id,
    pg_catalog.row_number() over (
      partition by
        notification.user_id,
        notification.type,
        notification.reference_id
      order by notification.created_at desc, notification.id desc
    ) as duplicate_ordinal
  from public.notifications as notification
  where notification.type = 'new_message'
    and notification.reference_id is not null
)
delete from public.notifications as notification
using ranked_new_message_notifications as ranked
where notification.id = ranked.id
  and ranked.duplicate_ordinal > 1;

create unique index if not exists notifications_new_message_conversation_uidx
  on public.notifications (user_id, type, reference_id)
  where type = 'new_message' and reference_id is not null;

-- Likes/follows/reposts and comment-family events may be toggled or recreated.
-- Keep one durable delivery row per relationship instead of allowing every
-- delete/insert cycle to grow unread notification history without bound.
with ranked_relational_notifications as (
  select
    notification.id,
    pg_catalog.row_number() over (
      partition by
        notification.user_id,
        notification.actor_id,
        notification.type,
        coalesce(
          notification.reference_id,
          '00000000-0000-0000-0000-000000000000'::uuid
        )
      order by notification.created_at desc, notification.id desc
    ) as duplicate_ordinal
  from public.notifications as notification
  where notification.actor_id is not null
    and notification.type in (
      'liked_post', 'comment_on_post', 'reply_to_comment',
      'mentioned_in_comment', 'reposted_post', 'new_follower'
    )
)
delete from public.notifications as notification
using ranked_relational_notifications as ranked
where notification.id = ranked.id
  and ranked.duplicate_ordinal > 1;

create unique index if not exists notifications_relational_event_uidx
  on public.notifications (
    user_id,
    actor_id,
    type,
    (coalesce(reference_id, '00000000-0000-0000-0000-000000000000'::uuid))
  )
  where actor_id is not null
    and type in (
      'liked_post', 'comment_on_post', 'reply_to_comment',
      'mentioned_in_comment', 'reposted_post', 'new_follower'
    );

create or replace function public.create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_reference_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  notification_id uuid;
  notification_enabled boolean;
begin
  if p_user_id is null then
    raise exception 'Notification recipient is required' using errcode = '22023';
  end if;

  if p_actor_id is not null and p_actor_id = p_user_id then
    return null;
  end if;

  -- Central producer choke point: no legacy or future trigger may persist or
  -- broadcast a notification to a deleting recipient or across a block.
  if not reflab_private.account_is_active(p_user_id) then
    return null;
  end if;

  if p_actor_id is not null and (
    not reflab_private.account_is_active(p_actor_id)
    or exists (
      select 1
        from public.user_blocks as block
       where (
         block.blocker_id = p_actor_id and block.blocked_id = p_user_id
       ) or (
         block.blocker_id = p_user_id and block.blocked_id = p_actor_id
       )
    )
  ) then
    return null;
  end if;

  select preference.enabled
    into notification_enabled
    from public.notification_preferences as preference
   where preference.user_id = p_user_id
     and preference.notification_type = p_type;

  if notification_enabled is false then
    return null;
  end if;

  if p_type = 'new_message' and p_reference_id is not null then
    insert into public.notifications (
      user_id,
      actor_id,
      type,
      title,
      message,
      reference_id,
      read,
      dismissed_permanently,
      next_reminder_at,
      created_at,
      updated_at
    ) values (
      p_user_id,
      p_actor_id,
      p_type,
      p_title,
      p_message,
      p_reference_id,
      false,
      false,
      null,
      pg_catalog.statement_timestamp(),
      pg_catalog.statement_timestamp()
    )
    on conflict (user_id, type, reference_id)
      where type = 'new_message' and reference_id is not null
    do update
       set actor_id = excluded.actor_id,
           title = excluded.title,
           message = excluded.message,
           read = false,
           dismissed_permanently = false,
           next_reminder_at = null,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at
    returning id into notification_id;
  elsif p_actor_id is not null and p_type in (
    'liked_post', 'comment_on_post', 'reply_to_comment',
    'mentioned_in_comment', 'reposted_post', 'new_follower'
  ) then
    insert into public.notifications (
      user_id,
      actor_id,
      type,
      title,
      message,
      reference_id,
      read,
      dismissed_permanently,
      next_reminder_at,
      created_at,
      updated_at
    ) values (
      p_user_id,
      p_actor_id,
      p_type,
      p_title,
      p_message,
      p_reference_id,
      false,
      false,
      null,
      pg_catalog.statement_timestamp(),
      pg_catalog.statement_timestamp()
    )
    on conflict (
      user_id,
      actor_id,
      type,
      (coalesce(reference_id, '00000000-0000-0000-0000-000000000000'::uuid))
    ) where actor_id is not null
      and type in (
        'liked_post', 'comment_on_post', 'reply_to_comment',
        'mentioned_in_comment', 'reposted_post', 'new_follower'
      )
    do update
       set title = excluded.title,
           message = excluded.message,
           read = false,
           dismissed_permanently = false,
           next_reminder_at = null,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at
    returning id into notification_id;
  else
    insert into public.notifications (
      user_id,
      actor_id,
      type,
      title,
      message,
      reference_id
    ) values (
      p_user_id,
      p_actor_id,
      p_type,
      p_title,
      p_message,
      p_reference_id
    )
    returning id into notification_id;
  end if;

  return notification_id;
end;
$function$;

revoke all privileges
  on function public.create_notification(uuid, uuid, text, text, text, uuid)
  from public, anon, authenticated, service_role;
grant execute
  on function public.create_notification(uuid, uuid, text, text, text, uuid)
  to service_role;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  recipient_id uuid;
begin
  select case
    when conversation.user_a_id = new.sender_id then conversation.user_b_id
    when conversation.user_b_id = new.sender_id then conversation.user_a_id
    else null
  end
    into recipient_id
    from public.conversations as conversation
   where conversation.id = new.conversation_id;

  if recipient_id is null or recipient_id = new.sender_id then
    return new;
  end if;

  perform public.create_notification(
    recipient_id,
    new.sender_id,
    'new_message',
    'New Message',
    'sent you a message',
    new.conversation_id
  );

  return new;
end;
$function$;

revoke all privileges
  on function public.notify_new_message()
  from public, anon, authenticated, service_role;

create index if not exists notifications_user_created_id_idx
  on public.notifications (user_id, created_at desc, id desc);

drop policy if exists "Users can read own notifications"
  on public.notifications;
drop policy if exists "Active users can read own notifications"
  on public.notifications;
create policy "Active users can read own notifications"
  on public.notifications
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.account_accepts_uploads((select auth.uid()))
  );

drop policy if exists "Users can update own notifications"
  on public.notifications;
drop policy if exists "Active users can update own notifications"
  on public.notifications;
create policy "Active users can update own notifications"
  on public.notifications
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.account_accepts_uploads((select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and public.account_accepts_uploads((select auth.uid()))
  );

create or replace function reflab_private.prune_notification_retention()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  -- Notifications are delivery UI, not the underlying message/report record.
  -- Retain unread rows; prune acknowledged rows after 180 days and keep at
  -- most the newest 500 acknowledged rows per user between time cutoffs.
  delete from public.notifications as notification
   where notification.user_id = new.user_id
     and (notification.read or notification.dismissed_permanently)
     and (
       notification.created_at < pg_catalog.statement_timestamp() - interval '180 days'
       or notification.id in (
         select older.id
           from public.notifications as older
          where older.user_id = new.user_id
            and (older.read or older.dismissed_permanently)
          order by older.created_at desc, older.id desc
         offset 500
       )
     );

  return new;
end;
$function$;

drop trigger if exists prune_notification_retention
  on public.notifications;
create trigger prune_notification_retention
  after insert on public.notifications
  for each row execute function reflab_private.prune_notification_retention();

revoke all privileges
  on function reflab_private.prune_notification_retention()
  from public, anon, authenticated, service_role;

create or replace function reflab_private.protect_ugc_moderation_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- ON DELETE SET NULL for a former moderator is executed by the trusted
  -- deletion worker without an end-user subject. Permit only that one-column
  -- provenance transition; visibility, timestamp and source stay immutable.
  if tg_op = 'UPDATE'
     and auth.uid() is null
     and old.moderation_updated_by is not null
     and new.moderation_updated_by is null
     and new.moderation_state is not distinct from old.moderation_state
     and new.moderation_updated_at is not distinct from old.moderation_updated_at
     and new.moderation_source_report_id
       is not distinct from old.moderation_source_report_id then
    return new;
  end if;

  -- Normal RPC creates rely on the schema defaults. They may insert only a
  -- visible row with no administrator-owned provenance. Any attempt to seed
  -- hidden state or forge moderation provenance goes through the signed,
  -- active administrator branch below.
  if tg_op = 'INSERT'
     and new.moderation_state = 'visible'
     and new.moderation_updated_at is null
     and new.moderation_updated_by is null
     and new.moderation_source_report_id is null then
    return new;
  end if;

  if not coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  ) or not public.account_accepts_uploads(auth.uid()) then
    raise exception 'Only administrators can change moderation visibility'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

create trigger protect_post_moderation_metadata_insert
  before insert on public.posts
  for each row execute function reflab_private.protect_ugc_moderation_metadata();

create trigger protect_post_moderation_metadata
  before update of
    moderation_state,
    moderation_updated_at,
    moderation_updated_by,
    moderation_source_report_id
  on public.posts
  for each row execute function reflab_private.protect_ugc_moderation_metadata();

create trigger protect_comment_moderation_metadata_insert
  before insert on public.post_comments
  for each row execute function reflab_private.protect_ugc_moderation_metadata();

create trigger protect_comment_moderation_metadata
  before update of
    moderation_state,
    moderation_updated_at,
    moderation_updated_by,
    moderation_source_report_id
  on public.post_comments
  for each row execute function reflab_private.protect_ugc_moderation_metadata();

create or replace function reflab_private.protect_report_review_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- Preserve review evidence when a reviewer account is removed. As above,
  -- this trusted transition may clear only the nullable reviewer FK.
  if tg_op = 'UPDATE'
     and auth.uid() is null
     and old.reviewed_by is not null
     and new.reviewed_by is null
     and new.status is not distinct from old.status
     and new.reviewed_at is not distinct from old.reviewed_at
     and new.review_note is not distinct from old.review_note
     and new.review_revision is not distinct from old.review_revision then
    return new;
  end if;

  if tg_op = 'INSERT'
     and new.status = 'pending'
     and new.reviewed_at is null
     and new.reviewed_by is null
     and new.review_note is null
     and new.review_revision = 0 then
    return new;
  end if;

  if not coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  ) then
    raise exception 'Only administrators can change report review metadata'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

create trigger protect_post_report_review_insert
  before insert on public.post_reports
  for each row execute function reflab_private.protect_report_review_metadata();
create trigger protect_post_report_review_update
  before update of status, reviewed_at, reviewed_by, review_note, review_revision
  on public.post_reports
  for each row execute function reflab_private.protect_report_review_metadata();

create trigger protect_comment_report_review_insert
  before insert on public.comment_reports
  for each row execute function reflab_private.protect_report_review_metadata();
create trigger protect_comment_report_review_update
  before update of status, reviewed_at, reviewed_by, review_note, review_revision
  on public.comment_reports
  for each row execute function reflab_private.protect_report_review_metadata();

create trigger protect_user_report_review_insert
  before insert on public.user_reports
  for each row execute function reflab_private.protect_report_review_metadata();
create trigger protect_user_report_review_update
  before update of status, reviewed_at, reviewed_by, review_note, review_revision
  on public.user_reports
  for each row execute function reflab_private.protect_report_review_metadata();

create or replace function reflab_private.recompute_post_comment_count(
  p_post_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  locked_post_id uuid;
begin
  -- A separate lock statement makes a waiter take a fresh READ COMMITTED
  -- snapshot for the subsequent count after the previous writer commits.
  select post.id
    into locked_post_id
    from public.posts as post
   where post.id = p_post_id
   for update;

  if locked_post_id is null then
    return;
  end if;

  update public.posts as post
     set comment_count = (
       select pg_catalog.count(*)::integer
         from public.post_comments as comment
         left join public.post_comments as parent
           on parent.id = comment.parent_comment_id
        where comment.post_id = p_post_id
          and comment.moderation_state = 'visible'
          and (
            comment.parent_comment_id is null
            or parent.moderation_state = 'visible'
          )
     )
   where post.id = p_post_id;
end;
$function$;

create or replace function public.handle_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform reflab_private.recompute_post_comment_count(
    case when tg_op = 'DELETE' then old.post_id else new.post_id end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

create or replace function reflab_private.sync_hidden_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.moderation_state is distinct from new.moderation_state then
    perform reflab_private.recompute_post_comment_count(new.post_id);
  end if;
  return new;
end;
$function$;

create trigger sync_hidden_comment_count
  after update of moderation_state
  on public.post_comments
  for each row execute function reflab_private.sync_hidden_comment_count();

create or replace function reflab_private.recompute_post_repost_count(
  p_original_post_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  locked_post_id uuid;
begin
  select post.id
    into locked_post_id
    from public.posts as post
   where post.id = p_original_post_id
   for update;

  if locked_post_id is null then
    return;
  end if;

  update public.posts as original
     set repost_count = (
       select pg_catalog.count(*)::integer
         from public.posts as repost
        where repost.original_post_id = p_original_post_id
          and repost.moderation_state = 'visible'
     )
   where original.id = p_original_post_id;
end;
$function$;

create or replace function public.handle_post_repost_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  original_id uuid := case
    when tg_op = 'DELETE' then old.original_post_id
    else new.original_post_id
  end;
begin
  if original_id is not null then
    perform reflab_private.recompute_post_repost_count(original_id);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

create or replace function reflab_private.sync_hidden_repost_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.original_post_id is not null
     and old.moderation_state is distinct from new.moderation_state then
    perform reflab_private.recompute_post_repost_count(new.original_post_id);
  end if;
  return new;
end;
$function$;

drop trigger if exists sync_hidden_repost_count on public.posts;
create trigger sync_hidden_repost_count
  after update of moderation_state
  on public.posts
  for each row execute function reflab_private.sync_hidden_repost_count();

revoke all privileges
  on function
    public.handle_post_comment_count(),
    public.handle_post_repost_count(),
    reflab_private.recompute_post_comment_count(uuid),
    reflab_private.recompute_post_repost_count(uuid),
    reflab_private.sync_hidden_repost_count()
  from public, anon, authenticated, service_role;

-- RLS-safe visibility predicate. SECURITY DEFINER is required because a user
-- can read only blocks they created; policy evaluation must also see blocks
-- created by the other party. The caller cannot choose the viewer identity.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select public.account_accepts_uploads(auth.uid())
     and coalesce(
       (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
       false
     );
$function$;

revoke all privileges
  on function public.is_admin()
  from public, anon, authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

create or replace function public.can_view_ugc_author(p_author_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
     and p_author_id is not null
     and public.account_accepts_uploads(auth.uid())
     and reflab_private.account_is_active(p_author_id)
     and (
       p_author_id = auth.uid()
       or public.is_admin()
       or not exists (
         select 1
           from public.user_blocks as block
          where (
            block.blocker_id = auth.uid()
            and block.blocked_id = p_author_id
          ) or (
            block.blocker_id = p_author_id
            and block.blocked_id = auth.uid()
          )
       )
     );
$function$;

revoke all privileges
  on function public.can_view_ugc_author(uuid)
  from public, anon, authenticated, service_role;

grant execute
  on function public.can_view_ugc_author(uuid)
  to authenticated;

-- Conversation creation always attempts the canonical INSERT even when the
-- pair already exists. A BEFORE trigger therefore closes both the new and
-- existing get_or_create paths without trusting a caller-supplied recipient.
create or replace function reflab_private.enforce_active_conversation_pair()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- A profile FK uses ON DELETE SET NULL so a surviving participant keeps
  -- their history. Permit only the exact trusted FK tombstone transition;
  -- browser roles cannot use this branch to replace or clear endpoints.
  if tg_op = 'UPDATE'
     and auth.uid() is null
     and (
       (
         old.user_a_id is not null
         and new.user_a_id is null
         and (pg_catalog.to_jsonb(new) - 'user_a_id')
           is not distinct from (pg_catalog.to_jsonb(old) - 'user_a_id')
       )
       or (
         old.user_b_id is not null
         and new.user_b_id is null
         and (pg_catalog.to_jsonb(new) - 'user_b_id')
           is not distinct from (pg_catalog.to_jsonb(old) - 'user_b_id')
       )
     ) then
    return new;
  end if;

  if not reflab_private.account_is_active(new.user_a_id)
     or not reflab_private.account_is_active(new.user_b_id) then
    raise exception 'Recipient is unavailable' using errcode = '42501';
  end if;

  return new;
end;
$function$;

revoke all privileges
  on function reflab_private.enforce_active_conversation_pair()
  from public, anon, authenticated, service_role;

drop trigger if exists enforce_active_conversation_pair
  on public.conversations;
create trigger enforce_active_conversation_pair
  before insert or update of user_a_id, user_b_id
  on public.conversations
  for each row execute function
    reflab_private.enforce_active_conversation_pair();

-- Existing conversations are checked again at send time. This is the common
-- gate for text messages and attachments; because it is a BEFORE INSERT
-- trigger, the notification AFTER trigger cannot run after a rejection.
create or replace function public.enforce_messaging_privacy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  other_user_id uuid;
  recipient_privacy public.messaging_privacy;
  recipient_follows_sender boolean;
  sender_follows_recipient boolean;
begin
  select case
    when conversation.user_a_id = new.sender_id
      then conversation.user_b_id
    when conversation.user_b_id = new.sender_id
      then conversation.user_a_id
    else null
  end
    into other_user_id
    from public.conversations as conversation
   where conversation.id = new.conversation_id;

  if other_user_id is null or not exists (
    select 1
      from public.conversation_participants as participant
     where participant.conversation_id = new.conversation_id
       and participant.user_id = new.sender_id
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not reflab_private.account_is_active(other_user_id) then
    raise exception 'Recipient is unavailable' using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.user_blocks as block
     where (
       block.blocker_id = new.sender_id
       and block.blocked_id = other_user_id
     ) or (
       block.blocker_id = other_user_id
       and block.blocked_id = new.sender_id
     )
  ) then
    raise exception 'Message not sent' using errcode = 'P0001';
  end if;

  select settings.messaging_privacy
    into recipient_privacy
    from public.user_settings as settings
   where settings.user_id = other_user_id;

  recipient_privacy := coalesce(
    recipient_privacy,
    'everyone'::public.messaging_privacy
  );

  if recipient_privacy = 'nobody'::public.messaging_privacy then
    raise exception 'This user has disabled direct messages'
      using errcode = 'P0001';
  end if;

  if recipient_privacy in (
    'following'::public.messaging_privacy,
    'mutual'::public.messaging_privacy
  ) then
    select exists (
      select 1
        from public.user_follows as follow
       where follow.follower_id = other_user_id
         and follow.following_id = new.sender_id
    ) into recipient_follows_sender;

    if not recipient_follows_sender then
      raise exception
        'This user only accepts messages from people they follow'
        using errcode = 'P0001';
    end if;
  end if;

  if recipient_privacy = 'mutual'::public.messaging_privacy then
    select exists (
      select 1
        from public.user_follows as follow
       where follow.follower_id = new.sender_id
         and follow.following_id = other_user_id
    ) into sender_follows_recipient;

    if not sender_follows_recipient then
      raise exception 'This user only accepts messages from mutual followers'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$function$;

revoke all privileges
  on function public.enforce_messaging_privacy()
  from public, anon, authenticated, service_role;

drop policy if exists "Users can insert own follows" on public.user_follows;
drop policy if exists "Users can insert safe follows" on public.user_follows;
create policy "Users can insert safe follows"
  on public.user_follows
  for insert
  to authenticated
  with check (
    follower_id = (select auth.uid())
    and follower_id <> following_id
    and public.account_accepts_uploads((select auth.uid()))
    and public.can_view_ugc_author(following_id)
  );

drop policy if exists "Authenticated users can read profiles"
  on public.profiles;
drop policy if exists "Authenticated users can read unblocked profiles"
  on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Authenticated users can read unblocked profiles"
  on public.profiles
  for select
  to authenticated
  using (public.can_view_ugc_author(id));

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Active users can update own profile" on public.profiles;
create policy "Active users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (
    id = (select auth.uid())
    and public.account_accepts_uploads((select auth.uid()))
  )
  with check (
    id = (select auth.uid())
    and public.account_accepts_uploads((select auth.uid()))
  );

drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read visible posts"
  on public.posts
  for select
  to authenticated
  using (
    public.account_accepts_uploads((select auth.uid()))
    and (
      public.is_admin()
      or user_id = (select auth.uid())
      or (
        moderation_state = 'visible'
        and public.can_view_ugc_author(user_id)
      )
    )
  );

drop policy if exists "Authenticated users can read comments"
  on public.post_comments;
create policy "Authenticated users can read visible comments"
  on public.post_comments
  for select
  to authenticated
  using (
    public.account_accepts_uploads((select auth.uid()))
    and (
      public.is_admin()
      or user_id = (select auth.uid())
      or (
        moderation_state = 'visible'
        and public.can_view_ugc_author(user_id)
        and exists (
          select 1
            from public.posts as parent_post
           where parent_post.id = post_comments.post_id
             and (
               parent_post.user_id = (select auth.uid())
               or (
                 parent_post.moderation_state = 'visible'
                 and public.can_view_ugc_author(parent_post.user_id)
               )
             )
        )
      )
    )
  );

drop policy if exists "Authenticated users can read post likes"
  on public.post_likes;
create policy "Active users can read visible post likes"
  on public.post_likes
  for select
  to authenticated
  using (
    public.account_accepts_uploads((select auth.uid()))
    and exists (
      select 1
        from public.posts as liked_post
       where liked_post.id = post_likes.post_id
         and liked_post.moderation_state = 'visible'
         and public.can_view_ugc_author(liked_post.user_id)
    )
  );

drop policy if exists "Users can read own saves" on public.post_saves;
create policy "Active users can read own saves"
  on public.post_saves
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.account_accepts_uploads((select auth.uid()))
  );

drop policy if exists "Authenticated users can read comment likes"
  on public.comment_likes;
create policy "Active users can read visible comment likes"
  on public.comment_likes
  for select
  to authenticated
  using (
    public.account_accepts_uploads((select auth.uid()))
    and exists (
      select 1
        from public.post_comments as liked_comment
        join public.posts as parent_post on parent_post.id = liked_comment.post_id
       where liked_comment.id = comment_likes.comment_id
         and liked_comment.moderation_state = 'visible'
         and parent_post.moderation_state = 'visible'
         and public.can_view_ugc_author(liked_comment.user_id)
         and public.can_view_ugc_author(parent_post.user_id)
    )
  );

drop policy if exists "Authenticated users can read follows"
  on public.user_follows;
create policy "Active users can read unblocked follows"
  on public.user_follows
  for select
  to authenticated
  using (
    public.account_accepts_uploads((select auth.uid()))
    and public.can_view_ugc_author(follower_id)
    and public.can_view_ugc_author(following_id)
  );

drop policy if exists "Users can read own blocks" on public.user_blocks;
create policy "Active users can read own blocks"
  on public.user_blocks
  for select
  to authenticated
  using (
    blocker_id = (select auth.uid())
    and public.account_accepts_uploads((select auth.uid()))
  );

revoke all privileges
  on function
    reflab_private.enforce_post_content_write(),
    reflab_private.enforce_comment_content_write(),
    reflab_private.enforce_report_reason_write(),
    reflab_private.enforce_report_not_self(),
    reflab_private.enforce_ugc_actor_active(),
    reflab_private.enforce_ugc_rate_limit(),
    reflab_private.enforce_social_interaction_write(),
    reflab_private.protect_ugc_moderation_metadata(),
    reflab_private.protect_report_review_metadata(),
    reflab_private.sync_hidden_comment_count()
  from public, anon, authenticated, service_role;

-- Bound new public profile fields without rewriting historical rows. External
-- legacy photo URLs remain stored for audit/migration, but a new photo write
-- must point to an owned local Storage object (path preferred; the exact
-- production Supabase public URL is accepted only for old-bundle cutover).
create or replace function reflab_private.enforce_profile_public_write()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  canonical_path text;
  production_prefix constant text :=
    'https://iqebkyjcoqggwhausgje.supabase.co/storage/v1/object/public/profile-media/';
begin
  if tg_op = 'INSERT' or new.name is distinct from old.name then
    new.name := nullif(pg_catalog.btrim(new.name), '');
    if new.name is not null and pg_catalog.char_length(new.name) > 100 then
      raise exception 'Profile name cannot exceed 100 characters'
        using errcode = '22001';
    end if;
  end if;

  if tg_op = 'INSERT' or new.photo_url is distinct from old.photo_url then
    if new.photo_url is null then
      return new;
    end if;

    if new.photo_url like production_prefix || '%' then
      canonical_path := pg_catalog.substring(
        new.photo_url
        from pg_catalog.char_length(production_prefix) + 1
      );
    elsif new.photo_url !~ '^[a-z][a-z0-9+.-]*://' then
      canonical_path := new.photo_url;
    else
      raise exception 'Profile photo must use owned RefLab storage'
        using errcode = '22023';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'reflab:profile-media-reference:' || canonical_path,
        0
      )
    );

    if canonical_path !~ (
         '^' || new.id::text || '/avatars/[A-Za-z0-9][A-Za-z0-9._-]{0,255}$'
       )
       or canonical_path ~ '(^|/)\.\.?(/|$)'
       or not exists (
         select 1
           from storage.objects as object
          where object.bucket_id = 'profile-media'
            and object.name = canonical_path
            and object.owner_id = new.id::text
       ) then
      raise exception 'Profile photo object is invalid or not owned by the profile'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

create trigger enforce_profile_public_write
  before insert or update of name, photo_url
  on public.profiles
  for each row execute function reflab_private.enforce_profile_public_write();

revoke all privileges
  on function reflab_private.enforce_profile_public_write()
  from public, anon, authenticated, service_role;

create or replace function public.can_upload_profile_media(
  p_name text,
  p_owner_id text,
  p_metadata jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  object_size bigint;
  owned_object_count bigint;
  owned_total_bytes numeric;
begin
  if caller_uid is null
     or p_owner_id is distinct from caller_uid::text
     or p_name !~ (
       '^' || caller_uid::text || '/avatars/[A-Za-z0-9][A-Za-z0-9._-]{0,255}$'
     )
     or p_name ~ '(^|/)\.\.?(/|$)' then
    return false;
  end if;

  if coalesce(p_metadata ->> 'size', '') !~ '^[0-9]+$' then
    return false;
  end if;

  object_size := (p_metadata ->> 'size')::bigint;
  if object_size <= 0 or object_size > 5242880 then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:profile-media-quota:' || caller_uid::text,
      0
    )
  );

  if not public.account_accepts_uploads(caller_uid) then
    return false;
  end if;

  select
    count(*),
    coalesce(sum(
      case
        when coalesce(object.metadata ->> 'size', '') ~ '^[0-9]+$'
          then (object.metadata ->> 'size')::numeric
        else 0
      end
    ), 0)
    into owned_object_count, owned_total_bytes
    from storage.objects as object
   where object.bucket_id = 'profile-media'
     and object.owner_id = caller_uid::text;

  if owned_object_count >= 10
     or owned_total_bytes + object_size > 26214400 then
    return false;
  end if;

  return reflab_private.consume_rate_limit_event(
    caller_uid, 'upload_profile', 5, interval '10 minutes'
  );
end;
$function$;

revoke all privileges
  on function public.can_upload_profile_media(text, text, jsonb)
  from public, anon, authenticated, service_role;

grant execute
  on function public.can_upload_profile_media(text, text, jsonb)
  to authenticated;

create or replace function public.can_delete_profile_media(
  p_name text,
  p_owner_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  is_referenced boolean;
begin
  if auth.uid() is null
     or p_owner_id is distinct from auth.uid()::text
     or p_name !~ (
       '^' || auth.uid()::text
       || '/avatars/[A-Za-z0-9][A-Za-z0-9._-]{0,255}$'
     ) then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:profile-media-reference:' || p_name,
      0
    )
  );

  select exists (
    select 1
      from public.profiles as profile
     where profile.id = auth.uid()
       and (
         profile.photo_url = p_name
         or (
           profile.photo_url like
             'https://iqebkyjcoqggwhausgje.supabase.co/storage/v1/object/public/profile-media/%'
           and pg_catalog.split_part(
             pg_catalog.split_part(
               pg_catalog.substring(
                 profile.photo_url
                 from pg_catalog.char_length(
                   'https://iqebkyjcoqggwhausgje.supabase.co/storage/v1/object/public/profile-media/'
                 ) + 1
               ),
               '?', 1
             ),
             '#', 1
           ) = p_name
         )
       )
  ) into is_referenced;

  return not is_referenced;
end;
$function$;

revoke all privileges
  on function public.can_delete_profile_media(text, text)
  from public, anon, authenticated, service_role;
grant execute
  on function public.can_delete_profile_media(text, text)
  to authenticated;

drop policy if exists "Authenticated users can upload profile media"
  on storage.objects;
create policy "Authenticated users can upload bounded profile media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and public.can_upload_profile_media(name, owner_id, metadata)
  );

drop policy if exists "Users can delete own profile media" on storage.objects;
create policy "Users can delete own profile media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and public.can_delete_profile_media(name, owner_id)
  );

-- ---------------------------------------------------------------------------
-- Bound new post-media uploads without touching existing objects. The bucket
-- remains public because posts already persist public object paths; changing
-- that access model is a separate data migration. New files are capped at
-- 20 MiB, 100 objects and 250 MiB per authenticated owner.
-- ---------------------------------------------------------------------------

do $configure_post_media_bucket$
begin
  update storage.buckets
     set file_size_limit = 20971520,
         allowed_mime_types = array[
           'image/jpeg', 'image/png', 'image/gif', 'image/webp',
           'video/mp4', 'video/webm', 'video/quicktime',
           'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'
         ]
   where id = 'post-media';

  if not found then
    raise exception 'Required post-media bucket was not found'
      using errcode = '55000';
  end if;
end;
$configure_post_media_bucket$;

create or replace function public.can_upload_post_media(
  p_name text,
  p_owner_id text,
  p_metadata jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  object_size bigint;
  owned_object_count bigint;
  owned_total_bytes numeric;
begin
  if caller_uid is null
     or p_owner_id is distinct from caller_uid::text
     or pg_catalog.split_part(coalesce(p_name, ''), '/', 1)
        <> caller_uid::text then
    return false;
  end if;

  if coalesce(p_metadata ->> 'size', '') !~ '^[0-9]+$' then
    return false;
  end if;

  object_size := (p_metadata ->> 'size')::bigint;
  if object_size <= 0 or object_size > 20971520 then
    return false;
  end if;

  -- Serialize quota decisions for this owner. This avoids a burst of parallel
  -- INSERT transactions all observing the same pre-upload total.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:post-media-quota:' || caller_uid::text,
      0
    )
  );

  if not public.account_accepts_uploads(caller_uid) then
    return false;
  end if;

  select
    pg_catalog.count(*),
    coalesce(
      pg_catalog.sum(
        case
          when coalesce(o.metadata ->> 'size', '') ~ '^[0-9]+$'
            then (o.metadata ->> 'size')::numeric
          else 0
        end
      ),
      0
    )
    into owned_object_count, owned_total_bytes
    from storage.objects as o
   where o.bucket_id = 'post-media'
     and o.owner_id = caller_uid::text;

  if owned_object_count >= 100
     or owned_total_bytes + object_size > 262144000 then
    return false;
  end if;

  return reflab_private.consume_rate_limit_event(
    caller_uid, 'upload_post', 10, interval '10 minutes'
  );
end;
$function$;

revoke all privileges
  on function public.can_upload_post_media(text, text, jsonb)
  from public, anon, authenticated, service_role;

grant execute
  on function public.can_upload_post_media(text, text, jsonb)
  to authenticated;

create or replace function public.can_delete_post_media(
  p_name text,
  p_owner_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  is_referenced boolean;
begin
  if auth.uid() is null
     or p_owner_id is distinct from auth.uid()::text
     or pg_catalog.split_part(p_name, '/', 1) <> auth.uid()::text
     or p_name ~ '(^|/)\.\.?(/|$)' then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:post-media-reference:' || p_name,
      0
    )
  );

  select exists (
    select 1
      from public.posts as post
     where post.user_id = auth.uid()
       and (
         post.media_url = p_name
         or (
           post.media_url like
             'https://iqebkyjcoqggwhausgje.supabase.co/storage/v1/object/public/post-media/%'
           and pg_catalog.split_part(
             pg_catalog.split_part(
               pg_catalog.substring(
                 post.media_url
                 from pg_catalog.char_length(
                   'https://iqebkyjcoqggwhausgje.supabase.co/storage/v1/object/public/post-media/'
                 ) + 1
               ),
               '?', 1
             ),
             '#', 1
           ) = p_name
         )
       )
  ) into is_referenced;

  return not is_referenced;
end;
$function$;

revoke all privileges
  on function public.can_delete_post_media(text, text)
  from public, anon, authenticated, service_role;
grant execute
  on function public.can_delete_post_media(text, text)
  to authenticated;

drop policy if exists "Authenticated users can upload post media"
  on storage.objects;

create policy "Authenticated users can upload bounded post media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and public.can_upload_post_media(name, owner_id, metadata)
  );

drop policy if exists "Users can delete own post media" on storage.objects;

create policy "Users can delete own post media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and public.can_delete_post_media(name, owner_id)
  );

comment on function public.can_upload_post_media(text, text, jsonb) is
  'RLS helper for new post-media uploads: signed owner path, 20 MiB object cap, 100-object cap and 250 MiB owner quota.';

-- ---------------------------------------------------------------------------
-- Message attachments are private but an upload can be abandoned before the
-- send RPC commits a message. Bound that pre-send surface as carefully as post
-- media: canonical participant path, actual Storage owner, per-file/object/
-- byte/recent-upload limits, and a per-owner advisory lock for burst safety.
-- Existing referenced objects remain readable; this only governs new writes.
-- ---------------------------------------------------------------------------

do $configure_message_media_bucket$
begin
  update storage.buckets
     set public = false,
         file_size_limit = 20971520,
         allowed_mime_types = array[
           'image/jpeg', 'image/png', 'image/gif', 'image/webp',
           'video/mp4', 'video/webm', 'video/quicktime',
           'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'
         ]
   where id = 'message-media';

  if not found then
    raise exception 'Required message-media bucket was not found'
      using errcode = '55000';
  end if;
end;
$configure_message_media_bucket$;

create or replace function public.can_upload_message_media(
  p_name text,
  p_owner_id text,
  p_metadata jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  conversation_path text := pg_catalog.split_part(coalesce(p_name, ''), '/', 1);
  sender_path text := pg_catalog.split_part(coalesce(p_name, ''), '/', 2);
  file_path text := pg_catalog.split_part(coalesce(p_name, ''), '/', 3);
  conversation_id uuid;
  object_size bigint;
  owned_object_count bigint;
  owned_total_bytes numeric;
begin
  if caller_uid is null
     or p_owner_id is distinct from caller_uid::text
     or sender_path is distinct from caller_uid::text
     or p_name ~ '(^|/)\.\.?(/|$)'
     or p_name !~ '^[^/]+/[^/]+/[^/]+$'
     or conversation_path !~* (
       '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-'
       || '[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     )
     or file_path !~* (
       '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-'
       || '[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]{1,16}$'
     ) then
    return false;
  end if;

  conversation_id := conversation_path::uuid;

  if coalesce(p_metadata ->> 'size', '') !~ '^[0-9]+$' then
    return false;
  end if;

  object_size := (p_metadata ->> 'size')::bigint;
  if object_size <= 0 or object_size > 20971520 then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:message-media-quota:' || caller_uid::text,
      0
    )
  );

  if not public.account_accepts_uploads(caller_uid) then
    return false;
  end if;

  if not exists (
    select 1
      from public.conversations as conversation
      join public.conversation_participants as participant
        on participant.conversation_id = conversation.id
       and participant.user_id = caller_uid
     where conversation.id = conversation_id
       and reflab_private.account_is_active(
         case
           when conversation.user_a_id = caller_uid
             then conversation.user_b_id
           when conversation.user_b_id = caller_uid
             then conversation.user_a_id
           else null
         end
       )
       and not exists (
         select 1
           from public.user_blocks as block
          where (
            block.blocker_id = conversation.user_a_id
            and block.blocked_id = conversation.user_b_id
          ) or (
            block.blocker_id = conversation.user_b_id
            and block.blocked_id = conversation.user_a_id
          )
       )
  ) then
    return false;
  end if;

  select
    pg_catalog.count(*),
    coalesce(
      pg_catalog.sum(
        case
          when coalesce(object.metadata ->> 'size', '') ~ '^[0-9]+$'
            then (object.metadata ->> 'size')::numeric
          else 0
        end
      ),
      0
    )
    into owned_object_count, owned_total_bytes
    from storage.objects as object
   where object.bucket_id = 'message-media'
     and object.owner_id = caller_uid::text;

  if owned_object_count >= 500
     or owned_total_bytes + object_size > 2147483648 then
    return false;
  end if;

  return reflab_private.consume_rate_limit_event(
    caller_uid, 'upload_message', 20, interval '10 minutes'
  );
end;
$function$;

revoke all privileges
  on function public.can_upload_message_media(text, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute
  on function public.can_upload_message_media(text, text, jsonb)
  to authenticated;

create or replace function public.can_delete_message_media(
  p_name text,
  p_owner_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  conversation_path text :=
    pg_catalog.split_part(coalesce(p_name, ''), '/', 1);
  sender_path text :=
    pg_catalog.split_part(coalesce(p_name, ''), '/', 2);
  conversation_id uuid;
  is_referenced boolean;
begin
  if caller_uid is null
     or p_owner_id is distinct from caller_uid::text
     or sender_path is distinct from caller_uid::text
     or p_name ~ '(^|/)\.\.?(/|$)'
     or p_name !~ '^[^/]+/[^/]+/[^/]+$'
     or conversation_path !~* (
       '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-'
       || '[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     ) then
    return false;
  end if;

  conversation_id := conversation_path::uuid;
  if not exists (
    select 1
      from public.conversation_participants as participant
     where participant.conversation_id = conversation_id
       and participant.user_id = caller_uid
  ) then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:message-media-reference:' || p_name,
      0
    )
  );

  select exists (
    select 1
      from public.messages as message
     where message.media_url = p_name
  ) into is_referenced;

  return not is_referenced;
end;
$function$;

revoke all privileges
  on function public.can_delete_message_media(text, text)
  from public, anon, authenticated, service_role;
grant execute
  on function public.can_delete_message_media(text, text)
  to authenticated;

drop policy if exists "Message participants can upload own message media"
  on storage.objects;
create policy "Message participants can upload bounded message media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'message-media'
    and public.can_upload_message_media(name, owner_id, metadata)
  );

drop policy if exists "Message participants can read message media"
  on storage.objects;
create policy "Message participants can read message media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'message-media'
    and public.account_accepts_uploads((select auth.uid()))
    and (
      (
        owner_id = (select auth.uid()::text)
        and (storage.foldername(name))[2] = (select auth.uid()::text)
        and exists (
          select 1
            from public.conversation_participants as participant
           where participant.user_id = (select auth.uid())
             and participant.conversation_id::text
               = (storage.foldername(name))[1]
        )
      )
      or exists (
        select 1
          from public.messages as message
          join public.conversation_participants as participant
            on participant.conversation_id = message.conversation_id
         where message.media_url = storage.objects.name
           and participant.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Message senders can delete own message media"
  on storage.objects;
create policy "Message senders can delete own message media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'message-media'
    and public.can_delete_message_media(name, owner_id)
  );

comment on function public.can_upload_message_media(text, text, jsonb) is
  'RLS helper for new private message-media uploads: active participant and signed owner path, 20 MiB file cap, 500-object cap, 2 GiB owner quota and 20 uploads per 10 minutes.';
comment on function public.can_delete_message_media(text, text) is
  'Reference-aware message-media delete guard serialized with message INSERT by object path.';

-- ---------------------------------------------------------------------------
-- Narrow authenticated write RPCs. SECURITY DEFINER is intentional: browser
-- roles lose direct INSERT/UPDATE grants below. Every function pins an empty
-- search_path, checks auth.uid(), and exposes only accepted columns.
-- ---------------------------------------------------------------------------

create or replace function public.create_social_post(
  p_expected_user_id uuid,
  p_operation_id uuid,
  p_content text,
  p_media_type public.post_media_type,
  p_media_url text default null,
  p_original_post_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  original_author_id uuid;
  inserted_post public.posts;
begin
  if caller_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_expected_user_id is distinct from caller_uid then
    raise exception 'Post author does not match the active session'
      using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(caller_uid) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if p_operation_id is null then
    raise exception 'Post operation ID is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:create-post:' || caller_uid::text || ':' || p_operation_id::text,
      0
    )
  );

  select post.*
    into inserted_post
    from public.posts as post
   where post.user_id = caller_uid
     and post.client_id = p_operation_id;

  if found then
    if inserted_post.content is distinct from p_content
       or inserted_post.media_type is distinct from p_media_type
       or inserted_post.media_url is distinct from p_media_url
       or inserted_post.original_post_id is distinct from p_original_post_id then
      raise exception 'Post operation ID was already used for different content'
        using errcode = '22023';
    end if;
    return pg_catalog.to_jsonb(inserted_post);
  end if;

  if p_content is not null
     and pg_catalog.char_length(p_content) > 2000 then
    raise exception 'Post content cannot exceed 2000 characters'
      using errcode = '22001';
  end if;

  if p_media_url is not null
     and pg_catalog.char_length(p_media_url) > 1024 then
    raise exception 'Post media path is invalid' using errcode = '22001';
  end if;

  if p_media_url is not null then
    if pg_catalog.split_part(p_media_url, '/', 1) <> caller_uid::text
       or p_media_url like '/%'
       or p_media_url ~ '(^|/)\.\.?(/|$)' then
      raise exception 'Post media must belong to the active user'
        using errcode = '42501';
    end if;

    if not exists (
      select 1
        from storage.objects as object
       where object.bucket_id = 'post-media'
         and object.name = p_media_url
         and object.owner_id = caller_uid::text
    ) then
      raise exception 'Post media object was not found for the active user'
        using errcode = 'P0002';
    end if;
  end if;

  if p_original_post_id is not null then
    if p_content is not null
       or p_media_url is not null
       or p_media_type <> 'text'::public.post_media_type then
      raise exception 'A repost cannot add separate content or media'
        using errcode = '22023';
    end if;

    select p.user_id
      into original_author_id
      from public.posts as p
     where p.id = p_original_post_id;

    if original_author_id is null then
      raise exception 'Original post was not found' using errcode = 'P0002';
    end if;

    if exists (
      select 1
        from public.user_blocks as b
       where (b.blocker_id = caller_uid and b.blocked_id = original_author_id)
          or (b.blocker_id = original_author_id and b.blocked_id = caller_uid)
    ) then
      raise exception 'A blocked account cannot be reposted'
        using errcode = '42501';
    end if;
  else
    if (p_content is null or pg_catalog.btrim(p_content) = '')
       and p_media_url is null then
      raise exception 'A post requires text or media' using errcode = '22023';
    end if;

    if p_media_type = 'text'::public.post_media_type
       and p_media_url is not null then
      raise exception 'Text posts cannot include a media path'
        using errcode = '22023';
    end if;

    if p_media_type <> 'text'::public.post_media_type
       and (p_media_url is null or pg_catalog.btrim(p_media_url) = '') then
      raise exception 'Media posts require a media path'
        using errcode = '22023';
    end if;
  end if;

  insert into public.posts (
    user_id,
    client_id,
    content,
    media_type,
    media_url,
    original_post_id
  )
  values (
    caller_uid,
    p_operation_id,
    p_content,
    p_media_type,
    p_media_url,
    p_original_post_id
  )
  returning * into inserted_post;

  return pg_catalog.to_jsonb(inserted_post);
end;
$function$;

-- Compatibility wrapper for the short phase-one deployment window. The
-- launch frontend uses the six-argument operation-ID contract below.
create or replace function public.create_social_post(
  p_expected_user_id uuid,
  p_content text,
  p_media_type public.post_media_type,
  p_media_url text default null,
  p_original_post_id uuid default null
)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $function$
  select public.create_social_post(
    p_expected_user_id,
    gen_random_uuid(),
    p_content,
    p_media_type,
    p_media_url,
    p_original_post_id
  );
$function$;

create or replace function public.create_social_comment(
  p_expected_user_id uuid,
  p_post_id uuid,
  p_content text,
  p_parent_comment_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  post_author_id uuid;
  parent_post_id uuid;
  parent_author_id uuid;
  inserted_comment_id uuid;
begin
  if caller_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_expected_user_id is distinct from caller_uid then
    raise exception 'Comment author does not match the active session'
      using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(caller_uid) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if p_content is null or pg_catalog.btrim(p_content) = '' then
    raise exception 'Comment content is required' using errcode = '22023';
  end if;

  if pg_catalog.char_length(p_content) > 1000 then
    raise exception 'Comment content cannot exceed 1000 characters'
      using errcode = '22001';
  end if;

  select p.user_id
    into post_author_id
    from public.posts as p
   where p.id = p_post_id;

  if post_author_id is null then
    raise exception 'Post was not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
      from public.user_blocks as b
     where (b.blocker_id = caller_uid and b.blocked_id = post_author_id)
        or (b.blocker_id = post_author_id and b.blocked_id = caller_uid)
  ) then
    raise exception 'Comments are unavailable for a blocked account'
      using errcode = '42501';
  end if;

  if p_parent_comment_id is not null then
    select c.post_id, c.user_id
      into parent_post_id, parent_author_id
      from public.post_comments as c
     where c.id = p_parent_comment_id;

    if parent_post_id is null or parent_post_id <> p_post_id then
      raise exception 'Reply parent must belong to the same post'
        using errcode = '22023';
    end if;

    if exists (
      select 1
        from public.post_comments as parent
       where parent.id = p_parent_comment_id
         and parent.parent_comment_id is not null
    ) then
      raise exception 'Replies cannot be nested beyond one level'
        using errcode = '22023';
    end if;

    if exists (
      select 1
        from public.user_blocks as b
       where (b.blocker_id = caller_uid and b.blocked_id = parent_author_id)
          or (b.blocker_id = parent_author_id and b.blocked_id = caller_uid)
    ) then
      raise exception 'Replies are unavailable for a blocked account'
        using errcode = '42501';
    end if;
  end if;

  insert into public.post_comments (
    post_id,
    user_id,
    parent_comment_id,
    content
  )
  values (
    p_post_id,
    caller_uid,
    p_parent_comment_id,
    p_content
  )
  returning id into inserted_comment_id;

  return inserted_comment_id;
end;
$function$;

create or replace function public.report_social_post(
  p_expected_reporter_id uuid,
  p_post_id uuid,
  p_reason_code text,
  p_reason_details text default null
)
returns table (report_id uuid, created boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  target_author_id uuid;
  existing_report_id uuid;
  normalized_details text := nullif(pg_catalog.btrim(p_reason_details), '');
begin
  if caller_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_expected_reporter_id is distinct from caller_uid then
    raise exception 'Reporter does not match the active session'
      using errcode = '42501';
  end if;
  if not public.account_accepts_uploads(caller_uid) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;
  if p_reason_code is null or p_reason_code not in (
    'spam_scam', 'harassment_bullying', 'inappropriate_content', 'other'
  ) then
    raise exception 'Invalid report reason' using errcode = '22023';
  end if;
  if normalized_details is not null
     and pg_catalog.char_length(normalized_details) > 500 then
    raise exception 'Report details cannot exceed 500 characters'
      using errcode = '22001';
  end if;
  if p_reason_code = 'other' and normalized_details is null then
    raise exception 'Other reports require details' using errcode = '22023';
  end if;

  select p.user_id into target_author_id
    from public.posts as p where p.id = p_post_id;
  if target_author_id is null then
    raise exception 'Post was not found' using errcode = 'P0002';
  end if;
  if target_author_id = caller_uid then
    raise exception 'You cannot report your own post' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:report:post:' || caller_uid::text || ':' || p_post_id::text,
      0
    )
  );

  select r.id into existing_report_id
    from public.post_reports as r
   where r.reporter_id = caller_uid
     and r.target_snapshot_id = p_post_id
   order by r.created_at, r.id
   limit 1;

  if existing_report_id is not null then
    return query select existing_report_id, false;
    return;
  end if;

  insert into public.post_reports (
    reporter_id, post_id, target_snapshot_id, reason_code, reason_details
  ) values (
    caller_uid,
    p_post_id,
    p_post_id,
    p_reason_code::public.report_reason_code,
    normalized_details
  ) returning id into existing_report_id;

  return query select existing_report_id, true;
end;
$function$;

create or replace function public.report_social_comment(
  p_expected_reporter_id uuid,
  p_comment_id uuid,
  p_reason_code text,
  p_reason_details text default null
)
returns table (report_id uuid, created boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  target_author_id uuid;
  target_post_id uuid;
  existing_report_id uuid;
  normalized_details text := nullif(pg_catalog.btrim(p_reason_details), '');
begin
  if caller_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_expected_reporter_id is distinct from caller_uid then
    raise exception 'Reporter does not match the active session'
      using errcode = '42501';
  end if;
  if not public.account_accepts_uploads(caller_uid) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;
  if p_reason_code is null or p_reason_code not in (
    'spam_scam', 'harassment_bullying', 'inappropriate_content', 'other'
  ) then
    raise exception 'Invalid report reason' using errcode = '22023';
  end if;
  if normalized_details is not null
     and pg_catalog.char_length(normalized_details) > 500 then
    raise exception 'Report details cannot exceed 500 characters'
      using errcode = '22001';
  end if;
  if p_reason_code = 'other' and normalized_details is null then
    raise exception 'Other reports require details' using errcode = '22023';
  end if;

  select c.user_id, c.post_id into target_author_id, target_post_id
    from public.post_comments as c where c.id = p_comment_id;
  if target_author_id is null then
    raise exception 'Comment was not found' using errcode = 'P0002';
  end if;
  if target_author_id = caller_uid then
    raise exception 'You cannot report your own comment' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:report:comment:' || caller_uid::text || ':' || p_comment_id::text,
      0
    )
  );

  select r.id into existing_report_id
    from public.comment_reports as r
   where r.reporter_id = caller_uid
     and r.target_snapshot_id = p_comment_id
   order by r.created_at, r.id
   limit 1;

  if existing_report_id is not null then
    return query select existing_report_id, false;
    return;
  end if;

  insert into public.comment_reports (
    reporter_id,
    comment_id,
    target_snapshot_id,
    context_snapshot_id,
    reason_code,
    reason_details
  ) values (
    caller_uid,
    p_comment_id,
    p_comment_id,
    target_post_id,
    p_reason_code::public.report_reason_code,
    normalized_details
  ) returning id into existing_report_id;

  return query select existing_report_id, true;
end;
$function$;

create or replace function public.report_social_user(
  p_expected_reporter_id uuid,
  p_reported_user_id uuid,
  p_reason_code text,
  p_reason_details text default null
)
returns table (report_id uuid, created boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  existing_report_id uuid;
  normalized_details text := nullif(pg_catalog.btrim(p_reason_details), '');
begin
  if caller_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_expected_reporter_id is distinct from caller_uid then
    raise exception 'Reporter does not match the active session'
      using errcode = '42501';
  end if;
  if not public.account_accepts_uploads(caller_uid) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;
  if p_reason_code is null or p_reason_code not in (
    'spam_scam', 'harassment_bullying', 'inappropriate_content', 'other'
  ) then
    raise exception 'Invalid report reason' using errcode = '22023';
  end if;
  if normalized_details is not null
     and pg_catalog.char_length(normalized_details) > 500 then
    raise exception 'Report details cannot exceed 500 characters'
      using errcode = '22001';
  end if;
  if p_reason_code = 'other' and normalized_details is null then
    raise exception 'Other reports require details' using errcode = '22023';
  end if;
  if p_reported_user_id is null or p_reported_user_id = caller_uid then
    raise exception 'You cannot report your own account' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles as p where p.id = p_reported_user_id
  ) then
    raise exception 'User was not found' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:report:user:' || caller_uid::text || ':' || p_reported_user_id::text,
      0
    )
  );

  select r.id into existing_report_id
    from public.user_reports as r
   where r.reporter_id = caller_uid
     and r.target_snapshot_id = p_reported_user_id
   order by r.created_at, r.id
   limit 1;

  if existing_report_id is not null then
    return query select existing_report_id, false;
    return;
  end if;

  insert into public.user_reports (
    reporter_id,
    reported_user_id,
    target_snapshot_id,
    reason_code,
    reason_details
  ) values (
    caller_uid,
    p_reported_user_id,
    p_reported_user_id,
    p_reason_code::public.report_reason_code,
    normalized_details
  ) returning id into existing_report_id;

  return query select existing_report_id, true;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Read-path hardening. Keep every existing RPC signature and JSON shape so
-- phase one remains compatible with the already-deployed frontend, but never
-- trust a caller-supplied viewer ID. Hidden or blocked originals/replies are
-- excluded rather than partially serialized.
-- ---------------------------------------------------------------------------

create or replace function reflab_private.ugc_not_blocked(
  p_viewer_id uuid,
  p_author_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_viewer_id is not null
     and p_author_id is not null
     and public.account_accepts_uploads(p_viewer_id)
     and reflab_private.account_is_active(p_author_id)
     and not exists (
       select 1
         from public.user_blocks as block
        where (
          block.blocker_id = p_viewer_id
          and block.blocked_id = p_author_id
        ) or (
          block.blocker_id = p_author_id
          and block.blocked_id = p_viewer_id
        )
     );
$function$;

create or replace function reflab_private.social_post_payload(
  p_post public.posts,
  p_viewer_id uuid
)
returns json
language sql
stable
security definer
set search_path = ''
as $function$
  select json_build_object(
    'id', p_post.id,
    'content', p_post.content,
    'media_type', p_post.media_type,
    'media_url', p_post.media_url,
    'media_metadata', p_post.media_metadata,
    'original_post_id', p_post.original_post_id,
    'like_count', p_post.like_count,
    'comment_count', p_post.comment_count,
    'repost_count', p_post.repost_count,
    'save_count', p_post.save_count,
    'created_at', p_post.created_at,
    'author', json_build_object(
      'id', author.id,
      'username', author.username,
      'name', author.name,
      'photo_url', author.photo_url
    ),
    'original_post', case when p_post.original_post_id is not null then (
      select json_build_object(
        'id', original.id,
        'content', original.content,
        'media_type', original.media_type,
        'media_url', original.media_url,
        'media_metadata', original.media_metadata,
        'like_count', original.like_count,
        'comment_count', original.comment_count,
        'repost_count', original.repost_count,
        'save_count', original.save_count,
        'created_at', original.created_at,
        'author', json_build_object(
          'id', original_author.id,
          'username', original_author.username,
          'name', original_author.name,
          'photo_url', original_author.photo_url
        )
      )
        from public.posts as original
        join public.profiles as original_author
          on original_author.id = original.user_id
       where original.id = p_post.original_post_id
         and original.moderation_state = 'visible'
         and reflab_private.ugc_not_blocked(
           p_viewer_id,
           original.user_id
         )
    ) else null end,
    'is_liked', exists (
      select 1
        from public.post_likes as liked
       where liked.post_id = p_post.id
         and liked.user_id = p_viewer_id
    ),
    'is_saved', exists (
      select 1
        from public.post_saves as saved
       where saved.post_id = p_post.id
         and saved.user_id = p_viewer_id
    ),
    'is_reposted', exists (
      select 1
        from public.posts as repost
       where repost.original_post_id = p_post.id
         and repost.user_id = p_viewer_id
         and repost.moderation_state = 'visible'
    )
  )
    from public.profiles as author
   where author.id = p_post.user_id;
$function$;

create or replace function public.get_public_profile_view(
  p_viewer_id uuid,
  p_username text
)
returns table (
  id uuid,
  username text,
  name text,
  photo_url text,
  is_following boolean,
  is_blocked_by_viewer boolean,
  has_blocked_viewer boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  normalized_username text := pg_catalog.btrim(coalesce(p_username, ''));
begin
  if auth.uid() is distinct from p_viewer_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(p_viewer_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if normalized_username = '' then
    return;
  end if;

  return query
  select
    profile.id,
    profile.username,
    profile.name,
    profile.photo_url,
    exists (
      select 1
        from public.user_follows as follow
       where follow.follower_id = p_viewer_id
         and follow.following_id = profile.id
    ),
    false,
    false
  from public.profiles as profile
  where pg_catalog.lower(profile.username) = pg_catalog.lower(normalized_username)
    and profile.deletion_started_at is null
    and reflab_private.ugc_not_blocked(p_viewer_id, profile.id)
  limit 1;
end;
$function$;

create or replace function public.get_social_feed(
  p_user_id uuid,
  p_media_type text default null,
  p_cursor timestamptz default null,
  p_limit integer default 20
)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  result json;
  page_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(p_user_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  select json_agg(
           reflab_private.social_post_payload(feed_post.post_row, p_user_id)
           order by feed_post.created_at desc
         )
    into result
    from (
      select post as post_row, post.created_at
        from public.posts as post
       where post.moderation_state = 'visible'
         and reflab_private.ugc_not_blocked(p_user_id, post.user_id)
         and (
           post.original_post_id is null
           or exists (
             select 1
               from public.posts as original
              where original.id = post.original_post_id
                and original.moderation_state = 'visible'
                and reflab_private.ugc_not_blocked(
                  p_user_id,
                  original.user_id
                )
           )
         )
         and (
           p_media_type is null
           or post.media_type = p_media_type::public.post_media_type
         )
         and (p_cursor is null or post.created_at < p_cursor)
       order by post.created_at desc
       limit page_limit
    ) as feed_post;

  return coalesce(result, '[]'::json);
end;
$function$;

create or replace function public.get_profile_feed(
  p_viewer_id uuid,
  p_profile_user_id uuid,
  p_media_type text default null,
  p_cursor timestamptz default null,
  p_limit integer default 20
)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  result json;
  page_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if auth.uid() is distinct from p_viewer_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(p_viewer_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  select json_agg(
           reflab_private.social_post_payload(
             profile_post.post_row,
             p_viewer_id
           )
           order by profile_post.created_at desc
         )
    into result
    from (
      select post as post_row, post.created_at
        from public.posts as post
       where post.user_id = p_profile_user_id
         and post.moderation_state = 'visible'
         and reflab_private.ugc_not_blocked(p_viewer_id, post.user_id)
         and (
           post.original_post_id is null
           or exists (
             select 1
               from public.posts as original
              where original.id = post.original_post_id
                and original.moderation_state = 'visible'
                and reflab_private.ugc_not_blocked(
                  p_viewer_id,
                  original.user_id
                )
           )
         )
         and (
           p_media_type is null
           or post.media_type = p_media_type::public.post_media_type
         )
         and (p_cursor is null or post.created_at < p_cursor)
       order by post.created_at desc
       limit page_limit
    ) as profile_post;

  return coalesce(result, '[]'::json);
end;
$function$;

create or replace function public.get_public_profile_feed(
  p_viewer_id uuid,
  p_target_user_id uuid,
  p_cursor timestamptz default null,
  p_limit integer default 20
)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  result json;
  page_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if auth.uid() is distinct from p_viewer_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(p_viewer_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if p_target_user_id is null then
    return '[]'::json;
  end if;

  select json_agg(
           reflab_private.social_post_payload(
             profile_post.post_row,
             p_viewer_id
           )
           order by profile_post.created_at desc
         )
    into result
    from (
      select post as post_row, post.created_at
        from public.posts as post
       where post.user_id = p_target_user_id
         and post.moderation_state = 'visible'
         and reflab_private.ugc_not_blocked(p_viewer_id, post.user_id)
         and (
           post.original_post_id is null
           or exists (
             select 1
               from public.posts as original
              where original.id = post.original_post_id
                and original.moderation_state = 'visible'
                and reflab_private.ugc_not_blocked(
                  p_viewer_id,
                  original.user_id
                )
           )
         )
         and (p_cursor is null or post.created_at < p_cursor)
       order by post.created_at desc
       limit page_limit
    ) as profile_post;

  return coalesce(result, '[]'::json);
end;
$function$;

create or replace function public.get_post_by_id(
  p_user_id uuid,
  p_post_id uuid
)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  result json;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(p_user_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  select reflab_private.social_post_payload(post, p_user_id)
    into result
    from public.posts as post
   where post.id = p_post_id
     and post.moderation_state = 'visible'
     and reflab_private.ugc_not_blocked(p_user_id, post.user_id)
     and (
       post.original_post_id is null
       or exists (
         select 1
           from public.posts as original
          where original.id = post.original_post_id
            and original.moderation_state = 'visible'
            and reflab_private.ugc_not_blocked(
              p_user_id,
              original.user_id
            )
       )
     );

  return result;
end;
$function$;

create or replace function public.get_post_comments(
  p_post_id uuid,
  p_user_id uuid
)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  result json;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(p_user_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.posts as post
     where post.id = p_post_id
       and post.moderation_state = 'visible'
       and reflab_private.ugc_not_blocked(p_user_id, post.user_id)
  ) then
    return '[]'::json;
  end if;

  select json_agg(row_to_json(top_level) order by top_level.created_at desc)
    into result
    from (
      select
        comment.id,
        comment.content,
        comment.like_count,
        comment.created_at,
        comment.user_id,
        json_build_object(
          'id', author.id,
          'username', author.username,
          'name', author.name,
          'photo_url', author.photo_url
        ) as author,
        exists (
          select 1
            from public.comment_likes as liked
           where liked.comment_id = comment.id
             and liked.user_id = p_user_id
        ) as is_liked,
        coalesce(
          (
            select json_agg(row_to_json(reply_row) order by reply_row.created_at)
              from (
                select
                  reply.id,
                  reply.content,
                  reply.like_count,
                  reply.created_at,
                  reply.user_id,
                  json_build_object(
                    'id', reply_author.id,
                    'username', reply_author.username,
                    'name', reply_author.name,
                    'photo_url', reply_author.photo_url
                  ) as author,
                  exists (
                    select 1
                      from public.comment_likes as reply_like
                     where reply_like.comment_id = reply.id
                       and reply_like.user_id = p_user_id
                  ) as is_liked
                from public.post_comments as reply
                join public.profiles as reply_author
                  on reply_author.id = reply.user_id
               where reply.parent_comment_id = comment.id
                 and reply.moderation_state = 'visible'
                 and reflab_private.ugc_not_blocked(
                   p_user_id,
                   reply.user_id
                 )
               order by reply.created_at
               limit 100
              ) as reply_row
          ),
          '[]'::json
        ) as replies
      from public.post_comments as comment
      join public.profiles as author on author.id = comment.user_id
     where comment.post_id = p_post_id
       and comment.parent_comment_id is null
       and comment.moderation_state = 'visible'
       and reflab_private.ugc_not_blocked(p_user_id, comment.user_id)
     order by comment.created_at desc
     limit 200
    ) as top_level;

  return coalesce(result, '[]'::json);
end;
$function$;

revoke all privileges
  on function
    reflab_private.account_is_active(uuid),
    reflab_private.ugc_not_blocked(uuid, uuid),
    reflab_private.social_post_payload(public.posts, uuid)
  from public, anon, authenticated, service_role;

revoke all privileges
  on function
    public.get_social_feed(uuid, text, timestamptz, integer),
    public.get_public_profile_view(uuid, text),
    public.get_profile_feed(uuid, uuid, text, timestamptz, integer),
    public.get_public_profile_feed(uuid, uuid, timestamptz, integer),
    public.get_post_by_id(uuid, uuid),
    public.get_post_comments(uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute
  on function
    public.get_social_feed(uuid, text, timestamptz, integer),
    public.get_public_profile_view(uuid, text),
    public.get_profile_feed(uuid, uuid, text, timestamptz, integer),
    public.get_public_profile_feed(uuid, uuid, timestamptz, integer),
    public.get_post_by_id(uuid, uuid),
    public.get_post_comments(uuid, uuid)
  to authenticated;

create or replace function public.get_search_history_profiles(p_ids uuid[])
returns table (
  id uuid,
  username text,
  name text,
  photo_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
begin
  if caller_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.account_accepts_uploads(caller_uid) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if coalesce(pg_catalog.cardinality(p_ids), 0) > 10 then
    raise exception 'Search history cannot contain more than 10 profile IDs'
      using errcode = '22023';
  end if;

  return query
  select
    profile.id,
    profile.username,
    profile.name,
    case
      when profile.photo_url is null then null
      when profile.photo_url !~ '^[a-z][a-z0-9+.-]*://' then profile.photo_url
      when profile.photo_url like
        'https://iqebkyjcoqggwhausgje.supabase.co/storage/v1/object/public/profile-media/%'
        then profile.photo_url
      else null
    end as photo_url
  from unnest(coalesce(p_ids, array[]::uuid[])) with ordinality
    as requested(profile_id, position)
  join public.profiles as profile on profile.id = requested.profile_id
  where profile.deletion_started_at is null
    and reflab_private.ugc_not_blocked(caller_uid, profile.id)
  order by requested.position;
end;
$function$;

revoke all privileges
  on function public.get_search_history_profiles(uuid[])
  from public, anon, authenticated, service_role;

grant execute
  on function public.get_search_history_profiles(uuid[])
  to authenticated;

-- Replace the historical messaging search definer. It used an RLS-aware view
-- but did not reject a deletion-started caller and could return deletion
-- targets or arbitrary legacy avatar URLs. Keep its existing signature/shape.
create or replace function public.search_users(
  p_query text,
  p_current_user_id uuid,
  p_limit integer default 10
)
returns table (
  id uuid,
  username text,
  name text,
  photo_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  normalized_query text := pg_catalog.btrim(coalesce(p_query, ''));
  page_limit integer := greatest(1, least(coalesce(p_limit, 10), 20));
  production_prefix constant text :=
    'https://iqebkyjcoqggwhausgje.supabase.co/storage/v1/object/public/profile-media/';
begin
  if auth.uid() is distinct from p_current_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(p_current_user_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if normalized_query = '' then
    return;
  end if;
  if pg_catalog.char_length(normalized_query) > 100 then
    raise exception 'Search query cannot exceed 100 characters'
      using errcode = '22001';
  end if;

  return query
  select
    profile.id,
    profile.username,
    profile.name,
    case
      when profile.photo_url ~ (
        '^' || profile.id::text
        || '/avatars/[A-Za-z0-9][A-Za-z0-9._-]{0,255}$'
      ) then profile.photo_url
      when profile.photo_url like production_prefix || profile.id::text || '/avatars/%'
       and pg_catalog.substring(
         profile.photo_url from pg_catalog.char_length(production_prefix) + 1
       ) ~ (
         '^' || profile.id::text
         || '/avatars/[A-Za-z0-9][A-Za-z0-9._-]{0,255}$'
       ) then profile.photo_url
      else null
    end as photo_url
  from public.profiles as profile
  where profile.id <> p_current_user_id
    and profile.username is not null
    and profile.deletion_started_at is null
    and not exists (
      select 1
        from public.account_deletion_jobs as deletion_job
       where deletion_job.user_id = profile.id
    )
    and not exists (
      select 1
        from public.user_blocks as block
       where (
         block.blocker_id = p_current_user_id
         and block.blocked_id = profile.id
       ) or (
         block.blocker_id = profile.id
         and block.blocked_id = p_current_user_id
       )
    )
    and (
      pg_catalog.strpos(
        pg_catalog.lower(profile.username),
        pg_catalog.lower(normalized_query)
      ) > 0
      or pg_catalog.strpos(
        pg_catalog.lower(coalesce(profile.name, '')),
        pg_catalog.lower(normalized_query)
      ) > 0
    )
  order by
    case
      when pg_catalog.lower(profile.username)
        = pg_catalog.lower(normalized_query) then 0
      when pg_catalog.strpos(
        pg_catalog.lower(profile.username),
        pg_catalog.lower(normalized_query)
      ) = 1 then 1
      when pg_catalog.strpos(
        pg_catalog.lower(coalesce(profile.name, '')),
        pg_catalog.lower(normalized_query)
      ) = 1 then 2
      else 3
    end,
    profile.username,
    profile.id
  limit page_limit;
end;
$function$;

revoke all privileges
  on function public.search_users(text, uuid, integer)
  from public, anon, authenticated, service_role;
grant execute
  on function public.search_users(text, uuid, integer)
  to authenticated;

-- Realtime table reads are a separate path from the definer RPCs. Keep an
-- already-issued JWT fail-closed as soon as account deletion is durable.
drop policy if exists "Participants can read conversations"
  on public.conversations;
create policy "Active participants can read conversations"
  on public.conversations
  for select
  to authenticated
  using (
    public.account_accepts_uploads((select auth.uid()))
    and (select auth.uid()) in (user_a_id, user_b_id)
  );

drop policy if exists "Users can read own conversation participants"
  on public.conversation_participants;
create policy "Active users can read own conversation participants"
  on public.conversation_participants
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.account_accepts_uploads((select auth.uid()))
  );

drop policy if exists "Participants can read messages" on public.messages;
create policy "Active participants can read messages"
  on public.messages
  for select
  to authenticated
  using (
    public.account_accepts_uploads((select auth.uid()))
    and exists (
      select 1
        from public.conversation_participants as participant
       where participant.conversation_id = messages.conversation_id
         and participant.user_id = (select auth.uid())
    )
  );

-- Existing message history remains visible after a block, but participant
-- identity is replaced with a non-PII tombstone in both directions. This
-- preserves the historical record without letting messaging RPCs bypass the
-- profile/block boundary.
create or replace function public.get_conversations(p_user_id uuid)
returns table (
  id uuid,
  updated_at timestamptz,
  other_user jsonb,
  last_message jsonb,
  unread_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(p_user_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  return query
  select
    conversation.id,
    conversation.updated_at,
    jsonb_build_object(
      'id', case
        when other_profile.id is null or not identity.can_reveal
          then conversation.id
        else other_profile.id
      end,
      'username', case
        when other_profile.id is null then 'deleted-account'
        when not identity.can_reveal then 'blocked_account'
        else other_profile.username
      end,
      'name', case
        when other_profile.id is null then null
        when not identity.can_reveal then 'Blocked account'
        else other_profile.name
      end,
      'photo_url', case
        when identity.can_reveal then other_profile.photo_url
        else null
      end,
      'is_deleted', other_profile.id is null,
      'is_blocked', other_profile.id is not null and not identity.can_reveal
    ) as other_user,
    case
      when latest_message.id is null then null
      else jsonb_build_object(
        'id', latest_message.id,
        'conversation_id', latest_message.conversation_id,
        'sender_id', latest_message.sender_id,
        'content', latest_message.content,
        'media_type', latest_message.media_type,
        'media_url', latest_message.media_url,
        'created_at', latest_message.created_at
      )
    end as last_message,
    coalesce(unread.unread_count, 0)::integer as unread_count
  from public.conversation_participants as participant
  join public.conversations as conversation
    on conversation.id = participant.conversation_id
  left join public.profiles as other_profile
    on other_profile.id = case
      when conversation.user_a_id = p_user_id then conversation.user_b_id
      when conversation.user_b_id = p_user_id then conversation.user_a_id
      else null
    end
  left join lateral (
    select coalesce(
      reflab_private.ugc_not_blocked(p_user_id, other_profile.id),
      false
    ) as can_reveal
  ) as identity on true
  left join lateral (
    select
      message.id,
      message.conversation_id,
      message.sender_id,
      message.content,
      message.media_type,
      message.media_url,
      message.created_at
    from public.messages as message
    where message.conversation_id = conversation.id
    order by message.created_at desc
    limit 1
  ) as latest_message on true
  left join lateral (
    select count(*)::integer as unread_count
    from public.messages as message
    where message.conversation_id = conversation.id
      and message.sender_id <> p_user_id
      and message.created_at > coalesce(
        participant.last_read_at,
        'epoch'::timestamptz
      )
  ) as unread on true
  where participant.user_id = p_user_id
    and p_user_id in (conversation.user_a_id, conversation.user_b_id)
  order by coalesce(latest_message.created_at, conversation.updated_at) desc;
end;
$function$;

drop function if exists public.get_messages(
  uuid,
  uuid,
  timestamptz,
  integer
);

create or replace function public.get_messages(
  p_conversation_id uuid,
  p_user_id uuid,
  p_cursor text default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  client_id uuid,
  content text,
  media_type public.message_media_type,
  media_url text,
  created_at timestamptz,
  sender jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  page_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  cursor_created_at timestamptz;
  cursor_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(p_user_id) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.conversation_participants as participant
     where participant.conversation_id = p_conversation_id
       and participant.user_id = p_user_id
  ) then
    raise exception 'Conversation not found or not accessible'
      using errcode = '42501';
  end if;

  if p_cursor is not null then
    begin
      if pg_catalog.strpos(p_cursor, '|') > 0 then
        cursor_created_at := pg_catalog.split_part(p_cursor, '|', 1)::timestamptz;
        cursor_id := pg_catalog.split_part(p_cursor, '|', 2)::uuid;
      else
        -- Compatibility for the phase-one old bundle. The launch frontend
        -- always sends timestamp|id and therefore cannot skip timestamp ties.
        cursor_created_at := p_cursor::timestamptz;
        cursor_id := 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;
      end if;
    exception when others then
      raise exception 'Invalid message cursor' using errcode = '22023';
    end;
  end if;

  return query
  select
    message.id,
    message.conversation_id,
    message.sender_id,
    message.client_id,
    message.content,
    message.media_type,
    message.media_url,
    message.created_at,
    jsonb_build_object(
      'id', case
        when sender_profile.id is null or not identity.can_reveal
          then p_conversation_id
        else sender_profile.id
      end,
      'username', case
        when sender_profile.id is null then 'deleted-account'
        when not identity.can_reveal then 'blocked_account'
        else sender_profile.username
      end,
      'name', case
        when sender_profile.id is null then null
        when not identity.can_reveal then 'Blocked account'
        else sender_profile.name
      end,
      'photo_url', case
        when identity.can_reveal then sender_profile.photo_url
        else null
      end,
      'is_deleted', sender_profile.id is null,
      'is_blocked', sender_profile.id is not null and not identity.can_reveal
    ) as sender
  from public.messages as message
  left join public.profiles as sender_profile
    on sender_profile.id = message.sender_id
  left join lateral (
    select case
      when message.sender_id = p_user_id then true
      else coalesce(
        reflab_private.ugc_not_blocked(p_user_id, message.sender_id),
        false
      )
    end as can_reveal
  ) as identity on true
  where message.conversation_id = p_conversation_id
    and (
      p_cursor is null
      or (message.created_at, message.id) < (cursor_created_at, cursor_id)
    )
  order by message.created_at desc, message.id desc
  limit page_limit;
end;
$function$;

revoke all privileges
  on function
    public.get_conversations(uuid),
    public.get_messages(uuid, uuid, text, integer)
  from public, anon, authenticated, service_role;

grant execute
  on function
    public.get_conversations(uuid),
    public.get_messages(uuid, uuid, text, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Admin-only report queue. Authority comes exclusively from the signed
-- app_metadata claim. profiles.role and user_metadata are never consulted.
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_ugc_reports(
  p_status text default null,
  p_limit integer default 50,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  report_type text,
  report_id uuid,
  reporter_id uuid,
  reporter_username text,
  target_id uuid,
  context_id uuid,
  target_author_id uuid,
  target_username text,
  target_excerpt text,
  reason_code text,
  reason_details text,
  legacy_reason text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_note text,
  review_revision bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  page_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if caller_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(caller_uid) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if p_status is not null and p_status not in (
    'pending', 'reviewing', 'actioned', 'dismissed'
  ) then
    raise exception 'Invalid report status' using errcode = '22023';
  end if;

  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Both pagination cursor values are required'
      using errcode = '22023';
  end if;

  return query
  select queue.*
    from (
      select
        'post'::text as report_type,
        r.id as report_id,
        r.reporter_id,
        reporter.username as reporter_username,
        r.target_snapshot_id as target_id,
        r.target_snapshot_id as context_id,
        post.user_id as target_author_id,
        target.username as target_username,
        pg_catalog.left(post.content, 240) as target_excerpt,
        r.reason_code::text,
        r.reason_details,
        r.reason as legacy_reason,
        r.status::text,
        r.created_at,
        r.reviewed_at,
        r.reviewed_by,
        r.review_note,
        r.review_revision
      from public.post_reports as r
      left join public.profiles as reporter on reporter.id = r.reporter_id
      left join public.posts as post on post.id = r.post_id
      left join public.profiles as target on target.id = post.user_id

      union all

      select
        'comment'::text,
        r.id,
        r.reporter_id,
        reporter.username,
        r.target_snapshot_id,
        r.context_snapshot_id,
        comment.user_id,
        target.username,
        pg_catalog.left(comment.content, 240),
        r.reason_code::text,
        r.reason_details,
        r.reason,
        r.status::text,
        r.created_at,
        r.reviewed_at,
        r.reviewed_by,
        r.review_note,
        r.review_revision
      from public.comment_reports as r
      left join public.profiles as reporter on reporter.id = r.reporter_id
      left join public.post_comments as comment on comment.id = r.comment_id
      left join public.profiles as target on target.id = comment.user_id

      union all

      select
        'user'::text,
        r.id,
        r.reporter_id,
        reporter.username,
        r.target_snapshot_id,
        r.target_snapshot_id,
        r.reported_user_id,
        target.username,
        null::text,
        r.reason_code::text,
        r.reason_details,
        r.reason,
        r.status::text,
        r.created_at,
        r.reviewed_at,
        r.reviewed_by,
        r.review_note,
        r.review_revision
      from public.user_reports as r
      left join public.profiles as reporter on reporter.id = r.reporter_id
      left join public.profiles as target on target.id = r.reported_user_id
    ) as queue
   where (p_status is null or queue.status = p_status)
     and (
       p_before_created_at is null
       or (queue.created_at, queue.report_id)
          < (p_before_created_at, p_before_id)
     )
   order by queue.created_at desc, queue.report_id desc
   limit page_limit;
end;
$function$;

create or replace function public.admin_review_ugc_report(
  p_report_type text,
  p_report_id uuid,
  p_expected_reviewer_id uuid,
  p_expected_review_revision bigint,
  p_status text,
  p_review_note text default null
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_uid uuid := auth.uid();
  normalized_note text := nullif(pg_catalog.btrim(p_review_note), '');
  next_revision bigint;
  target_exists boolean;
  target_content_id uuid;
  target_snapshot_value uuid;
  active_action_report_id uuid;
begin
  if caller_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_expected_reviewer_id is null
     or p_expected_reviewer_id is distinct from caller_uid then
    raise exception 'Reviewer identity changed before the decision was saved'
      using errcode = '42501';
  end if;

  if not coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if not public.account_accepts_uploads(caller_uid) then
    raise exception 'Account deletion is in progress' using errcode = '42501';
  end if;

  if p_report_type is null or p_report_type not in ('post', 'comment', 'user') then
    raise exception 'Invalid report type' using errcode = '22023';
  end if;
  if p_report_id is null then
    raise exception 'Report ID is required' using errcode = '22023';
  end if;
  if p_expected_review_revision is null or p_expected_review_revision < 0 then
    raise exception 'Expected review revision is required'
      using errcode = '22023';
  end if;
  if p_status is null or p_status not in (
    'pending', 'reviewing', 'actioned', 'dismissed'
  ) then
    raise exception 'Invalid report status' using errcode = '22023';
  end if;
  if normalized_note is not null
     and pg_catalog.char_length(normalized_note) > 1000 then
    raise exception 'Review note cannot exceed 1000 characters'
      using errcode = '22001';
  end if;

  if p_report_type = 'user' and p_status = 'actioned' then
    raise exception
      'User reports cannot be actioned until an account-enforcement workflow exists'
      using errcode = '0A000';
  end if;

  -- Serialize every review decision for the same immutable target snapshot.
  -- Per-report optimistic revisions alone do not prevent two different report
  -- rows from racing their final visibility recomputation.
  if p_report_type = 'post' then
    select report.post_id, report.target_snapshot_id
      into target_content_id, target_snapshot_value
      from public.post_reports as report
     where report.id = p_report_id;
    target_exists := found;
  elsif p_report_type = 'comment' then
    select report.comment_id, report.target_snapshot_id
      into target_content_id, target_snapshot_value
      from public.comment_reports as report
     where report.id = p_report_id;
    target_exists := found;
  else
    select report.target_snapshot_id
      into target_snapshot_value
      from public.user_reports as report
     where report.id = p_report_id;
    target_exists := found;
  end if;

  if not target_exists then
    raise exception 'Report was not found' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'reflab:ugc-moderation:' || p_report_type || ':'
        || target_snapshot_value::text,
      0
    )
  );

  if p_report_type = 'post' then
    update public.post_reports
       set status = p_status::public.ugc_report_status,
           reviewed_at = pg_catalog.statement_timestamp(),
           reviewed_by = caller_uid,
           review_note = normalized_note,
           review_revision = review_revision + 1
     where id = p_report_id
       and review_revision = p_expected_review_revision
    returning review_revision into next_revision;
  elsif p_report_type = 'comment' then
    update public.comment_reports
       set status = p_status::public.ugc_report_status,
           reviewed_at = pg_catalog.statement_timestamp(),
           reviewed_by = caller_uid,
           review_note = normalized_note,
           review_revision = review_revision + 1
     where id = p_report_id
       and review_revision = p_expected_review_revision
    returning review_revision into next_revision;
  else
    update public.user_reports
       set status = p_status::public.ugc_report_status,
           reviewed_at = pg_catalog.statement_timestamp(),
           reviewed_by = caller_uid,
           review_note = normalized_note,
           review_revision = review_revision + 1
     where id = p_report_id
       and review_revision = p_expected_review_revision
    returning review_revision into next_revision;
  end if;

  if next_revision is null then
    raise exception 'Report was changed by another moderator; refresh first'
      using errcode = '40001';
  end if;

  -- For content reports, "actioned" has one concrete, reversible meaning:
  -- hide the target from RefLab read surfaces. Evidence and content remain in
  -- place. Clearing the final actioned report restores visibility.
  if p_report_type = 'post' then
    select report.id
      into active_action_report_id
      from public.post_reports as report
     where report.target_snapshot_id = target_snapshot_value
       and report.status = 'actioned'
     order by report.reviewed_at desc nulls last, report.id desc
     limit 1;

    if target_content_id is not null and active_action_report_id is not null then
      update public.posts
         set moderation_state = 'hidden',
             moderation_updated_at = pg_catalog.statement_timestamp(),
             moderation_updated_by = caller_uid,
             moderation_source_report_id = active_action_report_id
       where id = target_content_id;
    elsif target_content_id is not null then
      update public.posts
         set moderation_state = 'visible',
             moderation_updated_at = null,
             moderation_updated_by = null,
             moderation_source_report_id = null
       where id = target_content_id;
    end if;
  elsif p_report_type = 'comment' then
    select report.id
      into active_action_report_id
      from public.comment_reports as report
     where report.target_snapshot_id = target_snapshot_value
       and report.status = 'actioned'
     order by report.reviewed_at desc nulls last, report.id desc
     limit 1;

    if target_content_id is not null and active_action_report_id is not null then
      update public.post_comments
         set moderation_state = 'hidden',
             moderation_updated_at = pg_catalog.statement_timestamp(),
             moderation_updated_by = caller_uid,
             moderation_source_report_id = active_action_report_id
       where id = target_content_id;
    elsif target_content_id is not null then
      update public.post_comments
         set moderation_state = 'visible',
             moderation_updated_at = null,
             moderation_updated_by = null,
             moderation_source_report_id = null
       where id = target_content_id;
    end if;
  end if;

  return next_revision;
end;
$function$;

-- Temporary compatibility overload for the previous admin bundle. It remains
-- only through the controlled additive phase; the restrictive cutover removes
-- it after the expected-reviewer frontend has passed its A/B smoke test.
create or replace function public.admin_review_ugc_report(
  p_report_type text,
  p_report_id uuid,
  p_expected_review_revision bigint,
  p_status text,
  p_review_note text default null
)
returns bigint
language sql
volatile
security invoker
set search_path = ''
as $function$
  select public.admin_review_ugc_report(
    p_report_type,
    p_report_id,
    auth.uid(),
    p_expected_review_revision,
    p_status,
    p_review_note
  );
$function$;

revoke all privileges
  on function
    public.create_social_post(uuid, uuid, text, public.post_media_type, text, uuid),
    public.create_social_post(uuid, text, public.post_media_type, text, uuid),
    public.create_social_comment(uuid, uuid, text, uuid),
    public.report_social_post(uuid, uuid, text, text),
    public.report_social_comment(uuid, uuid, text, text),
    public.report_social_user(uuid, uuid, text, text),
    public.admin_list_ugc_reports(text, integer, timestamptz, uuid),
    public.admin_review_ugc_report(text, uuid, uuid, bigint, text, text),
    public.admin_review_ugc_report(text, uuid, bigint, text, text)
  from public, anon, authenticated, service_role;

grant execute
  on function
    public.create_social_post(uuid, uuid, text, public.post_media_type, text, uuid),
    public.create_social_post(uuid, text, public.post_media_type, text, uuid),
    public.create_social_comment(uuid, uuid, text, uuid),
    public.report_social_post(uuid, uuid, text, text),
    public.report_social_comment(uuid, uuid, text, text),
    public.report_social_user(uuid, uuid, text, text),
    public.admin_list_ugc_reports(text, integer, timestamptz, uuid),
    public.admin_review_ugc_report(text, uuid, uuid, bigint, text, text),
    public.admin_review_ugc_report(text, uuid, bigint, text, text)
  to authenticated;

comment on function public.create_social_post(uuid, text, public.post_media_type, text, uuid) is
  'Compatibility wrapper for phase-one clients; the launch frontend uses an explicit operation ID.';
comment on function public.create_social_post(uuid, uuid, text, public.post_media_type, text, uuid) is
  'Idempotently creates a bounded post for auth.uid() using a durable client operation ID.';
comment on function public.create_social_comment(uuid, uuid, text, uuid) is
  'Creates a bounded comment/reply for auth.uid() after block and nesting checks.';
comment on function public.report_social_post(uuid, uuid, text, text) is
  'Idempotently records the first report per authenticated reporter/post using a transaction advisory lock.';
comment on function public.report_social_comment(uuid, uuid, text, text) is
  'Idempotently records the first report per authenticated reporter/comment using a transaction advisory lock.';
comment on function public.report_social_user(uuid, uuid, text, text) is
  'Idempotently records the first report per authenticated reporter/user using a transaction advisory lock.';
comment on function public.admin_list_ugc_reports(text, integer, timestamptz, uuid) is
  'Lists the private UGC moderation queue only for signed app_metadata.role=admin sessions.';
comment on function public.admin_review_ugc_report(text, uuid, uuid, bigint, text, text) is
  'Updates review metadata for the expected reviewer with optimistic concurrency; actioned content reports reversibly soft-hide their target.';
comment on function public.admin_review_ugc_report(text, uuid, bigint, text, text) is
  'Temporary phase-one compatibility overload; remove in the restrictive cutover.';
