-- Seed: News Articles
-- Inserts dummy data for development testing

insert into public.news_articles (slug, title, summary, content, author, image_url, published_at)
values
  (
    'ifab-changes-2026',
    'IFAB Announces 2026 Rule Changes',
    'A summary of the major changes to the Laws of the Game coming this season.',
    '# IFAB 2026 Updates\n\nThe International Football Association Board has announced several key updates...\n\n## Key Changes\n1. Handball interpretation updates\n2. Substitution protocols',
    'RefLab Editorial',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1000',
    now()
  ),
  (
    'positioning-guide',
    'Mastering Referee Positioning',
    'Tips and tricks for being in the right place at the right time.',
    'Good positioning is key to making correct decisions. In this guide, we explore the diagonal system of control...',
    'Senior Instructor',
    'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=1000',
    now() - interval '2 days'
  ),
  (
    'fitness-test-prep',
    'Preparing for the FIFA Fitness Test',
    'A 6-week training plan to help you pass the high-intensity interval test.',
    'The FIFA fitness test consists of two parts: the repeated sprint ability (RSA) and the interval test...',
    'Fitness Coach',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=1000',
    now() - interval '5 days'
  )
on conflict (slug) do nothing;