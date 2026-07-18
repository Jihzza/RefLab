-- Restrictive phase for the UGC moderation cutover.
--
-- Apply only after 20260718103637 is present, the matching frontend is live,
-- and post/comment/report RPC smoke tests pass. Reads, deletes, likes, saves,
-- feeds, and historical content remain unchanged.

do $phase_one_contract_must_exist$
begin
  if to_regprocedure(
    'public.create_social_post(uuid,text,public.post_media_type,text,uuid)'
  ) is null
     or to_regprocedure(
       'public.create_social_post(uuid,uuid,text,public.post_media_type,text,uuid)'
     ) is null
     or to_regprocedure(
       'public.create_social_comment(uuid,uuid,text,uuid)'
     ) is null
     or to_regprocedure(
       'public.report_social_post(uuid,uuid,text,text)'
     ) is null
     or to_regprocedure(
       'public.report_social_comment(uuid,uuid,text,text)'
     ) is null
     or to_regprocedure(
       'public.report_social_user(uuid,uuid,text,text)'
     ) is null
     or to_regprocedure(
       'public.get_social_feed(uuid,text,timestamptz,integer)'
     ) is null
     or to_regprocedure(
       'public.get_post_comments(uuid,uuid)'
     ) is null then
    raise exception
      'UGC phase-one RPC contract is incomplete; refusing restrictive cutover'
      using errcode = '55000';
  end if;
end;
$phase_one_contract_must_exist$;

-- The compatibility wrapper deliberately generated a fresh operation ID for
-- every retry. Keep it through phase one, but remove it before the restrictive
-- contract becomes authoritative so every launch client must provide the
-- durable operation ID required for idempotent post creation.
drop function public.create_social_post(
  uuid,
  text,
  public.post_media_type,
  text,
  uuid
);

do $reviewer_bound_contract_must_exist$
begin
  if to_regprocedure(
    'public.admin_review_ugc_report(text,uuid,uuid,bigint,text,text)'
  ) is null then
    raise exception
      'Expected-reviewer moderation RPC contract is incomplete; refusing restrictive cutover'
      using errcode = '55000';
  end if;
end;
$reviewer_bound_contract_must_exist$;

drop function if exists public.admin_review_ugc_report(
  text,
  uuid,
  bigint,
  text,
  text
);

drop policy if exists "Users can insert post reports" on public.post_reports;
drop policy if exists "Admins can read post reports" on public.post_reports;
drop policy if exists "Users can insert comment reports" on public.comment_reports;
drop policy if exists "Admins can read comment reports" on public.comment_reports;
drop policy if exists "Users can insert user reports" on public.user_reports;
drop policy if exists "Admins can read user reports" on public.user_reports;

revoke all privileges
  on table
    public.post_reports,
    public.comment_reports,
    public.user_reports
  from public, anon, authenticated;

-- Force content creation/editing through the phase-one RPC contract. Existing
-- SELECT/DELETE behavior is not changed. SECURITY DEFINER count triggers keep
-- denormalized like/comment/repost counters operational without client UPDATE.
revoke insert, update on table public.posts from public, anon, authenticated;
revoke insert, update on table public.post_comments from public, anon, authenticated;
