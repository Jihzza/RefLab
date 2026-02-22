-- Migration: News Feature
-- Description: Adds news_articles and saved_articles tables.
-- Connects saved_articles to public.profiles.
-- Adds slug to news_articles to match existing tests table pattern.

-- 1. news_articles table
create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,             -- URL-friendly identifier (e.g. 'new-handball-rules')
  title text not null,
  summary text,                          -- Short preview for the feed
  content text,                          -- Full content (Markdown or HTML)
  source_url text,                       -- External link if needed
  image_url text,                        -- Path in 'media' bucket (e.g. 'news/hero1.jpg') or external URL
  author text,
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. saved_articles table
create table if not exists public.saved_articles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.news_articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

-- 3. Indexes
create index if not exists idx_news_articles_published_at on public.news_articles (published_at desc);
create index if not exists idx_saved_articles_user on public.saved_articles (user_id);

-- 4. Triggers for updated_at
-- Reusing the set_updated_at function (defined in tests_setup.sql)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_news_articles_updated_at on public.news_articles;
create trigger trg_news_articles_updated_at
before update on public.news_articles
for each row execute function public.set_updated_at();

-- 5. RLS Policies
alter table public.news_articles enable row level security;
alter table public.saved_articles enable row level security;

-- News: Everyone can read active articles
drop policy if exists "news_select_all" on public.news_articles;
create policy "news_select_all"
on public.news_articles for select
using (is_active = true);

-- News: Only service_role (admin) can insert/update/delete
-- (Implicitly denied for authenticated users by default)

-- Saved Articles: Users manage their own
drop policy if exists "saved_articles_select_own" on public.saved_articles;
create policy "saved_articles_select_own"
on public.saved_articles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "saved_articles_insert_own" on public.saved_articles;
create policy "saved_articles_insert_own"
on public.saved_articles for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_articles_delete_own" on public.saved_articles;
create policy "saved_articles_delete_own"
on public.saved_articles for delete
to authenticated
using (auth.uid() = user_id);