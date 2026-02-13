-- ================================================================
-- Update video_scenarios to store just filenames
-- ================================================================
-- The frontend now constructs the full Supabase Storage URL
-- using supabase.storage.from('Learn Videos').getPublicUrl(filename)
-- So we only need to store the filename in video_url.
-- ================================================================

-- Strip the placeholder URL prefix, leaving just the filename
UPDATE public.video_scenarios
SET video_url = regexp_replace(video_url, '^.+/', '')
WHERE video_url LIKE 'https://example.com/%';
