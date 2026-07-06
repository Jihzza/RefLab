-- Migration: close IDOR in SECURITY DEFINER social RPCs
-- --------------------------------------------------------------------------
-- get_social_feed / get_post_comments / get_post_by_id run as SECURITY DEFINER
-- and take a caller-supplied `p_user_id` that is used to compute per-user
-- interaction state (is_liked / is_saved / is_reposted). Because they run as
-- definer they bypass row-level security, so an authenticated user could pass
-- ANOTHER user's id and read that user's private like/save/repost state.
--
-- Every messages/settings/dashboard RPC already guards this by comparing
-- auth.uid() to the supplied id. This migration adds the same guard to the
-- three social RPCs. It is purely additive: the frontend already passes the
-- caller's own id (features/social/api/socialApi.ts), so legitimate calls are
-- unaffected — only forged ids are rejected.
--
-- The function bodies below are reproduced verbatim from
--   20260211_0004_social_rpc.sql
--   20260213_0022_get_post_by_id_rpc.sql
-- with only the authorization guard added after BEGIN.
--
-- NOTE: this migration was authored but NOT executed against a live database
-- in this environment. Apply and test it on a branch/preview before production.
-- --------------------------------------------------------------------------

-- ============================================
-- 1. get_social_feed
-- ============================================
create or replace function public.get_social_feed(
  p_user_id uuid,
  p_media_type text default null,
  p_cursor timestamptz default null,
  p_limit integer default 20
)
returns json as $$
declare
  result json;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

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
        where pl.post_id = p.id and pl.user_id = p_user_id
      ) as is_liked,
      exists(
        select 1 from public.post_saves ps
        where ps.post_id = p.id and ps.user_id = p_user_id
      ) as is_saved,
      exists(
        select 1 from public.posts rp
        where rp.original_post_id = p.id and rp.user_id = p_user_id
      ) as is_reposted
    from public.posts p
    join public.profiles pr on pr.id = p.user_id
    left join public.posts op on op.id = p.original_post_id
    left join public.profiles opr on opr.id = op.user_id
    where
      p.user_id not in (
        select blocked_id from public.user_blocks where blocker_id = p_user_id
        union all
        select blocker_id from public.user_blocks where blocked_id = p_user_id
      )
      and (p_media_type is null or p.media_type = p_media_type::post_media_type)
      and (p_cursor is null or p.created_at < p_cursor)
    order by p.created_at desc
    limit p_limit
  ) t;

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer stable;

-- ============================================
-- 2. get_post_comments
-- ============================================
create or replace function public.get_post_comments(
  p_post_id uuid,
  p_user_id uuid
)
returns json as $$
declare
  result json;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select json_agg(row_to_json(t)) into result
  from (
    select
      c.id,
      c.content,
      c.like_count,
      c.created_at,
      c.user_id,
      json_build_object(
        'id', pr.id,
        'username', pr.username,
        'name', pr.name,
        'photo_url', pr.photo_url
      ) as author,
      exists(
        select 1 from public.comment_likes cl
        where cl.comment_id = c.id and cl.user_id = p_user_id
      ) as is_liked,
      coalesce(
        (
          select json_agg(row_to_json(r))
          from (
            select
              rc.id,
              rc.content,
              rc.like_count,
              rc.created_at,
              rc.user_id,
              json_build_object(
                'id', rpr.id,
                'username', rpr.username,
                'name', rpr.name,
                'photo_url', rpr.photo_url
              ) as author,
              exists(
                select 1 from public.comment_likes rcl
                where rcl.comment_id = rc.id and rcl.user_id = p_user_id
              ) as is_liked
            from public.post_comments rc
            join public.profiles rpr on rpr.id = rc.user_id
            where rc.parent_comment_id = c.id
            order by rc.created_at asc
          ) r
        ),
        '[]'::json
      ) as replies
    from public.post_comments c
    join public.profiles pr on pr.id = c.user_id
    where c.post_id = p_post_id
      and c.parent_comment_id is null
    order by c.created_at desc
  ) t;

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer stable;

-- ============================================
-- 3. get_post_by_id
-- ============================================
create or replace function public.get_post_by_id(
  p_user_id uuid,
  p_post_id uuid
)
returns json as $$
declare
  result json;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select row_to_json(t) into result
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
        where pl.post_id = p.id and pl.user_id = p_user_id
      ) as is_liked,
      exists(
        select 1 from public.post_saves ps
        where ps.post_id = p.id and ps.user_id = p_user_id
      ) as is_saved,
      exists(
        select 1 from public.posts rp
        where rp.original_post_id = p.id and rp.user_id = p_user_id
      ) as is_reposted
    from public.posts p
    join public.profiles pr on pr.id = p.user_id
    left join public.posts op on op.id = p.original_post_id
    left join public.profiles opr on opr.id = op.user_id
    where p.id = p_post_id
  ) t;

  return result;
end;
$$ language plpgsql security definer stable;
