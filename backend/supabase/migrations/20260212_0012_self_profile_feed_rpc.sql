-- Migration: self profile feed RPC
-- Adds get_profile_feed to fetch one profile's posts/reposts with viewer interaction flags.

drop function if exists public.get_profile_feed(uuid, uuid, text, timestamptz, integer);

create or replace function public.get_profile_feed(
  p_viewer_id uuid,
  p_profile_user_id uuid,
  p_media_type text default null,
  p_cursor timestamptz default null,
  p_limit integer default 20
)
returns json as $$
declare
  result json;
begin
  if auth.uid() is distinct from p_viewer_id then
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
    where p.user_id = p_profile_user_id
      and (p_media_type is null or p.media_type = p_media_type::post_media_type)
      and (p_cursor is null or p.created_at < p_cursor)
    order by p.created_at desc
    limit p_limit
  ) t;

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer stable set search_path = public;

revoke all on function public.get_profile_feed(uuid, uuid, text, timestamptz, integer) from public;
grant execute on function public.get_profile_feed(uuid, uuid, text, timestamptz, integer) to authenticated;
