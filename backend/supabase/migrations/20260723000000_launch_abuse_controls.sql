-- RefLab launch abuse controls
--
-- Adds server-side, concurrency-safe limits for new social and messaging
-- writes. This migration is deliberately additive: it does not update, delete,
-- validate, or otherwise rewrite existing application data.
-- Apply only after 20260722_0050_launch_security_hardening.sql.

begin;

-- Fail before changing the catalog when the isolated launch hardening contract
-- is not present.
do $launch_abuse_controls_preflight$
declare
  v_missing_relations text[];
  v_missing_columns text[];
  v_missing_functions text[];
begin
  if current_setting('server_version_num')::integer < 150000 then
    raise exception 'Launch abuse controls require PostgreSQL 15 or newer';
  end if;

  if not exists (
    select 1
    from pg_roles role_entry
    where role_entry.rolname = current_user
      and (role_entry.rolsuper or role_entry.rolbypassrls)
  ) then
    raise exception 'Launch abuse controls require a privileged migration role'
      using hint = 'Run the isolated migration through the canonical Supabase migration role.';
  end if;

  select array_agg(required_relation order by required_relation)
  into v_missing_relations
  from unnest(array[
    'public.profiles',
    'public.posts',
    'public.post_comments',
    'public.post_reports',
    'public.comment_reports',
    'public.user_reports',
    'public.messages',
    'public.post_likes',
    'public.comment_likes',
    'public.user_follows',
    'public.post_saves',
    'public.user_blocks',
    'public.question_bank'
  ]::text[]) required_relation
  where to_regclass(required_relation) is null;

  select array_agg(
    required_schema || '.' || required_table || '.' || required_column
    order by required_schema, required_table, required_column
  )
  into v_missing_columns
  from (
    values
      ('public', 'posts', 'user_id'),
      ('public', 'post_comments', 'user_id'),
      ('public', 'post_reports', 'reporter_id'),
      ('public', 'comment_reports', 'reporter_id'),
      ('public', 'user_reports', 'reporter_id'),
      ('public', 'messages', 'sender_id'),
      ('public', 'post_likes', 'user_id'),
      ('public', 'comment_likes', 'user_id'),
      ('public', 'user_follows', 'follower_id'),
      ('public', 'post_saves', 'user_id'),
      ('public', 'user_blocks', 'blocker_id')
  ) required(required_schema, required_table, required_column)
  where not exists (
    select 1
    from information_schema.columns catalog_column
    where catalog_column.table_schema = required.required_schema
      and catalog_column.table_name = required.required_table
      and catalog_column.column_name = required.required_column
  );

  select array_agg(required_function order by required_function)
  into v_missing_functions
  from unnest(array[
    'auth.uid()',
    'reflab_private.current_user_has_deletion_job()'
  ]::text[]) required_function
  where to_regprocedure(required_function) is null;

  if coalesce(cardinality(v_missing_relations), 0) > 0
     or coalesce(cardinality(v_missing_columns), 0) > 0
     or coalesce(cardinality(v_missing_functions), 0) > 0 then
    raise exception 'Launch abuse-controls catalog preflight failed'
      using detail = concat_ws(
        '; ',
        case when cardinality(v_missing_relations) > 0
          then 'missing relations: ' || array_to_string(v_missing_relations, ', ')
        end,
        case when cardinality(v_missing_columns) > 0
          then 'missing columns: ' || array_to_string(v_missing_columns, ', ')
        end,
        case when cardinality(v_missing_functions) > 0
          then 'missing functions: ' || array_to_string(v_missing_functions, ', ')
        end
      ),
      hint = 'Apply and verify 20260722_0050 before this isolated migration.';
  end if;

  -- questions_full exists in the linked launch database but is not created by
  -- the canonical migration history. Keep clean rebuilds functional while
  -- failing if a same-named non-table relation would make hardening unsafe.
  if to_regclass('public.questions_full') is not null
     and not exists (
       select 1
       from pg_class relation_entry
       join pg_namespace relation_schema
         on relation_schema.oid = relation_entry.relnamespace
       where relation_schema.nspname = 'public'
         and relation_entry.relname = 'questions_full'
         and relation_entry.relkind in ('r', 'p')
     ) then
    raise exception 'Launch abuse-controls catalog preflight failed'
      using detail = 'public.questions_full exists but is not a table',
        hint = 'Reconcile the linked schema drift before applying this migration.';
  end if;
end;
$launch_abuse_controls_preflight$;

-- question_bank is the authenticated app's read-only source of truth. The
-- drift-only questions_full table has no legitimate client consumer and is
-- locked completely when present. Service roles retain full access.
alter table public.question_bank enable row level security;
revoke all on table public.question_bank from public, anon, authenticated;
grant select on table public.question_bank to authenticated;
grant all on table public.question_bank to service_role;

drop policy if exists question_bank_select_authenticated
  on public.question_bank;
create policy question_bank_select_authenticated
  on public.question_bank
  for select
  to authenticated
  using (true);

do $harden_drifted_questions_full$
begin
  if to_regclass('public.questions_full') is not null then
    execute 'alter table public.questions_full enable row level security';
    execute 'revoke all on table public.questions_full from public, anon, authenticated';
    execute 'grant all on table public.questions_full to service_role';
  end if;
end;
$harden_drifted_questions_full$;

-- Revoke browser execution of linked legacy/broken RPCs with no current client
-- consumer. Exact-signature checks keep canonical rebuilds valid. Explicitly
-- retain service_role; PostgreSQL trigger invocation is unaffected by EXECUTE.
do $revoke_unused_public_rpcs$
declare
  v_signature text;
begin
  for v_signature in
    select unnest(array[
      'abandon_stale_attempts()',
      'finalize_test_attempt(uuid)',
      'get_review_data(uuid)',
      'lock_answer(uuid,uuid,uuid)',
      'start_or_resume_attempt(uuid)',
      'submit_video_decision_attempt(uuid,text,text)',
      'get_feed_posts(text,timestamptz,integer)',
      'get_post_by_id(uuid)',
      'notify_new_content(uuid,text)',
      'notify_plan_activated(uuid)',
      'notify_plan_expiring()',
      'notify_streak_continued(uuid)',
      'notify_streak_loss()',
      'notify_streak_reminder()'
    ]::text[])
  loop
    if to_regprocedure('public.' || v_signature) is not null then
      execute format(
        'revoke all on function public.%s from public, anon, authenticated',
        v_signature
      );
      execute format(
        'grant execute on function public.%s to service_role',
        v_signature
      );
    end if;
  end loop;
end;
$revoke_unused_public_rpcs$;

-- service_role can inspect UUID-only counters for incident response. API roles
-- have no direct access to the table or privileged helpers.
grant usage on schema reflab_private to service_role;

-- One bounded row is retained per user/action/window pair. Reusing the row
-- avoids an unbounded event log while keeping active counters auditable.
create table reflab_private.abuse_rate_limits (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action_key text not null,
  window_seconds integer not null,
  window_started_at timestamptz not null,
  hit_count integer not null,
  max_hits integer not null,
  updated_at timestamptz not null,
  primary key (actor_id, action_key, window_seconds),
  constraint abuse_rate_limits_action_key_check
    check (action_key ~ '^[a-z0-9:-]{1,80}$'),
  constraint abuse_rate_limits_window_check
    check (window_seconds between 1 and 86400),
  constraint abuse_rate_limits_hit_count_check
    check (hit_count between 1 and 10000),
  constraint abuse_rate_limits_max_hits_check
    check (max_hits between 1 and 10000)
);

comment on table reflab_private.abuse_rate_limits is
  'Current fixed-duration abuse-control counters. No post, message, report, IP address, or other content is stored here.';

alter table reflab_private.abuse_rate_limits enable row level security;
revoke all on table reflab_private.abuse_rate_limits
  from public, anon, authenticated;
grant select, delete on table reflab_private.abuse_rate_limits
  to service_role;

-- Atomically consume one allowance. Browser writes must match auth.uid(), and
-- trigger invocation is the only API path to this SECURITY DEFINER helper.
create function reflab_private.consume_abuse_rate_limit(
  p_actor_id uuid,
  p_action_key text,
  p_window_seconds integer,
  p_max_hits integer
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_authenticated_actor uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_hit_count integer;
begin
  if p_actor_id is null
     or p_actor_id is distinct from v_authenticated_actor then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if p_action_key is null
     or p_action_key !~ '^[a-z0-9:-]{1,80}$'
     or p_window_seconds is null
     or p_window_seconds not between 1 and 86400
     or p_max_hits is null
     or p_max_hits not between 1 and 10000 then
    raise exception 'Invalid abuse-control configuration'
      using errcode = '22023';
  end if;

  insert into reflab_private.abuse_rate_limits as current_limit (
    actor_id,
    action_key,
    window_seconds,
    window_started_at,
    hit_count,
    max_hits,
    updated_at
  ) values (
    p_actor_id,
    p_action_key,
    p_window_seconds,
    v_now,
    1,
    p_max_hits,
    v_now
  )
  on conflict (actor_id, action_key, window_seconds) do update
  set
    window_started_at = case
      when current_limit.window_started_at
        + make_interval(secs => p_window_seconds) <= excluded.window_started_at
        then excluded.window_started_at
      else current_limit.window_started_at
    end,
    hit_count = case
      when current_limit.window_started_at
        + make_interval(secs => p_window_seconds) <= excluded.window_started_at
        then 1
      else current_limit.hit_count + 1
    end,
    max_hits = excluded.max_hits,
    updated_at = excluded.updated_at
  where
    current_limit.window_started_at
      + make_interval(secs => p_window_seconds) <= excluded.window_started_at
    or current_limit.hit_count < excluded.max_hits
  returning hit_count into v_hit_count;

  if v_hit_count is null then
    raise sqlstate 'PT429'
      using
        message = 'Rate limit exceeded',
        detail = format(
          'Action %s allows at most %s successful requests per %s seconds.',
          p_action_key,
          p_max_hits,
          p_window_seconds
        ),
        hint = 'Retry after the current rate-limit window expires.';
  end if;
end;
$$;

revoke all on function reflab_private.consume_abuse_rate_limit(
  uuid, text, integer, integer
) from public, anon, authenticated;

-- Generic trigger for client-created rows. Trusted server-side writes without
-- an authenticated JWT are left unchanged; RLS remains the authorization
-- authority. Authenticated writes must own the actor column and consume both
-- short and daily allowances atomically.
create function reflab_private.enforce_social_write_rate_limit()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_authenticated_actor uuid := auth.uid();
  v_row_actor uuid;
  v_row jsonb := to_jsonb(new);
  v_actor_column text;
  v_action_key text;
  v_burst_seconds integer;
  v_burst_max integer;
  v_daily_max integer;
begin
  if tg_op <> 'INSERT' or v_authenticated_actor is null then
    return new;
  end if;

  if tg_nargs <> 5 then
    raise exception 'Invalid social rate-limit trigger configuration'
      using errcode = '22023';
  end if;

  v_actor_column := tg_argv[0];
  v_action_key := tg_argv[1];
  v_burst_seconds := tg_argv[2]::integer;
  v_burst_max := tg_argv[3]::integer;
  v_daily_max := tg_argv[4]::integer;

  begin
    v_row_actor := nullif(v_row ->> v_actor_column, '')::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Invalid social write owner'
        using errcode = '42501';
  end;

  if v_row_actor is null or v_row_actor <> v_authenticated_actor then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  perform reflab_private.consume_abuse_rate_limit(
    v_row_actor,
    v_action_key || ':burst',
    v_burst_seconds,
    v_burst_max
  );
  perform reflab_private.consume_abuse_rate_limit(
    v_row_actor,
    v_action_key || ':daily',
    86400,
    v_daily_max
  );

  return new;
end;
$$;

revoke all on function reflab_private.enforce_social_write_rate_limit()
  from public, anon, authenticated;

-- Posts, including reposts: 10 per 10 minutes and 60 per 24-hour window.
create trigger enforce_posts_launch_rate_limit
  before insert on public.posts
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'user_id', 'social:post', '600', '10', '60'
  );

-- Comments and replies: 30 per 10 minutes and 200 per 24-hour window.
create trigger enforce_post_comments_launch_rate_limit
  before insert on public.post_comments
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'user_id', 'social:comment', '600', '30', '200'
  );

-- All report target types share 10 per hour and 30 per 24-hour window.
create trigger enforce_post_reports_launch_rate_limit
  before insert on public.post_reports
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'reporter_id', 'social:report', '3600', '10', '30'
  );

create trigger enforce_comment_reports_launch_rate_limit
  before insert on public.comment_reports
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'reporter_id', 'social:report', '3600', '10', '30'
  );

create trigger enforce_user_reports_launch_rate_limit
  before insert on public.user_reports
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'reporter_id', 'social:report', '3600', '10', '30'
  );

-- Direct messages: 60 per 5 minutes and 1,000 per 24-hour window.
create trigger enforce_messages_launch_rate_limit
  before insert on public.messages
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'sender_id', 'social:message', '300', '60', '1000'
  );

-- Post and comment likes share one allowance. This prevents unlike/re-like or
-- cross-target cycling from bypassing 120 per 10 minutes and 500 per day.
create trigger enforce_post_likes_launch_rate_limit
  before insert on public.post_likes
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'user_id', 'social:reaction', '600', '120', '500'
  );

create trigger enforce_comment_likes_launch_rate_limit
  before insert on public.comment_likes
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'user_id', 'social:reaction', '600', '120', '500'
  );

-- Follow cycles can generate repeated notifications: 30/hour and 100/day.
create trigger enforce_user_follows_launch_rate_limit
  before insert on public.user_follows
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'follower_id', 'social:follow', '3600', '30', '100'
  );

-- Saves: 60/hour and 300/day.
create trigger enforce_post_saves_launch_rate_limit
  before insert on public.post_saves
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'user_id', 'social:save', '3600', '60', '300'
  );

-- Blocks: 20/hour and 100/day.
create trigger enforce_user_blocks_launch_rate_limit
  before insert on public.user_blocks
  for each row execute function reflab_private.enforce_social_write_rate_limit(
    'blocker_id', 'social:block', '3600', '20', '100'
  );

commit;
