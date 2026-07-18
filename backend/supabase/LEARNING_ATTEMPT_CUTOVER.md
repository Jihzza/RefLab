# Learning integrity staged cutover

This release has three browser-write cutovers sharing one deployment window:

| Surface | Additive phase | Restrictive phase |
|---|---|---|
| Test attempts and answers | `20260718081235` | `20260718081236` |
| Question sessions, practice answers and video attempts | `20260718102753` | `20260718102755` |
| Posts, comments and UGC reports | `20260718103637` | `20260718105035` |

The additive phases install auth-bound RPCs and keep old-bundle DML working.
For question/video activity, compatibility triggers already derive correctness,
timing and totals on the server during that window. The UGC phase adds bounded,
auth-bound creation/edit/report RPCs while retaining legacy writes. The
restrictive phases remove direct browser mutation grants and policies only
after the replacement frontend has passed smoke testing.

> **Never use `supabase db push`, `supabase migration up`, `db reset`, or an
> automated migration runner for this production cutover.** Applying every
> pending file would collapse both frontend gates. Each SQL file must be
> applied transactionally and its exact version repaired individually.

## Why the production order is intentionally non-chronological

The final frontend calls RPCs from both additive phases. It cannot be deployed
after `81235` but before `102753`. At the same time, `81236` must remain pending
until that exact frontend is live. The controlled maintenance sequence is
therefore:

1. `20260718081235` — additive test-attempt RPCs.
2. Predeploy the exact `create-checkout-session`, `delete-account` and
   `account-deletion-worker` candidates and complete the runbook's pre-`90518`
   no-side-effect/fail-closed proof.
3. `20260718090518` — durable account-deletion contract, under its own runbook
   gate and with checkout/deletion unavailable.
4. `20260718102753` — additive question/video RPCs and compatibility guards.
5. `20260718103637` — additive UGC/moderation RPC contract.
6. Deploy and smoke the exact frontend artifact.
7. `20260718081236` — revoke legacy test-attempt DML.
8. `20260718102755` — revoke legacy question/video DML.
9. `20260718105035` — revoke legacy post/comment/report DML.
10. Repeat learning/UGC smokes and verify direct DML denial.

The temporary remote-history gap at `81236` is expected and must be recorded in
the change log. Stop on any other migration drift. Once all three restrictive
files are applied, local and remote history must match again.

## Preconditions

1. Follow `LAUNCH_RUNBOOK.md`: clean candidate commit, disposable-staging
   rehearsal, tested maintenance response, verified recovery point and named
   rollback owner.
2. Confirm the percent-encoded target URL without printing it. Run
   `migration list` against that same URL before every file.
3. Confirm no unrelated migration is pending. The only intentional gaps during
   the window are `81236`, `102755` and `105035`.
4. Build the exact frontend artifact. Its learning writes must use only:
   `start_or_resume_test_attempt`, `start_or_resume_random_test_attempt`,
   `save_test_attempt_answer`, `submit_test_attempt`,
   `start_question_session`, `save_question_practice_answer`,
   `complete_question_session`, `save_video_attempt`, `create_social_post`,
   `create_social_comment`,
   `report_social_post`, `report_social_comment` and `report_social_user`.
   The four start/create calls that can otherwise be rebound by an account
   switch must send the captured `p_expected_user_id`: concrete test start,
   random test start, question-session start and video-attempt save. The admin
   review and conversation-read flows similarly send `p_expected_reviewer_id`
   and `p_expected_reader_id`.
5. Rehearse the full order on a disposable database. Run each phase-1 pgTAP
   before its matching restrictive phase and both final pgTAP files afterwards.

## Apply an individual file

Use the `Invoke-RefLabMigration` helper in `LAUNCH_RUNBOOK.md`. Its equivalent
commands are shown here for clarity; substitute only the reviewed version/file:

```powershell
& psql $env:SUPABASE_DB_URL -X --set=ON_ERROR_STOP=1 --single-transaction --file=$File
if ($LASTEXITCODE -ne 0) { throw "SQL failed for $Version" }

& npx --yes supabase@2.109.1 migration repair $Version --status applied --db-url $env:SUPABASE_DB_URL --workdir backend
if ($LASTEXITCODE -ne 0) { throw "History repair failed for $Version; inspect before retry" }

& npx --yes supabase@2.109.1 migration list --db-url $env:SUPABASE_DB_URL --workdir backend
if ($LASTEXITCODE -ne 0) { throw "History verification failed for $Version" }
```

If SQL succeeds but history repair fails, do not rerun the SQL blindly. Inspect
the schema and repair only the history against the same database.

## Additive-phase staging gates

After `81235` and before `81236`:

```powershell
& pg_prove --dbname "$env:STAGING_DB_URL" backend/supabase/tests/learning_attempt_phase1_compatibility.sql
if ($LASTEXITCODE -ne 0) { throw 'Test-attempt phase-1 compatibility failed.' }
```

After `102753` and before `102755`:

```powershell
& pg_prove --dbname "$env:STAGING_DB_URL" backend/supabase/tests/learning_activity_phase1_compatibility.sql
if ($LASTEXITCODE -ne 0) { throw 'Learning-activity phase-1 compatibility failed.' }
```

These fixture-bearing tests run only on disposable staging, never production.
After `103637` and before `105035`, smoke both legacy and RPC post/comment/
report paths; the old path exists only for deployment compatibility.

## Frontend smoke before either revocation

Use two independent authenticated browser sessions and disposable accounts.

1. Open the same normal test concurrently; both resume one attempt with the
   same immutable question order.
2. Revise a normal-test answer, reload and verify the saved choice.
3. Start a random test, save once, reload in both sessions and verify question
   order, server start time, remaining time and locked choice.
4. Submit fully answered normal/random tests. Expire a disposable random test;
   late save must fail and submission must be server-marked automatic.
5. Start Quick, By Law and By Area question sessions. Save correct and
   incorrect choices, reload the dashboard and verify only server-derived
   counts/accuracy. End a session and verify server timing/totals.
6. Lose/retry one practice response deliberately; the same answer must appear
   once. Attempting to save after session completion must fail.
7. Complete video scenarios with correct, partially correct and incorrect
   decisions. Dashboard metrics must match the canonical scenario values.
8. Lose/retry one video response deliberately; it must appear once. An inactive
   scenario/question must not be usable for a new activity.
9. Create bounded text/media posts and comments through the RPCs.
   Submit post/comment/user reports with required detail, verify duplicates are
   rejected and confirm only a trusted authenticated admin can access/action
   the private moderation queue.
10. In account A, pause each of the four owner-bound learning calls before its
    request is sent, switch the client session to account B, then release it.
    Every RPC must fail with SQLSTATE `42501` and create/resume no row for B.
    Repeat the same identity-mismatch proof for moderation review and message
    read cursor updates.

Stop on any mismatch. Both old mutation surfaces remain available at this
point, so a rollback to the previous frontend bundle is still possible.

## Restrictive phases and final staging gates

Apply `81236`, `102755` and `105035` individually only after the smoke above
passes. Do not lift maintenance between them. Then run:

```powershell
& pg_prove --dbname "$env:STAGING_DB_URL" `
  backend/supabase/tests/learning_attempt_integrity.sql `
  backend/supabase/tests/learning_activity_integrity.sql
if ($LASTEXITCODE -ne 0) { throw 'Final learning integrity pgTAP failed.' }
```

Repeat all ten smokes against the target. Through the normal API and a test
user, additionally prove direct `INSERT`/`UPDATE` is denied on
`test_attempts`, `test_attempt_answers`, `question_sessions`,
`question_practice_answers`, `video_attempts`, `posts`, `post_comments`,
`post_reports`, `comment_reports` and `user_reports`, while every replacement
RPC workflow still succeeds.

The restrictive migrations must also leave no legacy overload for
`start_or_resume_test_attempt(uuid)`,
`start_or_resume_random_test_attempt()`,
`start_question_session(uuid,text,smallint[],text[])`,
`save_video_attempt(uuid,uuid,text,text)` or the reviewer-implicit moderation
review. Treat any surviving overload as a failed cutover.

After either restrictive phase, rolling back only the frontend is unsafe. Keep
the RPC frontend deployed or use a separately reviewed forward migration.

Supabase references:

- <https://supabase.com/docs/reference/cli/supabase-db-push>
- <https://supabase.com/docs/guides/deployment/database-migrations>
