-- Migration: improve user search using pg_trgm + similarity ranking

-- 1) Add pg_trgm extension (safe to run if already exists)
create extension if not exists pg_trgm;

-- 2) Add GIN trigram indexes on searchable columns (lowercased for case-insensitive matches)
create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (lower(username) gin_trgm_ops);

create index if not exists profiles_name_trgm_idx
  on public.profiles using gin (lower(name) gin_trgm_ops);

-- 3) Replace search_users RPC to leverage trigram similarity and rank results
create or replace function search_users(search_term TEXT)
returns table (
  id UUID,
  username TEXT,
  name TEXT,
  photo_url TEXT,
  is_following BOOLEAN
) as $$
BEGIN
  -- normalize incoming term
  IF trim(coalesce(search_term, '')) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.name,
    p.photo_url,
    EXISTS (
      SELECT 1 FROM user_follows uf
      WHERE uf.follower_id = auth.uid() AND uf.following_id = p.id
    ) as is_following
  FROM public.public_profiles p
  WHERE
    (
      p.username ILIKE '%' || search_term || '%' OR
      p.name ILIKE '%' || search_term || '%'
    )
    AND p.id <> auth.uid()
  ORDER BY
    -- Prefer exact / prefix matches, then trigram similarity score
    (CASE WHEN lower(p.username) = lower(search_term) THEN 3
          WHEN lower(p.username) LIKE lower(search_term) || '%' THEN 2
          WHEN lower(p.username) LIKE '%' || lower(search_term) || '%' THEN 1
          ELSE 0 END) DESC,
    greatest(
      similarity(lower(p.username), lower(search_term)),
      similarity(coalesce(lower(p.name), ''), lower(search_term))
    ) DESC
  LIMIT 25;
END;
$$ LANGUAGE plpgsql STABLE;
