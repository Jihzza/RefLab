-- Migration: social triggers
-- Trigger functions to maintain denormalized counts on posts and comments

-- ============================================
-- 1. Post like count
-- ============================================
create or replace function public.handle_post_like_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_post_like_insert
  after insert on public.post_likes
  for each row execute function public.handle_post_like_count();

create trigger on_post_like_delete
  after delete on public.post_likes
  for each row execute function public.handle_post_like_count();

-- ============================================
-- 2. Post save count
-- ============================================
create or replace function public.handle_post_save_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set save_count = save_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set save_count = greatest(save_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_post_save_insert
  after insert on public.post_saves
  for each row execute function public.handle_post_save_count();

create trigger on_post_save_delete
  after delete on public.post_saves
  for each row execute function public.handle_post_save_count();

-- ============================================
-- 3. Post comment count
-- ============================================
create or replace function public.handle_post_comment_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_post_comment_insert
  after insert on public.post_comments
  for each row execute function public.handle_post_comment_count();

create trigger on_post_comment_delete
  after delete on public.post_comments
  for each row execute function public.handle_post_comment_count();

-- ============================================
-- 4. Post repost count
-- ============================================
create or replace function public.handle_post_repost_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT' and new.original_post_id is not null) then
    update public.posts set repost_count = repost_count + 1 where id = new.original_post_id;
    return new;
  elsif (tg_op = 'DELETE' and old.original_post_id is not null) then
    update public.posts set repost_count = greatest(repost_count - 1, 0) where id = old.original_post_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_post_repost_insert
  after insert on public.posts
  for each row execute function public.handle_post_repost_count();

create trigger on_post_repost_delete
  after delete on public.posts
  for each row execute function public.handle_post_repost_count();

-- ============================================
-- 5. Comment like count
-- ============================================
create or replace function public.handle_comment_like_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.post_comments set like_count = like_count + 1 where id = new.comment_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.post_comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_comment_like_insert
  after insert on public.comment_likes
  for each row execute function public.handle_comment_like_count();

create trigger on_comment_like_delete
  after delete on public.comment_likes
  for each row execute function public.handle_comment_like_count();
