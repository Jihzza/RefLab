CREATE OR REPLACE FUNCTION search_users(search_term TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  name TEXT,
  photo_url TEXT,
  is_following BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.name,
    p.photo_url,
    EXISTS (
      SELECT 1
      FROM user_follows uf
      WHERE uf.follower_id = auth.uid() AND uf.following_id = p.id
    ) as is_following
  FROM
    public.public_profiles p
  WHERE
    (
      p.username ILIKE '%' || search_term || '%' OR
      p.name ILIKE '%' || search_term || '%'
    ) AND
    p.id <> auth.uid()
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
