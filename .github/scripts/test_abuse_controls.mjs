import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const migrationDirectory = path.join(root, 'backend', 'supabase', 'migrations')
const securityHardeningMigrationName = '20260722_0050_launch_security_hardening.sql'
const abuseControlsMigrationName = '20260723000000_launch_abuse_controls.sql'
const migrationNames = (await readdir(migrationDirectory)).filter((name) =>
  name.endsWith('_launch_abuse_controls.sql')
)

assert.deepEqual(
  migrationNames,
  [abuseControlsMigrationName],
  'expected one CLI-generated launch abuse-controls migration'
)
assert.ok(
  securityHardeningMigrationName < abuseControlsMigrationName,
  '0050 must sort before the dependent abuse-controls migration'
)
assert.ok(
  Number(securityHardeningMigrationName.split('_', 1)[0]) <
    Number(abuseControlsMigrationName.split('_', 1)[0]),
  'abuse-controls migration must use a unique, monotonic Supabase version'
)

const migration = await readFile(path.join(migrationDirectory, migrationNames[0]), 'utf8')
assert.doesNotMatch(
  migration,
  /storage[.]objects|enforce_user_media|upload quota|retained-byte/i,
  'launch abuse controls must not modify Supabase Storage internal schemas'
)

const optionalRpcSignatures = [
  'abandon_stale_attempts()',
  'finalize_test_attempt(uuid)',
  'get_review_data(uuid)',
  'lock_answer(uuid,uuid,uuid)',
  'start_or_resume_attempt(uuid)',
  'submit_video_decision_attempt(uuid,text,text)',
  'get_feed_posts(text,timestamptz,integer)',
  'get_post_by_id(uuid)',
  'notify_new_content(uuid,text)',
  'notify_plan_activated(uuid)',
  'notify_plan_expiring()',
  'notify_streak_continued(uuid)',
  'notify_streak_loss()',
  'notify_streak_reminder()',
]

const optionalRpcFixtureSql = optionalRpcSignatures
  .map(
    (signature) => `
      create function public.${signature}
      returns text
      language sql
      security definer
      set search_path = ''
      as 'select ''ok''::text';
    `
  )
  .join('\n')

const securityHardeningDependencySql = `
  create function reflab_private.current_user_has_deletion_job()
  returns boolean
  language sql
  stable
  set search_path = ''
  as 'select false';
`

const fixtureSql = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create schema reflab_private;

  grant usage on schema public to anon;
  grant usage on schema public, auth, reflab_private to authenticated;
  grant usage on schema public, auth to service_role;

  create function auth.uid()
  returns uuid
  language sql
  stable
  set search_path = ''
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table public.profiles (
    id uuid primary key
  );

  create table public.question_bank (
    id uuid primary key,
    prompt text not null
  );

  create table public.questions_full (
    id uuid primary key,
    prompt text not null
  );

  ${optionalRpcFixtureSql}

  create table public.posts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade
  );

  create table public.post_comments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade
  );

  create table public.post_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.profiles(id) on delete cascade
  );

  create table public.comment_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.profiles(id) on delete cascade
  );

  create table public.user_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.profiles(id) on delete cascade
  );

  create table public.messages (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null references public.profiles(id) on delete cascade
  );

  create table public.post_likes (
    user_id uuid not null references public.profiles(id) on delete cascade,
    post_id uuid not null,
    primary key (user_id, post_id)
  );

  create table public.comment_likes (
    user_id uuid not null references public.profiles(id) on delete cascade,
    comment_id uuid not null,
    primary key (user_id, comment_id)
  );

  create table public.user_follows (
    follower_id uuid not null references public.profiles(id) on delete cascade,
    following_id uuid not null references public.profiles(id) on delete cascade,
    primary key (follower_id, following_id)
  );

  create table public.post_saves (
    user_id uuid not null references public.profiles(id) on delete cascade,
    post_id uuid not null,
    primary key (user_id, post_id)
  );

  create table public.user_blocks (
    blocker_id uuid not null references public.profiles(id) on delete cascade,
    blocked_id uuid not null references public.profiles(id) on delete cascade,
    primary key (blocker_id, blocked_id)
  );

  -- Model the production notification-producing INSERT triggers. A successful
  -- unlike/re-like or unfollow/re-follow cycle emits again; a blocked INSERT
  -- must never reach this AFTER trigger.
  create table public.notification_probe (
    id bigint generated always as identity primary key,
    actor_id uuid not null,
    source_table text not null
  );

  create function public.record_notification_probe()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_row jsonb := to_jsonb(new);
  begin
    insert into public.notification_probe(actor_id, source_table)
    values (
      coalesce(
        nullif(v_row ->> 'user_id', '')::uuid,
        nullif(v_row ->> 'follower_id', '')::uuid
      ),
      tg_table_name
    );
    return new;
  end;
  $$;

  create trigger post_like_notification_probe
    after insert on public.post_likes
    for each row execute function public.record_notification_probe();

  create trigger user_follow_notification_probe
    after insert on public.user_follows
    for each row execute function public.record_notification_probe();

  grant select, insert, update, delete
    on table public.question_bank, public.questions_full
    to public, anon, authenticated, service_role;

  grant select, insert, delete on table
    public.posts,
    public.post_comments,
    public.post_reports,
    public.comment_reports,
    public.user_reports,
    public.messages,
    public.post_likes,
    public.comment_likes,
    public.user_follows,
    public.post_saves,
    public.user_blocks
    to authenticated;
`

const actor = (suffix) => `00000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`
const actors = Array.from({ length: 12 }, (_, index) => actor(index + 1))
const target = (suffix) => actor(7000 + suffix)

const db = new PGlite()
await db.exec(fixtureSql)

let inverseOrderFailure
try {
  await db.exec(migration)
} catch (error) {
  inverseOrderFailure = error
}
await db.exec('rollback')
assert.ok(inverseOrderFailure, 'abuse-controls migration must reject execution before 0050')
assert.equal(inverseOrderFailure.code, 'P0001')
assert.match(inverseOrderFailure.message, /catalog preflight failed/i)
assert.equal(
  await db
    .query("select to_regclass('reflab_private.abuse_rate_limits') is null as is_absent")
    .then((result) => result.rows[0].is_absent),
  true,
  'inverse-order rejection must leave no abuse-control table behind'
)

await db.exec(securityHardeningDependencySql)

for (const userId of actors) {
  await db.query('insert into public.profiles (id) values ($1)', [userId])
}

const legacyPostId = actor(9001)
const legacyQuestionId = actor(9002)
const legacyFullQuestionId = actor(9003)
await db.query('insert into public.posts (id, user_id) values ($1, $2)', [legacyPostId, actors[0]])
await db.query('insert into public.question_bank (id, prompt) values ($1, $2)', [
  legacyQuestionId,
  'Canonical launch question',
])
await db.query('insert into public.questions_full (id, prompt) values ($1, $2)', [
  legacyFullQuestionId,
  'Drifted launch question',
])

await db.exec(migration)

const [{ version }] = await db.query('select version() as version').then((result) => result.rows)
assert.match(version, /PostgreSQL 17[.]/, 'PGlite must execute the migration with PostgreSQL 17')

async function scalar(sql, params = []) {
  const result = await db.query(sql, params)
  return Object.values(result.rows[0])[0]
}

async function asActor(userId) {
  await db.exec(`
    set role authenticated;
    set request.jwt.claim.sub = '${userId}';
    set request.jwt.claim.role = 'authenticated';
  `)
}

async function asPostgres() {
  await db.exec(`
    reset role;
    set request.jwt.claim.sub = '';
    set request.jwt.claim.role = '';
  `)
  assert.equal(await scalar('select auth.uid()'), null, 'trusted setup must clear auth.uid()')
}

async function expectSqlState(sql, expectedCode, message) {
  let failure
  try {
    await db.exec(sql)
  } catch (error) {
    failure = error
  }
  assert.ok(failure, message)
  assert.equal(failure.code, expectedCode, `${message}: ${failure?.message}`)
}

async function assertCounter(actorId, actionKey, expected) {
  await asPostgres()
  const result = await db.query(
    `select window_seconds, hit_count, max_hits
     from reflab_private.abuse_rate_limits
     where actor_id = $1 and action_key = $2`,
    [actorId, actionKey]
  )
  assert.equal(result.rows.length, 1, `missing counter ${actionKey}`)
  assert.deepEqual(
    {
      windowSeconds: Number(result.rows[0].window_seconds),
      hitCount: Number(result.rows[0].hit_count),
      maxHits: Number(result.rows[0].max_hits),
    },
    expected,
    `unexpected counter ${actionKey}`
  )
}

async function saturateBurst(actorId, actionKey) {
  await asPostgres()
  await db.query(
    `update reflab_private.abuse_rate_limits
     set hit_count = max_hits
     where actor_id = $1 and action_key = $2`,
    [actorId, actionKey]
  )
}

// Question access is read-only for authenticated and absent for anon. The
// linked-only questions_full table is unavailable to both browser roles.
await asPostgres()
assert.equal(
  await scalar("select relrowsecurity from pg_class where oid = 'public.question_bank'::regclass"),
  true
)
assert.equal(
  await scalar("select relrowsecurity from pg_class where oid = 'public.questions_full'::regclass"),
  true
)

for (const [role, userId] of [
  ['authenticated', actors[0]],
  ['anon', ''],
]) {
  await db.exec(`
    reset role;
    set role ${role};
    set request.jwt.claim.sub = '${userId}';
    set request.jwt.claim.role = '${role}';
  `)

  if (role === 'authenticated') {
    assert.equal(Number(await scalar('select count(*) from public.question_bank')), 1)
  } else {
    await expectSqlState('select * from public.question_bank', '42501', 'anon question read denied')
  }

  await expectSqlState(
    'select * from public.questions_full',
    '42501',
    `${role} questions_full read denied`
  )

  for (const table of ['question_bank', 'questions_full']) {
    await expectSqlState(
      `insert into public.${table} (id, prompt) values ('${actor(9101)}', 'blocked')`,
      '42501',
      `${role} ${table} insert denied`
    )
    await expectSqlState(
      `update public.${table} set prompt = 'blocked'`,
      '42501',
      `${role} ${table} update denied`
    )
    await expectSqlState(
      `delete from public.${table}`,
      '42501',
      `${role} ${table} delete denied`
    )
  }
}

await asPostgres()
const optionalRpcHardeningBlock = migration.match(
  /do \$revoke_unused_public_rpcs\$[\s\S]*?\$revoke_unused_public_rpcs\$;/
)?.[0]
assert.ok(optionalRpcHardeningBlock, 'optional legacy-RPC hardening block must remain auditable')
await db.exec(optionalRpcHardeningBlock)
await db.exec(optionalRpcHardeningBlock)

for (const signature of optionalRpcSignatures) {
  for (const role of ['anon', 'authenticated']) {
    assert.equal(
      await scalar('select has_function_privilege($1, $2, $3)', [
        role,
        `public.${signature}`,
        'EXECUTE',
      ]),
      false,
      `${role} must not execute ${signature}`
    )
  }
  assert.equal(
    await scalar('select has_function_privilege($1, $2, $3)', [
      'service_role',
      `public.${signature}`,
      'EXECUTE',
    ]),
    true,
    `service_role must retain ${signature}`
  )
}

// Posts: burst ownership, short-window reset, and independent daily limit.
await asActor(actors[0])
for (let index = 0; index < 10; index += 1) {
  await db.exec(`insert into public.posts (user_id) values ('${actors[0]}')`)
}
await expectSqlState(
  `insert into public.posts (user_id) values ('${actors[0]}')`,
  'PT429',
  'eleventh post must be rejected'
)
await expectSqlState(
  `insert into public.posts (user_id) values ('${actors[1]}')`,
  '42501',
  'actor mismatch must be rejected'
)
await asPostgres()
await db.query(
  `update reflab_private.abuse_rate_limits
   set window_started_at = clock_timestamp() - make_interval(secs => window_seconds + 1)
   where actor_id = $1 and action_key like 'social:post:%'`,
  [actors[0]]
)
await asActor(actors[0])
await db.exec(`insert into public.posts (user_id) values ('${actors[0]}')`)
await asPostgres()
await db.query(
  `update reflab_private.abuse_rate_limits
   set
     hit_count = case when action_key = 'social:post:daily' then max_hits else hit_count end,
     window_started_at = case
       when action_key = 'social:post:burst'
         then clock_timestamp() - make_interval(secs => window_seconds + 1)
       else window_started_at
     end
   where actor_id = $1 and action_key like 'social:post:%'`,
  [actors[0]]
)
await asActor(actors[0])
await expectSqlState(
  `insert into public.posts (user_id) values ('${actors[0]}')`,
  'PT429',
  'daily post limit must survive a burst reset'
)

// Comments have an independent allowance.
await asActor(actors[1])
for (let index = 0; index < 30; index += 1) {
  await db.exec(`insert into public.post_comments (user_id) values ('${actors[1]}')`)
}
await expectSqlState(
  `insert into public.post_comments (user_id) values ('${actors[1]}')`,
  'PT429',
  'thirty-first comment must be rejected'
)

// Report target types share one allowance.
await asActor(actors[2])
for (let index = 0; index < 4; index += 1) {
  await db.exec(`insert into public.post_reports (reporter_id) values ('${actors[2]}')`)
}
for (let index = 0; index < 3; index += 1) {
  await db.exec(`insert into public.comment_reports (reporter_id) values ('${actors[2]}')`)
  await db.exec(`insert into public.user_reports (reporter_id) values ('${actors[2]}')`)
}
await expectSqlState(
  `insert into public.user_reports (reporter_id) values ('${actors[2]}')`,
  'PT429',
  'eleventh mixed report must be rejected'
)

// Direct messages: exact configuration and rejection at saturation.
await asActor(actors[3])
await db.exec(`insert into public.messages (sender_id) values ('${actors[3]}')`)
await db.exec(`insert into public.messages (sender_id) values ('${actors[3]}')`)
await assertCounter(actors[3], 'social:message:burst', {
  windowSeconds: 300,
  hitCount: 2,
  maxHits: 60,
})
await assertCounter(actors[3], 'social:message:daily', {
  windowSeconds: 86400,
  hitCount: 2,
  maxHits: 1000,
})
await saturateBurst(actors[3], 'social:message:burst')
await asActor(actors[3])
await expectSqlState(
  `insert into public.messages (sender_id) values ('${actors[3]}')`,
  'PT429',
  'message burst limit must reject the next row'
)

// Post/comment reactions share a counter. Delete/reinsert does not refund an
// allowance, and blocked re-like attempts cannot emit another notification.
await asActor(actors[4])
await db.exec(
  `insert into public.post_likes (user_id, post_id) values ('${actors[4]}', '${target(1)}')`
)
await db.exec(
  `delete from public.post_likes where user_id = '${actors[4]}' and post_id = '${target(1)}'`
)
await db.exec(
  `insert into public.comment_likes (user_id, comment_id) values ('${actors[4]}', '${target(2)}')`
)
await db.exec(
  `delete from public.comment_likes where user_id = '${actors[4]}' and comment_id = '${target(2)}'`
)
await db.exec(
  `insert into public.post_likes (user_id, post_id) values ('${actors[4]}', '${target(1)}')`
)
await db.exec(
  `delete from public.post_likes where user_id = '${actors[4]}' and post_id = '${target(1)}'`
)
await assertCounter(actors[4], 'social:reaction:burst', {
  windowSeconds: 600,
  hitCount: 3,
  maxHits: 120,
})
await assertCounter(actors[4], 'social:reaction:daily', {
  windowSeconds: 86400,
  hitCount: 3,
  maxHits: 500,
})
await saturateBurst(actors[4], 'social:reaction:burst')
await asActor(actors[4])
await expectSqlState(
  `insert into public.post_likes (user_id, post_id) values ('${actors[4]}', '${target(1)}')`,
  'PT429',
  're-like cycle must be limited'
)
await asPostgres()
assert.equal(
  Number(
    await scalar(
      `select count(*) from public.notification_probe
       where actor_id = $1 and source_table = 'post_likes'`,
      [actors[4]]
    )
  ),
  2,
  'only successful post-like inserts may reach notification triggers'
)

// Follow cycles are similarly persistent because each re-follow generates a
// production notification.
await asActor(actors[5])
for (let index = 0; index < 2; index += 1) {
  await db.exec(
    `insert into public.user_follows (follower_id, following_id)
     values ('${actors[5]}', '${actors[6]}')`
  )
  await db.exec(
    `delete from public.user_follows
     where follower_id = '${actors[5]}' and following_id = '${actors[6]}'`
  )
}
await assertCounter(actors[5], 'social:follow:burst', {
  windowSeconds: 3600,
  hitCount: 2,
  maxHits: 30,
})
await assertCounter(actors[5], 'social:follow:daily', {
  windowSeconds: 86400,
  hitCount: 2,
  maxHits: 100,
})
await saturateBurst(actors[5], 'social:follow:burst')
await asActor(actors[5])
await expectSqlState(
  `insert into public.user_follows (follower_id, following_id)
   values ('${actors[5]}', '${actors[6]}')`,
  'PT429',
  're-follow cycle must be limited'
)
await asPostgres()
assert.equal(
  Number(
    await scalar(
      `select count(*) from public.notification_probe
       where actor_id = $1 and source_table = 'user_follows'`,
      [actors[5]]
    )
  ),
  2,
  'blocked re-follow must not reach the notification trigger'
)

// Save and block insert/delete cycles retain their allowances.
await asActor(actors[6])
for (let index = 0; index < 2; index += 1) {
  await db.exec(
    `insert into public.post_saves (user_id, post_id) values ('${actors[6]}', '${target(3)}')`
  )
  await db.exec(
    `delete from public.post_saves where user_id = '${actors[6]}' and post_id = '${target(3)}'`
  )
}
await assertCounter(actors[6], 'social:save:burst', {
  windowSeconds: 3600,
  hitCount: 2,
  maxHits: 60,
})
await assertCounter(actors[6], 'social:save:daily', {
  windowSeconds: 86400,
  hitCount: 2,
  maxHits: 300,
})
await saturateBurst(actors[6], 'social:save:burst')
await asActor(actors[6])
await expectSqlState(
  `insert into public.post_saves (user_id, post_id) values ('${actors[6]}', '${target(3)}')`,
  'PT429',
  'save cycle must be limited'
)

await asActor(actors[7])
for (let index = 0; index < 2; index += 1) {
  await db.exec(
    `insert into public.user_blocks (blocker_id, blocked_id)
     values ('${actors[7]}', '${actors[8]}')`
  )
  await db.exec(
    `delete from public.user_blocks
     where blocker_id = '${actors[7]}' and blocked_id = '${actors[8]}'`
  )
}
await assertCounter(actors[7], 'social:block:burst', {
  windowSeconds: 3600,
  hitCount: 2,
  maxHits: 20,
})
await assertCounter(actors[7], 'social:block:daily', {
  windowSeconds: 86400,
  hitCount: 2,
  maxHits: 100,
})
await saturateBurst(actors[7], 'social:block:burst')
await asActor(actors[7])
await expectSqlState(
  `insert into public.user_blocks (blocker_id, blocked_id)
   values ('${actors[7]}', '${actors[8]}')`,
  'PT429',
  'block cycle must be limited'
)

// API roles cannot call private helpers or read counters. service_role can
// audit them, and deleting a profile cascades its UUID-only rows.
await asActor(actors[9])
await expectSqlState(
  `select reflab_private.consume_abuse_rate_limit(
     '${actors[9]}', 'social:post:burst', 600, 10
   )`,
  '42501',
  'authenticated cannot execute the private counter helper'
)
await expectSqlState(
  'select * from reflab_private.abuse_rate_limits',
  '42501',
  'authenticated cannot read private counters'
)

await asActor(actors[9])
await db.exec(`insert into public.posts (user_id) values ('${actors[9]}')`)
await asPostgres()
await db.exec('set role service_role')
assert.ok(Number(await scalar('select count(*) from reflab_private.abuse_rate_limits')) > 0)
await asPostgres()
assert.equal(
  Number(
    await scalar(
      'select count(*) from reflab_private.abuse_rate_limits where actor_id = $1',
      [actors[9]]
    )
  ),
  2
)
await db.query('delete from public.profiles where id = $1', [actors[9]])
assert.equal(
  Number(
    await scalar(
      'select count(*) from reflab_private.abuse_rate_limits where actor_id = $1',
      [actors[9]]
    )
  ),
  0
)

// Existing application and drift data survives unchanged.
assert.equal(Number(await scalar('select count(*) from public.posts where id = $1', [legacyPostId])), 1)
assert.equal(
  Number(await scalar('select count(*) from public.question_bank where id = $1', [legacyQuestionId])),
  1
)
assert.equal(
  Number(
    await scalar('select count(*) from public.questions_full where id = $1', [legacyFullQuestionId])
  ),
  1
)

// A clean canonical rebuild without linked-only drift must still apply.
const cleanRebuildDb = new PGlite()
await cleanRebuildDb.exec(fixtureSql)
await cleanRebuildDb.exec(securityHardeningDependencySql)
await cleanRebuildDb.exec(`
  drop table public.questions_full;
  ${optionalRpcSignatures.map((signature) => `drop function public.${signature};`).join('\n')}
`)
await cleanRebuildDb.exec(migration)
assert.equal(
  await cleanRebuildDb
    .query("select to_regclass('public.questions_full') is null as is_absent")
    .then((result) => result.rows[0].is_absent),
  true
)
await cleanRebuildDb.close()

console.log('PostgreSQL 17/PGlite abuse-control tests passed.')
await db.close()
