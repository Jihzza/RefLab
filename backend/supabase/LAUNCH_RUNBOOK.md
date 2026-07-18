# RefLab launch runbook

This is the authoritative release procedure for the RefLab launch candidate. It
is intentionally conservative: database contract changes, the exact frontend
artifact, Supabase Edge Functions, Stripe and Netlify must move as one reviewed
release. A checked box requires durable evidence (command output, deploy URL,
test record or dashboard screenshot), not an assumption.

Expected production Supabase project ref: `iqebkyjcoqggwhausgje`.

> The project ref above identifies the intended target; it does **not** prove
> that the current CLI account can access it. At the time this runbook was
> written, live Supabase access had not been established. An authorised
> operator must confirm access and obtain a fresh database connection string
> from that exact project's dashboard before any live action.

## Absolute rules

- Never print, paste into chat, commit or capture in screenshots any database
  URL, password, Supabase secret/service-role key, Stripe key or webhook secret.
- `SUPABASE_DB_URL` and `STAGING_DB_URL` must be percent-encoded Postgres URLs.
  Set them from the approved secret manager in the current shell; never echo
  them. Every migration-history command uses `--db-url`, so stale CLI link state
  cannot select a different database.
- **Never run `supabase db push`, `supabase migration up`, `supabase db reset`
  or an automatic “apply all pending migrations” job for this release.**
  Three additive/restrictive pairs share one mandatory frontend gate:
  `81235`/`81236` (test attempts), `102753`/`102755` (question/video activity)
  and `103637`/`105035` (UGC). The exact bundle is published only after all
  three additive files exist and before any restrictive file is applied.
- Apply one SQL file at a time with `psql --single-transaction`. Record that
  exact version with `migration repair` only after the SQL transaction succeeds.
- Never rerun SQL merely because `migration repair` failed. Inspect the schema
  and history first, then repair only the history if the SQL is already present.
- Never run fixture-bearing pgTAP files against production. They are for a
  disposable staging project or approved disposable clone only.
- Migrations `20260718070103` and `20260718070105` break the old frontend
  contract, while the new frontend depends on their restricted grants/RPCs.
  Production therefore needs a controlled, fail-closed maintenance window and
  a forced reload/reopen at exit. This is **not a zero-downtime release**.
- Do not merge the launch PR until the exact commit has passed required GitHub
  checks, a Netlify Deploy Preview, the complete disposable-staging rehearsal
  and every NO-GO gate below.

The commands below were checked against Supabase CLI `2.109.1`. Re-run each
relevant `--help` command if a different CLI version is deliberately selected.
The release-operator host must also provide `psql`, `pg_dump`, `pg_restore` and
`pg_prove`; verify those commands before the change window. They are not
currently installed on the workstation where this document was authored, so no
live or staging database command in this runbook has been executed from it.

## 1. Release identity and NO-GO record

From the repository root, capture the immutable candidate identity:

```powershell
$ReleaseCommit = (git rev-parse HEAD).Trim()
if (git status --porcelain) { throw 'The release candidate worktree is not clean.' }
git diff --check "origin/main...$ReleaseCommit"
```

Record the PR URL, `$ReleaseCommit`, Netlify Deploy Preview URL, staging project
ref, operator, planned start/end time, rollback owner and evidence links in the
release ticket. The merge button remains disabled until all items below are
resolved.

### Hard NO-GO gates

- **Supabase authority:** an authorised account can see
  `iqebkyjcoqggwhausgje`, can deploy functions, and has a fresh DB URL for that
  exact project. Confirm without displaying secret values:

  ```powershell
  npx --yes supabase@2.109.1 projects list
  if ([string]::IsNullOrWhiteSpace($env:SUPABASE_DB_URL)) { throw 'SUPABASE_DB_URL is not set.' }
  ```

  Stop if the project is absent or the URL was not obtained from that project's
  dashboard during this change window. Do not guess, relink another project or
  use credentials from an unrelated workspace.

- **Leaked Supabase secret:** rotate/revoke the publicly reported Supabase
  secret in the owning project, update only authorised environments, redeploy,
  prove the retired credential no longer works, and close the GitHub secret
  alert with evidence. Git history cleanup is not a substitute for revocation.
- **Commercial scope:** either launch Free-only with paid checkout and all paid
  promises disabled, or have an approved, implemented and server-enforced matrix
  for Pro/Plus entitlements, quotas, prices, currency, billing interval, trial,
  tax, cancellation, refunds and support SLA. Marketing labels alone are not
  entitlements. No live Stripe sale is allowed while this choice is unresolved.
- **Legal/operator facts:** publish reviewed Terms and Privacy information with
  the real operator/entity name, address/country, registration/VAT facts where
  applicable, controller/legal contact, age/minors position, processors,
  retention, transfers, jurisdiction and refund/cancellation terms. Signup must
  capture versioned acceptance evidence. The identifiers
  `terms-2026-07-18-v1` and `privacy-2026-07-18-v1` identify shipped content;
  they do not mean that content is legally approved. Any substantive content
  change requires a new identifier and explicit re-consent. Do not invent
  missing facts.
  Supabase issues an OAuth session before the browser callback; this release
  then fail-closes every `/app` route until server-recorded acceptance. This is
  an application access gate, not suppression of the already-issued token and
  not a replacement for RLS. If policy requires pre-consent denial of every
  direct Data API/RPC call outside the app, treat launch as NO-GO until a
  separately reviewed whole-schema authorization design is implemented.
- **Auth password policy:** in the exact production Supabase project, configure
  the Email provider to enforce a minimum of at least 12 characters, matching
  the frontend, and enable leaked/compromised-password protection when the
  project plan supports it. Capture dashboard evidence and exercise rejection
  through Supabase Auth itself; frontend validation is not enforcement. If
  leaked-password protection is unavailable, record an explicit launch-risk
  decision instead of claiming that it is enabled.
- **Support operations:** name the responsible inbox owner and SLA; configure a
  verified Netlify submission notification; document identity verification for
  privacy/account requests. A form with no monitored destination is not launch
  ready. Assign a separate owner and response target for GitHub private
  vulnerability reports, and prove that the private-report channel enabled in
  `SECURITY.md` is accessible to that owner.
- **Deletion durability:** the autonomous account-deletion worker and its
  committed provisioning intent must exist, be deployed/scheduled, monitored
  and pass the crash/lease-takeover smoke in Gate G. Until then, deletion and
  new checkout remain closed.
- **Product/content:** approve the production domain and `SITE_URL`, complete an
  authorised football-laws/content review, and resolve the launch accessibility
  decision for videos that lack captions/transcripts.
- **UGC, moderation and Storage operations:** name the moderation owner,
  escalation SLA and the operator responsible for the `profile-media`,
  `post-media` and `message-media` lifecycle. Before launch, complete the
  dry-run inventory and orphan/legacy-URL audit in Gate D, approve a grace
  period and alert thresholds, and attach evidence. New-write quotas prevent
  further unbounded uploads; they do not clean historical objects. Launch is
  NO-GO without an owned, rehearsed sweep procedure. Never delete rows from
  `storage.objects` with SQL; use the Storage API so object data and metadata
  stay consistent.

## 2. Exact candidate validation before any live change

The PR must pass, on the exact `$ReleaseCommit`:

- `Frontend CI / Test, lint, build and audit`
- `Backend Static CI / Check Supabase Edge Functions`
- `CodeQL / Analyze (javascript-typescript)`
- `Dependency Review / Review dependency changes`
- Netlify Deploy Preview build and route smoke

Reproduce the principal gates locally:

```powershell
Push-Location apps/frontend
npm ci
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
npm run audit:runtime
npm run audit:ci
Pop-Location

npx --yes deno@2.9.3 check --node-modules-dir=none backend/supabase/functions/*/index.ts
npx --yes deno@2.9.3 lint --rules-exclude=no-import-prefix backend/supabase/functions
npx --yes deno@2.9.3 test --node-modules-dir=none backend/supabase/functions
python -m pip install --disable-pip-version-check pglast==8.2
python backend/supabase/scripts/check_sql_syntax.py
python .github/scripts/check_release_config.py
git diff --check "origin/main...$ReleaseCommit"
```

On the Deploy Preview, test `/`, `/support`, `/privacy`, `/terms`, `/cookies`,
auth screens, the 404 response, responsive layouts and browser console/network
errors. Directly request `/admin/moderation` and prove Netlify returns the
`private.html` shell with HTTP 200 before `RequireAdmin` applies the signed-in
authorization decision; it must never fall through to the public 404 shell.
Authenticated backend-contract tests belong on staging until the live
maintenance window.

Treat Supabase Auth routing as a separate NO-GO gate. Capture dashboard and
provider-console evidence that the production Site URL is the final canonical
origin; the narrow Redirect URL allowlist includes exactly that origin's
`/auth/callback` and `/reset-password` routes; staging and Deploy Preview
origins are separately scoped and removed after use; Google Auth is enabled and
its Supabase Auth callback is registered in Google Cloud Console; confirmation
and reset emails use reviewed templates and arrive through the production SMTP
provider. Prove email signup confirmation, Google sign-in, password reset and
explicit rejection of an unallowlisted redirect on staging and then on the
exact production origin. Do not launch from a wildcard redirect allowlist.

Until an approved staging project is available, the Netlify `deploy-preview`
and `branch-deploy` contexts are deliberately configured with
`https://preview-backend-disabled.invalid` and a non-secret placeholder key.
This prevents a public preview from authenticating against or mutating the
production Supabase project. Public-route, routing, header and form checks may
run in that state; authenticated contract tests must not. Replace those two
context-specific values only with an approved staging URL/publishable key, and
never inherit the production backend into either preview context.

## 3. Disposable staging rehearsal and backup proof

Use a disposable Supabase project/branch that cannot receive production
traffic. Store its ref separately in `STAGING_PROJECT_REF`. Use synthetic or
properly anonymised data unless copying production data has separate privacy
approval. The staging schema and service configuration must match production.

Before rehearsal and again immediately before production, confirm the managed
Supabase backup/PITR status and recovery point in the dashboard. Also create an
approved encrypted logical backup outside the repository and verify that it is
readable:

```powershell
if ([string]::IsNullOrWhiteSpace($env:REFLAB_BACKUP_PATH)) { throw 'Set an approved encrypted backup path outside the repository.' }
pg_dump "$env:SUPABASE_DB_URL" --format=custom --no-owner --no-privileges --file="$env:REFLAB_BACKUP_PATH"
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
pg_restore --list "$env:REFLAB_BACKUP_PATH" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'The backup cannot be read by pg_restore.' }
```

Prove a restore on a disposable target before production. Record the backup ID,
timestamp, encryption/location, retention, restore result, RPO and recovery
owner; never attach the dump to the PR or release logs.

### Legacy media URL inventory and narrow normalization

Before Gate A in staging and again in production, audit values that predate
path-only Storage writes. Use the exact origin of the database being audited in
`expected_origin` (the production value is shown below). Record only aggregate
counts; URLs and user/message identifiers may be personal data.

```sql
begin read only;

with params as (
  select 'https://iqebkyjcoqggwhausgje.supabase.co'::text as expected_origin
), message_values as (
  select
    m.media_url,
    case
      when starts_with(m.media_url, p.expected_origin ||
        '/storage/v1/object/public/message-media/')
        then split_part(split_part(substring(m.media_url from char_length(
          p.expected_origin || '/storage/v1/object/public/message-media/'
        ) + 1), '?', 1), '#', 1)
      when starts_with(m.media_url, p.expected_origin ||
        '/storage/v1/object/authenticated/message-media/')
        then split_part(split_part(substring(m.media_url from char_length(
          p.expected_origin || '/storage/v1/object/authenticated/message-media/'
        ) + 1), '?', 1), '#', 1)
      when starts_with(m.media_url, p.expected_origin ||
        '/storage/v1/object/sign/message-media/')
        then split_part(split_part(substring(m.media_url from char_length(
          p.expected_origin || '/storage/v1/object/sign/message-media/'
        ) + 1), '?', 1), '#', 1)
      else null
    end as first_party_path
  from public.messages as m
  cross join params as p
  where nullif(btrim(m.media_url), '') is not null
), message_audit as (
  select case
    when first_party_path is not null and exists (
      select 1 from storage.objects as o
       where o.bucket_id = 'message-media' and o.name = first_party_path
    ) then 'first_party_absolute_verified'
    when first_party_path is not null then 'first_party_absolute_unmatched'
    when media_url ~* '^https?://' then 'external_or_unrecognized_absolute'
    when exists (
      select 1 from storage.objects as o
       where o.bucket_id = 'message-media' and o.name = media_url
    ) then 'storage_path_verified'
    else 'relative_unmatched'
  end as classification
  from message_values
)
select classification, count(*) as rows
from message_audit group by classification order by classification;

with params as (
  select 'https://iqebkyjcoqggwhausgje.supabase.co'::text as expected_origin
), profile_values as (
  select
    p.id,
    p.photo_url,
    case when starts_with(p.photo_url, params.expected_origin ||
      '/storage/v1/object/public/profile-media/')
      then split_part(split_part(substring(p.photo_url from char_length(
        params.expected_origin || '/storage/v1/object/public/profile-media/'
      ) + 1), '?', 1), '#', 1)
    end as first_party_path
  from public.profiles as p
  cross join params
  where nullif(btrim(p.photo_url), '') is not null
), profile_audit as (
  select case
    when first_party_path is not null
     and split_part(first_party_path, '/', 1) = id::text
     and exists (
       select 1 from storage.objects as o
        where o.bucket_id = 'profile-media' and o.name = first_party_path
     ) then 'first_party_absolute_verified_owner'
    when first_party_path is not null then 'first_party_absolute_unmatched'
    when photo_url ~* '^https?://' then 'external_or_unrecognized_absolute'
    when split_part(photo_url, '/', 1) = id::text and exists (
      select 1 from storage.objects as o
       where o.bucket_id = 'profile-media' and o.name = photo_url
    ) then 'storage_path_verified_owner'
    else 'relative_unmatched'
  end as classification
  from profile_values
)
select classification, count(*) as rows
from profile_audit group by classification order by classification;

rollback;
```

Investigate every first-party unmatched count. External and unmatched values
are retained unchanged; never strip a host or guess an object name. If the
reviewed decision is to normalize legacy values, update only rows classified as
`first_party_absolute_verified` (and owner-verified profiles) to the extracted
Storage object name, in one explicit transaction. Re-run the audit and prove
the changed count equals the pre-recorded verified count while every external/
unmatched count remains identical. Exercise old and new media in the exact
frontend before committing. A broad URL rewrite, deleting unmatched rows, or
treating a look-alike Supabase hostname as first party is a launch NO-GO.

### Safe individual-migration helper

Use this helper first with `STAGING_DB_URL`. It never batches migrations:

```powershell
function Invoke-RefLabMigration {
  param(
    [Parameter(Mandatory)] [string] $DatabaseUrl,
    [Parameter(Mandatory)] [string] $Version,
    [Parameter(Mandatory)] [string] $File
  )

  if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) { throw 'Database URL is empty.' }
  if (-not (Test-Path -LiteralPath $File)) { throw "Migration file not found: $File" }

  & psql $DatabaseUrl -X --set=ON_ERROR_STOP=1 --single-transaction --file=$File
  if ($LASTEXITCODE -ne 0) { throw "SQL transaction failed for $Version; history was not changed." }

  & npx --yes supabase@2.109.1 migration repair $Version --status applied --db-url $DatabaseUrl --workdir backend
  if ($LASTEXITCODE -ne 0) { throw "SQL succeeded but history repair failed for $Version; inspect before any retry." }

  & npx --yes supabase@2.109.1 migration list --db-url $DatabaseUrl --workdir backend
  if ($LASTEXITCODE -ne 0) { throw "Migration history verification failed after $Version." }
}
```

Before each call, run `migration list` and stop on unexplained local/remote
drift. In staging, execute the production sequence in section 5, deploy the
exact Edge Functions to `$env:STAGING_PROJECT_REF`, deploy the exact frontend
commit against staging, and perform every smoke in section 6.

After all additive files and before the frontend deploy/restrictive files, run
both learning compatibility tests. Also exercise legacy and RPC post/comment/
report writes against `103637`; both paths must work during this window:

```powershell
& pg_prove --dbname "$env:STAGING_DB_URL" `
  backend/supabase/tests/learning_attempt_phase1_compatibility.sql `
  backend/supabase/tests/learning_activity_phase1_compatibility.sql `
  backend/supabase/tests/ugc_phase1_compatibility.sql
if ($LASTEXITCODE -ne 0) { throw 'Additive-phase pgTAP failed.' }
```

After every restrictive phase, run all final database gates on staging, never
production:

```powershell
& pg_prove --dbname "$env:STAGING_DB_URL" `
  backend/supabase/tests/profile_billing_public_data_security.sql `
  backend/supabase/tests/legal_acceptance_security.sql `
  backend/supabase/tests/account_deletion_resilience.sql `
  backend/supabase/tests/learning_attempt_integrity.sql `
  backend/supabase/tests/learning_activity_integrity.sql `
  backend/supabase/tests/ugc_moderation_security.sql
if ($LASTEXITCODE -ne 0) { throw 'Final pgTAP suite failed.' }

& psql "$env:STAGING_DB_URL" -X --set=ON_ERROR_STOP=1 --file=backend/supabase/tests/messaging_notifications_security.sql
if ($LASTEXITCODE -ne 0) { throw 'Messaging/notification security test failed.' }
```

Rehearsal is complete only when the full sequence, including maintenance entry,
frontend cutover, forced reload, Stripe test mode and Netlify form test, passes
without manual schema edits. Destroy or sanitise the staging environment per the
approved data-retention policy afterwards.

## 4. Production change-window entry

1. Freeze `$ReleaseCommit`; cancel unrelated deploys and database changes.
2. Recheck all NO-GO gates, CI, Deploy Preview, staging evidence, backup/PITR,
   incident contacts and rollback owner.
3. Put the public app behind the pre-tested fail-closed maintenance response.
   It must prevent normal users from continuing with an already incompatible
   SPA while preserving an authorised way to smoke the exact release artifact.
4. Verify maintenance externally, record its start time, and monitor Supabase,
   Netlify and Stripe logs. Keep maintenance active until section 8.
5. Re-run `migration list --db-url "$env:SUPABASE_DB_URL" --workdir backend`.
   Stop on any unexpected drift.

Do not start without a tested operator-only smoke path. If the maintenance
mechanism cannot provide one, prepare a restricted branch/deploy URL for the
exact commit and production configuration before the window.

## 5. Exact production migration and deploy order

### Gate A — security/data contracts

Apply these files individually, in this order:

```powershell
Invoke-RefLabMigration -DatabaseUrl $env:SUPABASE_DB_URL -Version 20260718070103 -File backend/supabase/migrations/20260718070103_harden_profiles_billing_and_public_data.sql
Invoke-RefLabMigration -DatabaseUrl $env:SUPABASE_DB_URL -Version 20260718070105 -File backend/supabase/migrations/20260718070105_secure_messaging_notifications_realtime.sql
Invoke-RefLabMigration -DatabaseUrl $env:SUPABASE_DB_URL -Version 20260718081234 -File backend/supabase/migrations/20260718081234_versioned_legal_acceptance.sql
```

Do not lift maintenance or restore the old bundle after `70103/70105`: its
profile and messaging writes no longer match the database contract. Inspect
Postgres/API logs and verify the expected grants, RLS/RPC surface, private
message media and Realtime publication before continuing.
`70105` deliberately removes the five-argument, sender-implicit
`send_message` RPC. The release frontend must call the six-argument contract
with `p_expected_sender_id`; prove a token for account B cannot deliver a
queued operation whose expected sender is account A. Keep maintenance enabled
between this migration and the matching frontend deploy.
Also verify that the two legal-acceptance RPCs reject anonymous calls, validate
the exact configured versions server-side and preserve first acceptance with a
server timestamp. Existing users are intentionally not backfilled: they must
pass the explicit consent gate once for this version pair.
`70103` also installs the additive
`account_deletion_session_is_recent()` RPC. Before any `delete-account` Edge
Function deploy, prove it is fixed-path `SECURITY DEFINER`, executable only by
`authenticated`, and binds `auth.uid()` plus the signed JWT `session_id` to the
same live `auth.sessions` row. Its recent proof must come from that JWT's AMR,
not `auth.users.last_sign_in_at`, another session or `token_refresh`. A missing
or malformed `session_id`/AMR, an absent Auth session, or an RPC error is
fail-closed. Tokens issued without AMR cannot pass this destructive-action gate;
the user must complete a new password or OAuth login to receive a current token.

### Gate B — additive test-attempt phase

```powershell
Invoke-RefLabMigration -DatabaseUrl $env:SUPABASE_DB_URL -Version 20260718081235 -File backend/supabase/migrations/20260718081235_learning_attempt_integrity.sql
```

Do **not** apply `81236` yet. It remains the first intentional remote-history
gap until after the single frontend deploy. Do not run pgTAP on production.

### Gate C — fail-closed function handover, then durable deletion contract

Keep maintenance active and keep `PAID_PLANS_ENABLED` false or unset. Before
changing the deletion schema, replace every legacy function that could cross
that schema boundary with the exact release candidate. Generate the dedicated
32-byte worker secret in the approved password manager, set it as the Supabase
Edge Function secret `ACCOUNT_DELETION_WORKER_SECRET`, and never print or reuse
it. Then deploy from the frozen `$ReleaseCommit`:

Do not run the commands below until Gate A's `70103` migration is present and
the session-bound RPC/grant smoke has passed. The Edge Function treats a missing
or failing RPC as `503` and must never fall back to account-global timestamps.

```powershell
$ProjectRef = 'iqebkyjcoqggwhausgje'
& npx --yes supabase@2.109.1 functions deploy create-checkout-session --project-ref $ProjectRef --workdir backend
if ($LASTEXITCODE -ne 0) { throw 'Deploy failed: create-checkout-session' }
& npx --yes supabase@2.109.1 functions deploy delete-account --project-ref $ProjectRef --workdir backend
if ($LASTEXITCODE -ne 0) { throw 'Deploy failed: delete-account' }
& npx --yes supabase@2.109.1 functions deploy account-deletion-worker --no-verify-jwt --project-ref $ProjectRef --workdir backend
if ($LASTEXITCODE -ne 0) { throw 'Deploy failed: account-deletion-worker' }
```

This ordering is a hard compatibility gate, not optional rollout polish. Against
the pre-`90518` schema, the new checkout returns `503` before authentication or
Stripe whenever the paid flag is disabled. Even if the flag were accidentally
enabled, its first account-state RPC is absent and fails before customer or
Checkout Session creation. The session-bound reauthentication RPC is already
present from `70103`; an authenticated `delete-account` call then fails on the
absent `account_deletion_jobs`/`request_account_deletion` contract before it can
enqueue work, revoke sessions, or reach Stripe, Storage or Auth deletion. An
authorised worker call fails on the absent
`claim_next_account_deletion_job` RPC before it can obtain a user or perform any
side effect.

Using a dedicated disposable authenticated user and the operator-only smoke
path, invoke all three deployed endpoints directly and capture their expected
fail-closed responses and Edge logs. Compare before/after snapshots of that
user's profile/deletion marker, Stripe mappings/subscriptions, owned Storage
objects and Auth existence; also inspect Stripe request logs to prove that no
customer, subscription or Checkout Session was created, changed or deleted.
For the worker, send the dedicated secret without logging it and prove no user
job was claimed. Confirm the deployed function versions came from
`$ReleaseCommit`. If any endpoint reaches a side effect or a legacy response,
stop and do **not** apply `90518`.

Only after this proof passes, apply the deletion migration while the learning
and UGC mutation surfaces are still backward compatible:

```powershell
Invoke-RefLabMigration -DatabaseUrl $env:SUPABASE_DB_URL -Version 20260718090518 -File backend/supabase/migrations/20260718090518_resilient_account_deletion_jobs.sql
```

Verify the service-only deletion table/RPC surface, lease expiry/takeover,
monotonic phases, upload and checkout blocks, and migration of any pre-existing
deletion marker. Keep both account deletion and checkout unavailable until the
worker gate below passes. Seeing `81236` local-only at this point is expected;
stop on any other unexplained migration drift.

### Gate D — additive activity and UGC phases

Apply both remaining additive contracts before publishing the frontend:

```powershell
Invoke-RefLabMigration -DatabaseUrl $env:SUPABASE_DB_URL -Version 20260718102753 -File backend/supabase/migrations/20260718102753_learning_activity_integrity_phase1.sql
Invoke-RefLabMigration -DatabaseUrl $env:SUPABASE_DB_URL -Version 20260718103637 -File backend/supabase/migrations/20260718103637_harden_ugc_moderation.sql
```

Do **not** apply `102755` or `105035`. Phase 1 keeps old question-session,
practice, video, post, comment and report writes available; server guards/RPCs
already enforce the new integrity rules. At this exact point the only expected
remote-history gaps are `81236`, `102755` and `105035`. Verify that state before
the deploy and stop on any other drift.

Before Gate E, use a service-role Storage API client in disposable staging and
then an authorised read-only production dry run to inventory all three UGC
buckets. The report must contain aggregate counts/bytes and object age only;
do not export user content into the release ticket. Reconcile:

- `post-media` paths against `posts.media_url`, with owner metadata matching
  `posts.user_id`;
- canonical `profile-media` paths against `profiles.photo_url`, and separately
  list legacy arbitrary/external profile URLs for migration or clearing;
- `message-media` paths against `messages.media_url`, with the canonical
  conversation/sender/client-id path and object owner matching `sender_id`.

Classify unreferenced uploads as candidates, never immediate deletions. Rehearse
a Storage API sweep with a documented grace period of at least 24 hours,
idempotent retries, a dry-run default and per-bucket before/after totals. Assign
the production operator, alert threshold, response SLA and evidence location.
Do not launch if ownership cannot be proven or if quota ceilings would strand
legitimate existing accounts; resolve those accounts and repeat the rehearsal.

Moderation soft-hide removes content from RefLab read surfaces but public
`post-media`/`profile-media` URLs may remain in third-party caches. For urgent,
illegal or safety removals, the moderation owner must invoke the separately
authorised Storage API removal/cache-response procedure while preserving the
private report record and immutable target snapshot ID. Never represent a
soft-hide alone as guaranteed internet-wide deletion.

### Gate E — exact frontend and all restrictive phases

Merge only the already approved `$ReleaseCommit` after all required CI and the
Deploy Preview are green. Keep maintenance enabled while Netlify builds `main`.
Confirm the published deploy is the exact commit and that its production
environment points to `iqebkyjcoqggwhausgje`; do not accept “latest main” as
evidence.

Using two independent authenticated sessions and disposable test accounts:

1. Verify the signup checkbox starts unselected and blocks both email and Google
   signup until selected. Verify a new Google user entering through the login
   button and an existing user with no current acceptance are both held at
   `/legal/accept`, while public Terms/Privacy remain readable. Accept once and
   confirm the stored user, exact versions and server timestamp through the
   authorised database evidence path.
2. Open the same normal test concurrently; both sessions resume one attempt
   with identical ordered questions. Pause account A's start request, switch
   the browser session to B, release it and prove `p_expected_user_id = A`
   fails with SQLSTATE `42501` without creating/resuming an attempt for B.
3. Change a normal answer, reload, and verify the revised choice resumes.
4. Start a random test, answer once, reload in both sessions, and verify the
   same ordered set, server start time, remaining time and locked answer.
5. Submit fully answered normal and random attempts and reload their results.
6. Let a disposable random attempt expire; a late save must fail and submission
   must be server-marked `auto_submitted = true`.
7. Verify an all-answered resumed random attempt opens at its submit state.
8. Start Quick, By Law and By Area question sessions. Save correct/incorrect
   answers, end the sessions and verify server timing, totals and dashboard
   accuracy. A response-lost retry must create one answer only; the same
   question cannot be counted twice in one session but works in a new session.
   Repeat the paused A-to-B switch on session start and prove no B row appears.
9. Complete correct, partially correct and incorrect video scenarios. Verify
   dashboard correctness comes from the active scenario and an exact retry
   creates one attempt only. Inactive questions/scenarios must be rejected.
   Repeat the paused A-to-B switch before save and prove the captured expected
   learner rejects the request before any B video attempt is inserted.
10. Create a post and comment through the new RPCs; verify media
    per-file/object/byte/recent-upload limits, actual Storage ownership,
    deletion-in-progress blocks, failed-create cleanup and existing
    feed/read/delete behavior. Repeat for profile and private message media.
    Fill each recent-write/upload window with create/delete or upload/delete
    cycles and prove deletion cannot refund the durable abuse budget. Simulate a
    response lost after the post/profile mutation commits: recover the post by
    `client_id`, confirm neither new file is deleted, reload while the update is
    ambiguous, prove cleanup waits a full 24 hours, and then prove its
    authoritative reference recheck. Race a direct Storage DELETE token against
    each profile/post/message reference write in both commit orders; one order
    must preserve the object and the other must reject the reference, with no
    dangling database URL.
11. Submit one post, comment and user report with the required details. Verify
    duplicate handling and that only an authenticated trusted admin can read or
    action the private moderation queue. Pause an admin A review, switch to an
    independent admin B session, release it and prove `p_expected_reviewer_id`
    rejects the decision without advancing its revision. Load a 101-row staging queue without
    overlap, action/dismiss a post and comment to prove reversible soft-hide,
    open two independent database sessions against two reports for the same
    target and prove the per-target advisory lock leaves the target hidden while
    either report remains actioned (the single-session pgTAP invariant is not a
    substitute for this true-race staging harness), delete the reviewer and
    prove nullable reviewer provenance does not block account deletion,
    delete a reporter after actioning a report and prove the immutable target/
    context snapshots, reason and moderation source remain reviewable,
    reject a fake `user_metadata`/`profiles.role` admin and reject `actioned`
    for user reports until a real suspension workflow exists.
12. Block in each direction and verify feed/profile/search-history reads omit
    the blocked identity while existing message history tombstones it for both
    participants and disables new sends. Page messages sharing one timestamp
    with the composite `created_at|id` cursor and prove no row is skipped. At a
    full sender rate window, race the same `client_id` from two sessions and
    prove both calls converge on one message; a different `client_id` must stay
    rate-limited. Switch accounts with a queued message and prove the old
    sender's retry remains queued; invoke `send_message` with a mismatched
    `p_expected_sender_id` and prove SQLSTATE `42501` with no message row.
13. Mark a new-message notification read, send again, and prove the same
    durable `(user_id,type,conversation_id)` row is reopened instead of a new
    row being created. Load beyond 50 notifications with keyset pagination and
    confirm Realtime applies row deltas without replacing the loaded history.
    Pause account A's read cursor update, switch to B, and prove
    `p_expected_reader_id` rejects the stale update with SQLSTATE `42501`.
    Run ten like/unlike, follow/unfollow and comment create/delete cycles and
    prove each relationship remains one reopenable row. Mentions across either
    block direction and notifications to deletion-started recipients must leave
    no durable row.
14. Start deletion for a disposable account while retaining one already-issued
    session. Before Auth revocation completes, prove direct UGC RLS plus feed,
    profile, search-history and messaging RPC reads fail closed. From a second
    active account, prove known IDs cannot repost/comment/reply, create or reuse
    a conversation, upload message media, send text/attachments or create a
    notification for the deleting account. Exercise both `deletion_started_at`
    and a durable job row before the profile marker is projected.
15. Against two independent database sessions, concurrently insert/delete
    visible root comments and reposts for the same parent. After both commits,
    recompute from source rows and prove `comment_count` and `repost_count`
    exactly match; a single-session trigger test is not this race proof.

Stop on any mismatch. Keep maintenance active. If Gate E passes, apply all
three restrictive files individually, without lifting maintenance between
them:

```powershell
Invoke-RefLabMigration -DatabaseUrl $env:SUPABASE_DB_URL -Version 20260718081236 -File backend/supabase/migrations/20260718081236_learning_attempt_rpc_cutover.sql
Invoke-RefLabMigration -DatabaseUrl $env:SUPABASE_DB_URL -Version 20260718102755 -File backend/supabase/migrations/20260718102755_learning_activity_integrity_phase2.sql
Invoke-RefLabMigration -DatabaseUrl $env:SUPABASE_DB_URL -Version 20260718105035 -File backend/supabase/migrations/20260718105035_harden_ugc_moderation_cutover.sql
```

Repeat items 2-15. Through the normal API with a test user, prove direct
mutation is denied on both attempt tables, all three activity tables,
`posts`/`post_comments`, and all three report tables, while the replacement RPC
flows remain functional. Confirm all ten migration versions are aligned again.
Confirm the legacy user-inferred learning and moderation overloads are absent;
they are permitted only inside the additive maintenance window.
Do not run repository pgTAP fixtures on production.

### Gate F — Edge Functions

First confirm the CLI account still sees the expected project and verify secret
*names* in the dashboard/CLI without disclosing values. Required configuration
includes Supabase runtime secrets, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_CONFIGURATION_ID`, the approved
`SITE_URL`, `ACCOUNT_DELETION_WORKER_SECRET`, and approved Pro/Plus price IDs
if paid plans are enabled. `ACCOUNT_DELETION_WORKER_SECRET` must be a dedicated
random value of at least 32 bytes; it must not be a Supabase JWT, service-role
key, Stripe secret, or reused application credential. New paid
acquisition is strict opt-in in both layers: only exact
`VITE_PAID_PLANS_ENABLED=true` in the frontend build and exact
`PAID_PLANS_ENABLED=true` in Edge Function secrets enable checkout or plan
changes.

All five authenticated browser billing requests (`create-checkout-session`,
`create-portal-session`, `cancel-subscription`, `change-subscription-plan` and
`list-invoices`) must send `expected_user_id` captured with the same bearer
token. The function must return `403` when it is missing or differs from the
authenticated user, before any Stripe read or mutation. In the account-switch
smoke, hold each request from account A, activate account B in the browser, then
release it: the server may act only as A and no late response may redirect,
render invoices, close a dialog or refresh billing state in B.

For the Free-only launch, keep both flags false or unset. The named Stripe
portal configuration must be active and must explicitly report
`features.subscription_update.enabled = false`. Only customer details, invoice
history, payment-method updates and subscription cancellation may be enabled;
the function rejects any enabled unknown/non-management feature before issuing
a portal session. Record the reviewed configuration ID and dashboard evidence
without exposing Stripe credentials.

The exact `create-checkout-session` and `delete-account` candidates were already
deployed in Gate C, before `90518`, and must not have drifted. Deploy the four
remaining authenticated user-facing functions with gateway JWT verification
enabled (the default):

```powershell
$ProjectRef = 'iqebkyjcoqggwhausgje'
$JwtFunctions = @(
  'cancel-subscription',
  'change-subscription-plan',
  'create-portal-session',
  'list-invoices'
)

foreach ($Function in $JwtFunctions) {
  & npx --yes supabase@2.109.1 functions deploy $Function --project-ref $ProjectRef --workdir backend
  if ($LASTEXITCODE -ne 0) { throw "Deploy failed: $Function" }
}
```

Deploy the Stripe webhook separately with gateway JWT verification disabled.
Stripe does not send a Supabase user JWT; the function must authenticate the
raw request using `STRIPE_WEBHOOK_SECRET`:

```powershell
& npx --yes supabase@2.109.1 functions deploy stripe-webhook --no-verify-jwt --project-ref $ProjectRef --workdir backend
if ($LASTEXITCODE -ne 0) { throw 'Deploy failed: stripe-webhook' }
```

`sync-video-scenarios` remains a hard gate. Confirm that
the `learn-videos` bucket exists with the intended access model and audit every
legitimate administrator's trusted `auth.users.raw_app_meta_data` /
`app_metadata.role = "admin"`. Never authorise from user-editable metadata.
Only then deploy it with normal JWT verification:

```powershell
& npx --yes supabase@2.109.1 functions deploy sync-video-scenarios --project-ref $ProjectRef --workdir backend
if ($LASTEXITCODE -ne 0) { throw 'Deploy failed: sync-video-scenarios' }
```

If that audit cannot pass, do not deploy the function and do not launch an RC
that exposes or depends on video sync; use a separately reviewed Free-only/
feature-disabled candidate instead.

### Gate G — autonomous account-deletion worker and provisioning intent

A browser request is not a durable job runner: it may time out after billing or
storage has already changed. The launch candidate must therefore include the
reviewed `account-deletion-worker` plus the provisioning intent in migration
`20260718090518`. The worker accepts only `POST` requests carrying its dedicated
secret in `x-account-deletion-worker-secret`; it fails closed when the configured
secret is absent or shorter than 32 characters. Gateway JWT verification is
disabled only because pg_cron has no user JWT; the dedicated secret remains
mandatory inside the function.

Keep maintenance active and both deletion and checkout unavailable throughout
this entire gate. Gate C already proved the updated `delete-account`,
`create-checkout-session` and worker fail closed on the old schema before it
applied `20260718090518`. Verify those exact deployed versions again; never let
legacy checkout/deletion code overlap the new database contract.

1. Retrieve the dedicated 32-byte value generated and set as
   `ACCOUNT_DELETION_WORKER_SECRET` in Gate C. Never print it, paste it into a
   ticket, commit it, pass it through chat, or reuse another credential. In
   Project Settings → Vault create:

   - `account_deletion_worker_url` =
     `https://iqebkyjcoqggwhausgje.supabase.co/functions/v1/account-deletion-worker`;
   - `account_deletion_worker_secret` = the password-manager value.

   Perform both entries through the secret-value UI so the value is never shell
   output or SQL text. Verify only the two *names*, never `decrypted_secret`.

2. Verify that Gate C's worker is still the exact `$ReleaseCommit` version with
   gateway JWT verification disabled. Its own secret check is the authentication
   boundary. Redeploy only if this check detects drift, and keep maintenance
   active while doing so:

   ```powershell
   $ProjectRef = 'iqebkyjcoqggwhausgje'
   & npx --yes supabase@2.109.1 functions deploy account-deletion-worker --no-verify-jwt --project-ref $ProjectRef --workdir backend
   if ($LASTEXITCODE -ne 0) { throw 'Deploy failed: account-deletion-worker' }
   ```

3. Enable the `pg_cron` and `pg_net` extensions in the Supabase Dashboard, then
   schedule exactly one invocation per minute in the production SQL editor:

   ```sql
   do $cleanup$
   declare
     existing_job_id bigint;
   begin
     select jobid into existing_job_id
       from cron.job
      where jobname = 'reflab-account-deletion-worker-v1';
     if existing_job_id is not null then
       perform cron.unschedule(existing_job_id);
     end if;
   end;
   $cleanup$;

   select cron.schedule(
     'reflab-account-deletion-worker-v1',
     '* * * * *',
     $schedule$
       select net.http_post(
         url := (
           select decrypted_secret
             from vault.decrypted_secrets
            where name = 'account_deletion_worker_url'
         ),
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'x-account-deletion-worker-secret', (
             select decrypted_secret
               from vault.decrypted_secrets
              where name = 'account_deletion_worker_secret'
           )
         ),
         body := '{}'::jsonb,
         timeout_milliseconds := 120000
       );
     $schedule$
   );
   ```

   This SQL contains no secret value. Record the returned job ID, and verify
   only non-sensitive schedule metadata:

   ```sql
   select jobid, jobname, schedule, active
     from cron.job
    where jobname = 'reflab-account-deletion-worker-v1';

   select name
     from vault.secrets
    where name in (
      'account_deletion_worker_url',
      'account_deletion_worker_secret'
    )
    order by name;
   ```

4. In staging, start deletion for a disposable user and terminate the initiating
   browser request. The endpoint must authenticate through Auth `getUser`,
   require the exact server-side literal `DELETE`, and require the bearer JWT's
   `session_id` to identify a live `auth.sessions` row owned by `auth.uid()`.
   Only a non-refresh AMR method on that same JWT within ten minutes (with at
   most sixty seconds of forward clock skew) may pass. Prove that an old session
   A is rejected even when a different session B for the same account signed in
   recently; prove `token_refresh` alone, missing/malformed claims, a missing or
   differently owned session row and a timestamp over sixty seconds in the
   future are rejected. Fresh password and OAuth logins must pass. Tokens issued
   without AMR require a new login. Any RPC absence/error must return a retryable
   fail-closed `503` before enqueue. A valid but stale proof returns
   `403 reauthentication_required`, and the endpoint returns `202` only
   after the unleased job is durable and global refresh-session revocation is
   confirmed. Prove an existing job is an idempotent `202`, never `409`.
   `auth_verification_unavailable`, `reauthentication_check_unavailable` and
   `deletion_status_check_unavailable` are explicit pre-enqueue `503` outcomes:
   prove they perform no enqueue or revocation and that the browser cancels the
   local deletion marker, preserves queued/outbox data, resumes the current
   account and performs no deletion-data purge. A known invalid session and any
   unexpected HTTP `4xx` are also definitive pre-enqueue outcomes; cancel the
   marker before starting reauthentication. Reserve
   `deletion_enqueue_ambiguous` exclusively for loss/error during the enqueue
   RPC, where a commit may be hidden.
   Simulate both a failure before enqueue commits and response loss after
   commit: the first must retry enqueue, while the second must discover the one
   existing job. Simulate ambiguous global sign-out too; it must retain the
   durable job, return a retryable `503`, and converge without duplicate work.
   Prove a scheduled invocation then claims the released/expired job and
   completes billing reconciliation, storage purge and Auth deletion.
   Force process death in each persisted phase (`requested`, `billing_closing`,
   `billing_closed`, `storage_purged`, `auth`) and prove takeover after lease
   expiry resumes the same phase without duplicate Stripe effects.

5. Prove a pending customer-provisioning intent exists before Stripe customer
   creation, uses the exact stored parameters/idempotency key on retry, and is
   discovered by deletion even if the customer mapping write never occurs.
   Also prove historical customers are found through Stripe metadata search
   before `billing_closed`.

6. Prove active jobs block uploads, customer creation and checkout even with no
   lease holder. Supabase global sign-out removes refresh sessions but cannot
   invalidate access JWTs already issued; until their `exp`, every private UGC
   read and every mutation reachable with a user token must consult the durable
   deletion tombstone and fail closed. With a second device holding a pre-delete
   JWT, prove refresh fails and tombstone-protected reads/writes fail immediately.
   Keep Auth JWT expiry within the reviewed exposure window and record it; a
   long-lived JWT or uncovered private read is a NO-GO. Check Edge logs plus
   `cron.job_run_details` for failed runs, and monitor non-sensitive backlog
   aggregates (never list user IDs in evidence):

   ```sql
   select phase, count(*) as jobs, max(now() - updated_at) as oldest_age
     from public.account_deletion_jobs
    group by phase
    order by phase;
   ```

7. Exercise message-media purge with two disposable conversations. First use a
   truly doomed conversation whose last endpoint is deleted and which contains
   referenced attachments from both senders; prove both Storage objects and
   their quota footprint are gone. Then delete one endpoint from a conversation
   with a surviving account; prove only the deleting user's objects are removed
   and the survivor's referenced media remains readable to that survivor.

Assign an operational owner and response SLA. Maintenance remains strict until
this gate and the integrated deletion smoke pass. The scheduling pattern follows
the official Supabase `pg_cron` + `pg_net` guidance, with credentials held in
Vault: <https://supabase.com/docs/guides/functions/schedule-functions>.

## 6. Integrated production smoke while maintenance remains active

Use non-sensitive disposable accounts and retain timestamps/correlation IDs,
not tokens. Verify:

- signup/login/reset/OAuth as configured, profile creation/edit and logout;
- Dashboard → Learn → normal/random test → feedback → progress;
- question sessions in all three modes, finite one-answer-per-question
  progression, server-derived completion totals and dashboard accuracy;
- video action/sanction grading, exact-retry deduplication and inactive-content
  rejection;
- community post/comment creation through RPCs, report detail/
  duplicate validation, private moderation pagination/reversible soft-hide,
  follow/block/privacy, durable coalesced notifications, keyset loading and
  Realtime delta refresh;
- two-party messaging, offline retry/idempotency, private media access, and
  blocked/deleted-user tombstone behaviour, including tied-timestamp cursor
  pagination with no missing message;
- profile/post/message media ownership and per-file/object/byte/recent-upload
  ceilings, plus best-effort orphan cleanup evidence on failed mutations;
- account deletion retry/resume and the block on new uploads/checkout while a
  deletion job is active, including completion by the autonomous worker after
  the initiating request has ended; verify stale-auth rejection preserves the
  browser outbox/history, a pre-send network failure remains visibly pending
  and retryable without false sign-out, and only `202`/ambiguous outcomes purge
  account-scoped browser data;
- public/legal/support/404 routes at phone, tablet and desktop widths, with no
  console errors or horizontal overflow;
- the automated axe matrix remains green for all 18 route/fixture states at
  phone, tablet and desktop widths (54 scenarios). This is only an automated
  baseline: complete and record manual keyboard, focus-order, zoom/reflow,
  screen-reader and other assistive-technology checks before launch;
- a fresh navigation downloads the exact release HTML and hashed assets.

### Stripe gate

If the approved launch is Free-only, prove that paid CTAs and all checkout,
plan-change and portal entry points are unavailable; do not create a live sale.

If paid plans are approved, first complete the entire flow in Stripe test mode:

- price IDs map to the reviewed plan/currency/interval/tax/trial contract;
- checkout success/cancel URLs and Customer Portal return to the approved
  `SITE_URL`;
- endpoint URL is
  `https://iqebkyjcoqggwhausgje.supabase.co/functions/v1/stripe-webhook`;
- webhook signature verification succeeds and these events are delivered:
  `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `invoice.paid`, and `invoice.payment_failed`;
- duplicate/retried events remain idempotent, subscription state converges, and
  invoices, upgrade/downgrade, cancellation and portal flows match the UI;
- only after test evidence passes are separately approved live keys/prices and
  the live webhook endpoint enabled. Never mix test and live identifiers.

### Netlify Support gate

On the exact Deploy Preview, confirm Netlify detected one form named
`reflab-support`. Submit one deliberately non-sensitive synthetic request via
`/support`; a successful HTTP response alone is insufficient. Confirm the
submission appears in Netlify Forms with fields `topic`, `name`, `email`,
`message`, `path` and honeypot handling, and confirm the authorised notification
arrives in the monitored inbox. Repeat one synthetic production submission
while maintenance smoke access is available. Record evidence, then delete or
retain the fixture according to policy.

## 7. Recovery matrix

| Failure point | Safe response | Prohibited shortcut |
| --- | --- | --- |
| Before any SQL | Abort, verify no history changed, remove maintenance after normal smoke. If Gate C functions were already predeployed, either retain those reviewed fail-closed candidates or redeploy a previously proven schema-compatible bundle before reopening. | Continuing without access, backup or staging evidence, or restoring legacy deletion/checkout code. |
| Gate C pre-`90518` function smoke fails | Keep maintenance and paid acquisition disabled; inspect the exact deployed versions and logs, then forward-fix/rehearse. Do not change the schema. | Applying `90518` while legacy or side-effecting function behavior is still reachable. |
| One SQL transaction fails | It rolls back; stop, inspect error/schema/history, fix and rehearse a reviewed candidate. | Marking the failed version applied or running all pending migrations. |
| SQL succeeds, history repair fails | Keep maintenance; inspect objects and `migration list`, then repair that exact already-present version. | Rerunning the SQL blindly. |
| After `70103`/`70105`/`90518` | Keep maintenance and forward-fix/deploy the matching RC. Treat schema rollback as a separately reviewed migration/restore decision. | Serving the old frontend or hand-deleting security objects. |
| After additive `81235`/`102753`/`103637`, before restrictions | Their mutation surfaces remain old-client compatible, but the overall release is not because of `70103/70105/90518`; keep maintenance and move forward or restore under the recovery plan. | Assuming the whole old app is safe because these direct writes still exist. |
| New frontend smoke fails before restrictions | Keep maintenance; fix forward on a new reviewed commit. A database restore requires incident approval and recovery evidence. | Applying `81236`, `102755` or `105035`, or lifting maintenance. |
| After any restrictive file | Keep the RPC frontend. Recover with a reviewed forward migration/fix; restore only under the incident plan. | Rolling back to a bundle that directly mutates the restricted tables. |
| Edge Function deploy/smoke fails | Keep maintenance; redeploy the exact reviewed function bundle or a previously proven compatible bundle. Verify DB compatibility first. | Re-enabling an older deletion/billing path without compatibility tests or deploying `90518` before Gate C's fail-closed proof. |
| Stripe/webhook fails | Disable paid entry points, keep Free-only if that candidate was approved, repair in test mode, then re-approve live billing. | Accepting payments with stale subscription state or bypassing signatures. |
| Netlify publish/route/form fails | Keep maintenance; fix forward or restore a deploy only if it is compatible with the now-applied DB contract. | Pointing production at the old incompatible SPA. |

Database security/cutover migrations are operationally forward-only unless the
incident commander approves a tested point-in-time restore. Never improvise a
down migration during the launch window.

## 8. Exit, forced refresh and post-launch watch

1. Confirm `migration list` shows all ten versions aligned locally/remotely:
   `20260718070103`, `20260718070105`, `20260718081234`,
   `20260718081235`, `20260718081236`, `20260718090518`,
   `20260718102753`, `20260718102755`, `20260718103637`, and
   `20260718105035`.
2. Confirm all eight listed Edge Function versions/JWT settings, the separately
   provisioned autonomous deletion worker and schedule, and the exact Netlify
   deploy commit.
3. Repeat critical auth, learning, messaging, deletion, approved billing and
   support checks. Review Supabase/Postgres/Edge, Netlify and Stripe errors.
4. Verify primary HTML is revalidated (`Cache-Control: max-age=0,
   must-revalidate`) and serves the release assets. End maintenance with an
   explicit “reload/reopen RefLab” instruction. An already-open SPA cannot be
   assumed to refresh itself; require a hard refresh/reopen and test a fresh
   browser session before declaring the window complete.
5. Lift maintenance, record time/operator/evidence, and monitor elevated error,
   auth, webhook, form, Realtime and database signals through the agreed watch
   period. Keep rollback/incident owners available.
6. Close the release only after the production deploy commit, smoke evidence,
   migration history, function versions, secret rotation, support notification
   and NO-GO decisions are attached to the release record.

Related focused procedure:
[LEARNING_ATTEMPT_CUTOVER.md](./LEARNING_ATTEMPT_CUTOVER.md).

Official references:

- <https://supabase.com/docs/guides/auth/password-security>
- <https://supabase.com/docs/guides/deployment/database-migrations>
- <https://supabase.com/docs/reference/cli/supabase-migration-repair>
- <https://supabase.com/docs/reference/cli/supabase-functions-deploy>
- <https://docs.netlify.com/manage/forms/setup/>
- <https://docs.netlify.com/site-deploys/overview/>
- <https://docs.stripe.com/webhooks/signature>
