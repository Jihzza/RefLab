# RefLab launch abuse controls

This runbook describes the additive controls installed by
`20260723000000_launch_abuse_controls.sql`. The migration must run after
`20260722_0050_launch_security_hardening.sql` and must first be exercised on an
isolated Supabase project. It does not update, delete, or rewrite existing app
rows.

This order is fail-closed: never run the abuse-controls migration unless the
same isolated target has a successful, reviewed execution record and verified
postconditions for the exact approved `0050` hash. The filenames and Supabase
versions must sort as `20260722_0050` then `20260723000000`; an absent record,
an inverse order, or a hash mismatch is a stop condition. Do not use `db push`
or migration-history repair to infer or manufacture that evidence.

The migration preflight also requires
`reflab_private.current_user_has_deletion_job()`, a `0050` catalog contract, and
the executable PGlite test proves inverse-order execution is rejected without
leaving the abuse-control table behind.

It also closes two question-data exposures: `question_bank` becomes
authenticated read-only, and the drift-only `questions_full` table is removed
from both browser roles when it exists. Existing questions are preserved.

## Enforced limits

All windows are fixed-duration windows anchored at the first successful insert.
A rejected or rolled-back transaction does not consume an allowance. Deleting
a like, follow, save, or block does not refund its earlier insert, so repeated
delete/reinsert cycles cannot bypass the limit. Failures use SQLSTATE `PT429`,
which PostgREST maps to HTTP 429.

| Successful insert | Short window | 24-hour window | Shared scope |
| --- | ---: | ---: | --- |
| Post or repost | 10 / 10 minutes | 60 | Per user |
| Comment or reply | 30 / 10 minutes | 200 | Per user |
| Post, comment, or user report | 10 / hour | 30 | One allowance across all report types |
| Direct message | 60 / 5 minutes | 1,000 | Per sender |
| Post or comment like | 120 / 10 minutes | 500 | One allowance across both reaction types |
| Follow | 30 / hour | 100 | Per follower |
| Save | 60 / hour | 300 | Per user |
| Block | 20 / hour | 100 | Per blocker |

The short windows reduce automated bursts while the daily windows limit slower
abuse. The message allowance permits normal live conversation at up to twelve
messages per minute throughout a five-minute burst. These are first-launch
values; tune them from observed 429 rates and support evidence, never by editing
an already-applied migration.

Post likes and follows already have notification-producing `AFTER INSERT`
triggers. The abuse-control triggers run `BEFORE INSERT`, so a rejected re-like
or re-follow cannot produce another notification. The executable tests cover
successful insert/delete/reinsert cycles and confirm only accepted inserts
reach a notification probe.

## Question-data access

`public.question_bank` is required by the canonical app. RLS is enabled, every
`PUBLIC`, `anon`, and `authenticated` privilege is removed, and only `SELECT` is
granted back to `authenticated` through an explicit policy. Browser roles
cannot insert, update, or delete questions.

`public.questions_full` exists in the linked launch database but is absent from
canonical migrations and has no frontend or Edge Function consumer. When it is
present, RLS is enabled and all browser privileges are revoked without adding a
client policy. Its rows remain available to `service_role` and the table owner.
Its schema and purpose should later be reconciled in a dedicated migration.

## Unused legacy RPC access

When any exact signature below exists, execution is revoked from `PUBLIC`,
`anon`, and `authenticated`, while an explicit `service_role` grant preserves
trusted jobs:

- `abandon_stale_attempts()`
- `finalize_test_attempt(uuid)`
- `get_review_data(uuid)`
- `lock_answer(uuid,uuid,uuid)`
- `start_or_resume_attempt(uuid)`
- `submit_video_decision_attempt(uuid,text,text)`
- `get_feed_posts(text,timestamptz,integer)`
- `get_post_by_id(uuid)`
- `notify_new_content(uuid,text)`
- `notify_plan_activated(uuid)`
- `notify_plan_expiring()`
- `notify_streak_continued(uuid)`
- `notify_streak_loss()`
- `notify_streak_reminder()`

Exact-signature checks are rerunnable and optional, so a clean canonical rebuild
does not recreate drifted functions. PostgreSQL triggers continue invoking their
trigger functions after direct `EXECUTE` is revoked.

## Counter security and data handling

Active counters live in `reflab_private.abuse_rate_limits`. Each row contains a
user UUID, action key, window duration, timestamps, and integer counts. It stores
no post text, message text, report reason, IP address, or device identifier.
Counter rows are removed automatically when the corresponding profile is
deleted.

`anon` and `authenticated` cannot read the table or execute its helpers.
`service_role` may inspect and delete counters for trusted operations. Both
`SECURITY DEFINER` helpers live under `reflab_private`, use an empty search path,
validate `auth.uid()`, and have `PUBLIC` execution revoked. Existing RLS remains
the final authorization authority for every application row.

Trusted server-side inserts without an authenticated end-user JWT are not
rate-limited. Any server workflow that writes on behalf of a user should retain
that user's JWT context if it must consume the user allowance.

## Audit queries

Run these only through the Supabase SQL editor or another trusted service-role
context. Never expose `reflab_private` through the API schema list.

```sql
select
  actor_id,
  action_key,
  hit_count,
  max_hits,
  window_started_at,
  window_started_at + make_interval(secs => window_seconds) as resets_at
from reflab_private.abuse_rate_limits
where hit_count >= max_hits
order by updated_at desc;

select action_key, count(*) as active_users, sum(hit_count) as accepted_actions
from reflab_private.abuse_rate_limits
group by action_key
order by action_key;
```

Deleting a counter grants a fresh window and therefore requires a documented
support or incident-response reason.

```sql
delete from reflab_private.abuse_rate_limits
where actor_id = '<user-uuid>'::uuid
  and action_key = 'social:message:burst';
```

## Executable verification

The backend CI runs both layers after a clean dependency install:

1. `.github/scripts/test_abuse_controls.mjs` executes the real migration on
   PostgreSQL 17/PGlite. It checks exact limits, shared allowances, ownership,
   insert/delete notification cycles, question access, optional RPC revokes,
   data preservation, and a clean rebuild without linked-only drift.
2. `.github/scripts/test_abuse_controls_concurrency.mjs` runs against a real
   PostgreSQL 17 service. Eighty message inserts race on the same actor and
   counter; exactly 60 must commit, 20 must receive `PT429`, and both the table
   row count and atomic counter must finish at 60.

## Isolated rollout

1. Confirm the target is not production and take a database backup. Fail closed
   unless the reviewed execution record and postcondition evidence prove that
   the exact approved `20260722_0050` hash completed on this same target before
   `20260723000000`. Never execute these files in the inverse order.
2. Run the two CI tests and dependency audit.
3. Apply the migration to an isolated project through the canonical Supabase
   migration workflow.
4. With synthetic authenticated accounts, exercise every controlled insert and
   its corresponding delete where available. Confirm normal reads, RLS, realtime
   messages, counters, and notifications still behave as expected.
5. Verify the first request above each short limit receives HTTP 429 and leaves
   no application row or notification behind. Remove QA rows and counters.
6. Confirm `authenticated` can read but not mutate `question_bank`, and neither
   browser role can access `questions_full`.
7. Observe database latency, lock waits, 429 rates, notification volume, and
   support signals before approving production rollout.

If limits need tuning or a defect is found, do not perform an ad-hoc rollback or
hand-run `DROP` statements. Preserve `0050` and the existing application data,
then create a new timestamped forward-fix migration that is reviewed, tested,
rehearsed on an isolated target, and explicitly approved before execution.
