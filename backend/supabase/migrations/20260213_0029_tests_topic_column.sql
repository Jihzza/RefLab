-- 20260213_0029_tests_topic_column.sql
-- Adds topic column to tests for dashboard accuracy-by-topic breakdown

alter table public.tests
  add column topic text;

-- Constrain to known refereeing topics (nullable for existing tests without a topic)
alter table public.tests
  add constraint tests_valid_topic check (
    topic is null or topic in (
      'Offside',
      'Fouls',
      'Handball',
      'Penalties',
      'Advantage',
      'Cards',
      'Substitutions',
      'VAR',
      'Free Kicks',
      'Throw-Ins',
      'Goal Kicks',
      'Corner Kicks',
      'General'
    )
  );

-- Index for GROUP BY topic queries in the dashboard RPC
create index idx_tests_topic on public.tests(topic);
