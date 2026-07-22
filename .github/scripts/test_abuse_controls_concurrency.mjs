import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import pg from 'pg'

const { Pool } = pg
const databaseUrl = process.env.ABUSE_TEST_DATABASE_URL

assert.ok(
  databaseUrl,
  'ABUSE_TEST_DATABASE_URL is required; run this test against an isolated PostgreSQL 17 database'
)

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const migration = await readFile(
  path.join(
    root,
    'backend',
    'supabase',
    'migrations',
    '20260723000000_launch_abuse_controls.sql'
  ),
  'utf8'
)

const pool = new Pool({
  connectionString: databaseUrl,
  max: 40,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 5_000,
})

const actorId = '00000000-0000-4000-8000-000000000001'
const requestCount = 80
const expectedAccepted = 60

const fixtureSql = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create schema reflab_private;
  grant usage on schema public, auth, reflab_private to authenticated;

  create function auth.uid()
  returns uuid
  language sql
  stable
  set search_path = ''
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create function reflab_private.current_user_has_deletion_job()
  returns boolean
  language sql
  stable
  set search_path = ''
  as 'select false';

  create table public.profiles (id uuid primary key);
  create table public.question_bank (id uuid primary key);
  create table public.posts (id uuid primary key default gen_random_uuid(), user_id uuid not null);
  create table public.post_comments (id uuid primary key default gen_random_uuid(), user_id uuid not null);
  create table public.post_reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null);
  create table public.comment_reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null);
  create table public.user_reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null);
  create table public.messages (id uuid primary key default gen_random_uuid(), sender_id uuid not null);
  create table public.post_likes (id uuid primary key default gen_random_uuid(), user_id uuid not null);
  create table public.comment_likes (id uuid primary key default gen_random_uuid(), user_id uuid not null);
  create table public.user_follows (id uuid primary key default gen_random_uuid(), follower_id uuid not null);
  create table public.post_saves (id uuid primary key default gen_random_uuid(), user_id uuid not null);
  create table public.user_blocks (id uuid primary key default gen_random_uuid(), blocker_id uuid not null);

  grant insert on table public.messages to authenticated;
  insert into public.profiles(id) values ('${actorId}');
`

async function attemptConcurrentMessage() {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('set local role authenticated')
    await client.query(
      "select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true)",
      [actorId]
    )
    await client.query('insert into public.messages(sender_id) values ($1)', [actorId])
    await client.query('commit')
    return 'accepted'
  } catch (error) {
    await client.query('rollback')
    if (error.code === 'PT429') return 'limited'
    throw error
  } finally {
    client.release()
  }
}

try {
  const versionResult = await pool.query(
    "select current_setting('server_version_num')::integer as version_num, version() as version"
  )
  const versionNum = Number(versionResult.rows[0].version_num)
  assert.ok(
    versionNum >= 170000 && versionNum < 180000,
    `concurrency evidence requires PostgreSQL 17, received ${versionResult.rows[0].version}`
  )

  await pool.query(fixtureSql)
  await pool.query(migration)

  const outcomes = await Promise.all(
    Array.from({ length: requestCount }, () => attemptConcurrentMessage())
  )
  const accepted = outcomes.filter((outcome) => outcome === 'accepted').length
  const limited = outcomes.filter((outcome) => outcome === 'limited').length

  assert.equal(
    accepted,
    expectedAccepted,
    'atomic ON CONFLICT counter must accept exactly the configured burst allowance'
  )
  assert.equal(limited, requestCount - expectedAccepted)

  const evidence = await pool.query(
    `select
       (select count(*)::integer from public.messages) as message_count,
       hit_count,
       max_hits,
       window_seconds
     from reflab_private.abuse_rate_limits
     where actor_id = $1
       and action_key = 'social:message:burst'`,
    [actorId]
  )

  assert.equal(evidence.rows.length, 1)
  assert.deepEqual(
    {
      messageCount: Number(evidence.rows[0].message_count),
      hitCount: Number(evidence.rows[0].hit_count),
      maxHits: Number(evidence.rows[0].max_hits),
      windowSeconds: Number(evidence.rows[0].window_seconds),
    },
    {
      messageCount: expectedAccepted,
      hitCount: expectedAccepted,
      maxHits: expectedAccepted,
      windowSeconds: 300,
    }
  )

  const dailyHits = await pool.query(
    `select hit_count, max_hits
     from reflab_private.abuse_rate_limits
     where actor_id = $1 and action_key = 'social:message:daily'`,
    [actorId]
  )
  assert.deepEqual(
    {
      hitCount: Number(dailyHits.rows[0].hit_count),
      maxHits: Number(dailyHits.rows[0].max_hits),
    },
    { hitCount: expectedAccepted, maxHits: 1000 }
  )

  console.log(
    `PostgreSQL 17 concurrency test passed: ${accepted} accepted, ${limited} rate-limited.`
  )
} finally {
  await pool.end()
}
