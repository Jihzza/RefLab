-- Migration: social public profile follows + profile feed RPC
-- Adds follow relationships, profile view/feed RPCs, and follow cleanup on block

-- ============================================
-- 1. Follows table
-- ============================================
create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists user_follows_follower_id_idx
  on public.user_follows(follower_id);

create index if not exists user_follows_following_id_idx
  on public.user_follows(following_id);

alter table public.user_follows enable row level security;

drop policy if exists "Authenticated users can read follows" on public.user_follows;
create policy "Authenticated users can read follows"
  on public.user_follows for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can insert own follows" on public.user_follows;
create policy "Users can insert own follows"
  on public.user_follows for insert
  with check (follower_id = auth.uid());

drop policy if exists "Users can delete own follows" on public.user_follows;
create policy "Users can delete own follows"
  on public.user_follows for delete
  using (follower_id = auth.uid());

-- ============================================
-- 2. Cleanup follow relationships when blocking
-- ============================================
create or replace function public.handle_user_block_remove_follows()
returns trigger as $$
begin
  delete from public.user_follows
  where
    (follower_id = new.blocker_id and following_id = new.blocked_id)
    or (follower_id = new.blocked_id and following_id = new.blocker_id);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_user_blocks_remove_follows on public.user_blocks;
create trigger on_user_blocks_remove_follows
  after insert on public.user_blocks
  for each row execute function public.handle_user_block_remove_follows();

-- ============================================
-- 3. Public profile view RPC
-- ============================================
drop function if exists public.get_public_profile_view(uuid, text);
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
) as $$
declare
  v_username text;
begin
  if auth.uid() is distinct from p_viewer_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_username := trim(coalesce(p_username, ''));
  if v_username = '' then
    return;
  end if;

  return query
  select
    pr.id,
    pr.username,
    pr.name,
    pr.photo_url,
    exists(
      select 1
      from public.user_follows uf
      where uf.follower_id = p_viewer_id
        and uf.following_id = pr.id
    ) as is_following,
    exists(
      select 1
      from public.user_blocks ub
      where ub.blocker_id = p_viewer_id
        and ub.blocked_id = pr.id
    ) as is_blocked_by_viewer,
    exists(
      select 1
      from public.user_blocks ub
      where ub.blocker_id = pr.id
        and ub.blocked_id = p_viewer_id
    ) as has_blocked_viewer
  from public.profiles pr
  where lower(pr.username) = lower(v_username)
  limit 1;
end;
$$ language plpgsql security definer stable set search_path = public;

-- ============================================
-- 4. Public profile feed RPC
-- ============================================
drop function if exists public.get_public_profile_feed(uuid, uuid, timestamptz, integer);
create or replace function public.get_public_profile_feed(
  p_viewer_id uuid,
  p_target_user_id uuid,
  p_cursor timestamptz default null,
  p_limit integer default 20
)
returns json as $$
declare
  v_limit integer;
  result json;
begin
  if auth.uid() is distinct from p_viewer_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_target_user_id is null then
    return '[]'::json;
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 20), 50));

  select json_agg(row_to_json(t)) into result
  from (
    select
      p.id,
      p.content,
      p.media_type,
      p.media_url,
      p.media_metadata,
      p.original_post_id,
      p.like_count,
      p.comment_count,
      p.repost_count,
      p.save_count,
      p.created_at,
      json_build_object(
        'id', pr.id,
        'username', pr.username,
        'name', pr.name,
        'photo_url', pr.photo_url
      ) as author,
      case when p.original_post_id is not null then
        json_build_object(
          'id', op.id,
          'content', op.content,
          'media_type', op.media_type,
          'media_url', op.media_url,
          'media_metadata', op.media_metadata,
          'like_count', op.like_count,
          'comment_count', op.comment_count,
          'repost_count', op.repost_count,
          'save_count', op.save_count,
          'created_at', op.created_at,
          'author', json_build_object(
            'id', opr.id,
            'username', opr.username,
            'name', opr.name,
            'photo_url', opr.photo_url
          )
        )
      else null end as original_post,
      exists(
        select 1 from public.post_likes pl
        where pl.post_id = p.id and pl.user_id = p_viewer_id
      ) as is_liked,
      exists(
        select 1 from public.post_saves ps
        where ps.post_id = p.id and ps.user_id = p_viewer_id
      ) as is_saved,
      exists(
        select 1 from public.posts rp
        where rp.original_post_id = p.id and rp.user_id = p_viewer_id
      ) as is_reposted
    from public.posts p
    join public.profiles pr on pr.id = p.user_id
    left join public.posts op on op.id = p.original_post_id
    left join public.profiles opr on opr.id = op.user_id
    where
      p.user_id = p_target_user_id
      and p.user_id not in (
        select blocked_id from public.user_blocks where blocker_id = p_viewer_id
        union all
        select blocker_id from public.user_blocks where blocked_id = p_viewer_id
      )
      and (p_cursor is null or p.created_at < p_cursor)
    order by p.created_at desc
    limit v_limit
  ) t;

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer stable set search_path = public;
