-- Migration: get_post_by_id RPC
-- Returns a single post with the same structure as get_social_feed.
-- Used by the post detail page (linked from notifications, share URLs, etc.)

create or replace function public.get_post_by_id(
  p_user_id uuid,
  p_post_id uuid
)
returns json as $$
declare
  result json;
begin
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
