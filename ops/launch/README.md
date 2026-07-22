# RefLab first-public-launch runbook

This runbook promotes the existing RefLab application and its existing Supabase
database. It does not rebuild, reset or reseed production. The authoritative
release plan is `docs/reflab-launch-redesign-plan.html`; this document turns its
gates into an operator procedure.

The preflight is deliberately incapable of deploying anything. Its default is
offline dry-run, every unknown is a blocker, and its JSON report contains no
legal values, operator contacts, secret values, secret digests or local backup
paths.

## Permanent prohibitions

- Never run `supabase db push`, `supabase db reset --linked`, `supabase
  migration repair`, or any historical migration chain against production.
- The only launch SQL candidates are
  `20260722_0050_launch_security_hardening.sql` followed by
  `20260723000000_launch_abuse_controls.sql`, each as its own reviewed
  transaction. Never reverse or collapse this order.
- In particular, never replay `20260213_0035_fresh_rebuild_all.sql`. It contains
  destructive rebuild logic and production has an unreconciled migration
  history.
- Never use `--include-seed`, `--prune`, `--no-verify-jwt`, or a production
  service-role key in frontend/preview configuration.
- Never use `supabase db dump --dry-run` for a linked project: its diagnostic
  command can expose connection material. Never pass `--db-url` or a database
  URI in argv.
- Never set, rotate, print or export credentials as part of preflight.
- Never enable paid plans during this release. Both flags must resolve to
  exactly `false`.
- Never make the message-media bucket public as a rollback. Privacy takes
  precedence over attachment availability.
- Never restore over production merely because a smoke test failed. A full
  restore is an incident decision with an explicit data-loss/reconciliation
  assessment.
- Never hand-run `DROP` statements or ad-hoc rollback SQL. Every database
  correction is a new, timestamped, reviewed and rehearsed forward-fix
  migration.

These rules follow Supabase's current guidance: database dumps and migration
commands default differently, remote reset is destructive, and Storage objects
are not included in database backups. Relevant primary documentation:

- <https://supabase.com/docs/guides/platform/backups>
- <https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore>
- <https://supabase.com/docs/guides/local-development/cli-workflows>
- <https://supabase.com/docs/guides/functions/deploy>
- <https://docs.netlify.com/cli/get-started/>

## 1. Tooling contract

Run from the canonical repository root:

```powershell
git rev-parse --show-toplevel
git remote get-url origin
git branch --show-current
git status --short --branch

gh --version
netlify --version
supabase --version
psql --version

gh pr checks --help
netlify status --help
supabase db dump --help
supabase functions deploy --help
```

The expected checkout is `Jihzza/RefLab`, branch
`agent/reflab-launch-redesign`. The production identifiers are intentionally
public in the launch-input template:

- Supabase project: `iqebkyjcoqggwhausgje`
- Netlify site: `df99b355-fbfb-4097-875e-ae322175c876`
- Production URL: `https://reflab.netlify.app`

Copy the template to the ignored private file and fill only non-secret facts:

```powershell
Copy-Item ops/launch/launch-inputs.example.json ops/launch/launch-inputs.json
```

Do not put passwords, tokens, connection strings or raw production rows in any
launch JSON. The preflight rejects common secret formats and secret-like keys.

Run the deterministic local tooling gate first. This is the local CI gate and
must return zero:

```powershell
./scripts/launch/Test-LaunchTooling.ps1
if ($LASTEXITCODE -ne 0) { throw 'Launch tooling validation failed' }
```

The offline preflight is a diagnostic, not a launch gate. It deliberately
returns `NO-GO` because online state and human evidence cannot be proven
offline; inspect its redacted report and continue resolving the listed gates:

```powershell
./scripts/launch/Invoke-LaunchPreflight.ps1 -Stage PreDeploy
if ($LASTEXITCODE -eq 0) { throw 'Offline diagnostic must not claim launch GO' }
```

Then run the complete read-only preflight:

```powershell
./scripts/launch/Invoke-LaunchPreflight.ps1 -Stage PreDeploy -Online
if ($LASTEXITCODE -ne 0) { throw 'NO-GO: online launch preflight failed' }
```

`-Online` only runs this allow-list: Git inspection, `gh pr view`, `gh pr
checks`, `netlify status`, reads of the public paid/Google OAuth/CAPTCHA flags,
and Supabase project/backups/function/secret-name metadata. It never reads
application rows or the hCaptcha site key.

## 2. Evidence records

Every common evidence record is JSON schema version 1 with a `kind`, `passed:
true`, UTC timestamp, release commit, production project ref, named approver,
an `approvalReference`, a boolean `checks` object and at least one non-empty
artifact outside the repository whose SHA-256 is verified by the preflight.
Start from `evidence-record.example.json`; the legal gate has its own template.

These records are approval-backed assertions, not cryptographic signatures.
The artifact and `approvalReference` must lead a human auditor to the actual
report, ticket or approval trail. The preflight checks identity, age, path and
hash, but never replaces accountable human approval.

The preflight requires these records before deployment:

| kind | Maximum age | Required proof |
| --- | ---: | --- |
| `legal-publication` | 7 d | final policy text, real operator identity/contacts, retention/minors/content terms, public URL/version match and legal approval |
| `backup-manifest` | 24 h | roles, schema, data, migration history and Storage artifacts; hashes; encryption; off-site copy |
| `restore-rehearsal` | 7 d | complete isolated restore, counts, objects, ordered 0050 + abuse-controls migrations, auth/abuse matrix and rollback/forward-fix exercise |
| `managed-backup-policy` | 7 d | first-launch restore policy, managed restore requirement and external spend authorization if upgrade is needed |
| `function-rollout-readiness` | 24 h | exact function set/JWT/order, operator, stop conditions and HEAD/clean/hash recheck procedure |
| `function-rollout` | 4 h after functions | per-function identity rechecks, exact deployed set/JWT and no prune/bypass |
| `migration-baseline` | 24 h | live schema/history inventory, historical replay blocked, both exact checksums and pinned order |
| `smtp-recovery` | 7 d | delivery, link, reset, old-password rejection and session rotation |
| `support-channel` | 7 d | privacy/support inboxes reachable and reply owner assigned |
| `auth-production-readiness` | 4 h | custom SMTP/capacity, email confirmation, minimum 10-character letter-and-number policy and live journeys |
| `captcha-readiness` | 24 h when enabled | strict frontend opt-in, production site key, matching backend provider and positive/rejection journeys |
| `captcha-waiver` | 24 h when disabled | frontend/backend disabled state, explicit time-limited approval and abuse-monitoring owner |
| `credential-rotation` | 24 h | DB credentials and, only when enabled, Google OAuth credentials rotated; consumers updated; old values rejected; Auth smoke |
| `google-oauth-readiness` | 24 h when enabled | production publishing, branding/home/privacy/terms URLs, domains, redirects and external-user journey |
| `google-oauth-disabled` | 24 h when disabled | provider/production flag off, signup/login buttons hidden and direct initiation blocked |
| `stripe-inventory` | 4 h | purchases disabled, zero open checkout sessions, subscriptions reconciled, webhook healthy |
| `preview-qa` | 72 h | mobile/desktop, anonymous/authenticated, accessibility and zero P0/P1 |
| `moderation-readiness` | 7 d | queue accessible, existing reports triaged, procedure/contact tested |
| `community-disabled` | 72 h | required instead of moderation evidence if community is disabled in code |
| `rollback-rehearsal` | 7 d | compatible frontend/function target, new DB forward-fix migration, manual DROP prohibition and operator exercise |
| `observability-readiness` | 7 d | Auth/functions/database/Netlify visibility and escalation test |

`PostFunctions` additionally requires `function-rollout`. `PostDeploy`
additionally requires `post-deploy-smoke` and `qa-cleanup`, all no older than
four hours. Required check names are enforced by
`Invoke-LaunchPreflight.ps1`; use that script as the machine-readable contract.

### Known production blockers (captured 2026-07-22)

The current project is on Supabase Free and exposes no managed restore point;
the built-in SMTP is non-production and limited to two Auth emails per hour;
email confirmation is disabled (`mailer_autoconfirm = true`); CAPTCHA is off;
and the minimum password length is six. Database and Google OAuth credential
rotation is also unproven. These are factual gates: all remain NO-GO until
remediated, except CAPTCHA may use the explicit, time-limited, approval-backed
disabled-mode waiver defined below.

Before refreshing the corresponding evidence:

1. Obtain explicit account-owner authorization for any plan upgrade/spend,
   then move to a configuration with a visible managed restore point while
   retaining the independent encrypted logical/Storage backup. The preflight
   cannot authorize or purchase an upgrade.
2. Configure a production custom SMTP sender, SPF/DKIM/DMARC and an approved
   Auth-email rate limit; test delivery to a non-team address.
3. Enable email confirmation and test new signup, callback, resend and login.
4. Record `captchaMode`. If enabled, use strict frontend opt-in, configure the
   production site key and matching Supabase provider, then test signup, login,
   recovery and rejection. If disabled, both sides must be proven disabled and
   a time-limited human waiver plus abuse-monitoring owner is mandatory.
5. Raise the backend minimum to 10 characters with at least one letter and one
   number, matching the frontend validation and copy.
6. Rotate the production database credential. For Google OAuth, record an
   explicit mode: enabled requires credential rotation, production publishing,
   correct branding/legal URLs/redirects and an external-user journey; disabled
   requires the Supabase provider and production flag off, hidden login/signup
   buttons and blocked direct initiation.

Never record credential values, token fragments, connection strings or secret
digests. Private evidence may contain approval references and external artifact
paths; the generated report retains only booleans, counts, non-secret hashes
and base file names.

## 3. Fresh backup and restore rehearsal

### 3.1 Explicit authorization

Before reading production into backup files, the launch owner records this exact
confirmation in the private release log:

```text
BACKUP APPROVED iqebkyjcoqggwhausgje <UTC timestamp> <approver>
```

The destination must be an encrypted volume outside this repository. Authenticate
the already linked Supabase CLI through the approved interactive/session-secret
flow. Never paste a database URI into source, JSON, chat, logs or argv.

```powershell
$ProjectRef = 'iqebkyjcoqggwhausgje'
$BackupRoot = 'REPLACE_WITH_ENCRYPTED_OFF_REPOSITORY_DIRECTORY'
$RepoRoot = (Resolve-Path .).Path.TrimEnd('\', '/')
$ResolvedBackupRoot = (Resolve-Path $BackupRoot).Path.TrimEnd('\', '/')
$RepoPrefix = $RepoRoot + [System.IO.Path]::DirectorySeparatorChar
if ($ResolvedBackupRoot.Equals($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
    $ResolvedBackupRoot.StartsWith($RepoPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Backup destination must be outside the repository'
}
```

Use the current CLI help as authority, then export roles, schema, data and the
remote migration-history schema/data separately:

```powershell
supabase db dump --help
# Never add --dry-run and never add --db-url.

supabase db dump --linked --workdir backend `
  --file "$BackupRoot/roles.sql" --role-only

supabase db dump --linked --workdir backend `
  --file "$BackupRoot/schema.sql"

supabase db dump --linked --workdir backend `
  --file "$BackupRoot/data.sql" --use-copy --data-only `
  --exclude 'storage.buckets_vectors' --exclude 'storage.vector_indexes'

supabase db dump --linked --workdir backend `
  --file "$BackupRoot/migration-history-schema.sql" `
  --schema supabase_migrations

supabase db dump --linked --workdir backend `
  --file "$BackupRoot/migration-history-data.sql" --use-copy --data-only `
  --schema supabase_migrations
```

Database dumps only preserve Storage metadata. Separately export every object
from every production bucket with an approved read-only Storage downloader.
Its output must be an encrypted archive plus a metadata-only inventory containing
bucket, object path, byte length and checksum—not signed URLs, keys or object
contents. Compare the number and aggregate bytes against a second read-only
listing. Do not use an exporter that can upload, move or delete objects.

Create `backup-manifest.json` outside the repository from
`backup-manifest.example.json`, calculate every hash locally, and make a second
encrypted/off-site copy:

```powershell
Get-FileHash "$BackupRoot/roles.sql" -Algorithm SHA256
Get-FileHash "$BackupRoot/schema.sql" -Algorithm SHA256
Get-FileHash "$BackupRoot/data.sql" -Algorithm SHA256
Get-FileHash "$BackupRoot/migration-history-schema.sql" -Algorithm SHA256
Get-FileHash "$BackupRoot/migration-history-data.sql" -Algorithm SHA256
Get-FileHash "$BackupRoot/storage-inventory.json" -Algorithm SHA256
Get-FileHash "$BackupRoot/storage-objects.encrypted-archive" -Algorithm SHA256
```

End the ephemeral CLI session according to the approved credential procedure;
do not print its environment or diagnostic command.

### 3.2 Restore into an isolated target

Create or select a disposable non-production target with no real users and no
production integrations. Record this separate confirmation:

```text
RESTORE REHEARSAL APPROVED <target project ref> <UTC timestamp> <approver>
```

Load the target connection only through `PGHOST`, `PGPORT`, `PGDATABASE`,
`PGUSER` and process-memory `PGPASSWORD`. Require certificate verification via
`PGSSLMODE=verify-full` and an approved `PGSSLROOTCERT`. The expected host,
port, database and user are non-secret values from the approved rehearsal
record and must match exactly—never by substring:

```powershell
$ProductionRef = 'iqebkyjcoqggwhausgje'
$RehearsalRef = 'REPLACE_WITH_NON_PRODUCTION_PROJECT_REF'
$ApprovedRehearsalIdentity = @{
  Host = 'REPLACE_WITH_EXACT_APPROVED_HOST'
  Port = 'REPLACE_WITH_EXACT_APPROVED_PORT'
  Database = 'REPLACE_WITH_EXACT_APPROVED_DATABASE'
  User = 'REPLACE_WITH_EXACT_APPROVED_USER'
}

if ($RehearsalRef -eq $ProductionRef) {
  throw 'Refusing to restore into production'
}
foreach ($Name in @('PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD')) {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name))) {
    throw "Missing process environment variable: $Name"
  }
}
if ($env:PGHOST -cne $ApprovedRehearsalIdentity.Host -or
    $env:PGPORT -cne $ApprovedRehearsalIdentity.Port -or
    $env:PGDATABASE -cne $ApprovedRehearsalIdentity.Database -or
    $env:PGUSER -cne $ApprovedRehearsalIdentity.User) {
  throw 'Rehearsal database identity differs from the approved exact tuple'
}
if ($env:PGSSLMODE -cne 'verify-full' -or
    -not (Test-Path -LiteralPath $env:PGSSLROOTCERT -PathType Leaf)) {
  throw 'TLS verify-full with the approved root certificate is mandatory'
}

$Probe = psql --no-psqlrc --no-align --tuples-only --field-separator '|' `
  --variable ON_ERROR_STOP=1 `
  --command "begin transaction read only; select current_database(), current_user, current_setting('ssl'); rollback;"
if ($LASTEXITCODE -ne 0) { throw 'Read-only rehearsal identity probe failed' }
$IdentityRow = @($Probe | Where-Object { $_ -match '\|' })[-1].Split('|')
if ($IdentityRow.Count -ne 3 -or
    $IdentityRow[0] -cne $ApprovedRehearsalIdentity.Database -or
    $IdentityRow[1] -cne $ApprovedRehearsalIdentity.User -or
    $IdentityRow[2] -cne 'on') {
  throw 'Read-only rehearsal identity probe did not match the approved target'
}
```

Restore using the official single-transaction pattern:

```powershell
psql --single-transaction --variable ON_ERROR_STOP=1 `
  --file "$BackupRoot/roles.sql" `
  --file "$BackupRoot/schema.sql" `
  --command 'SET session_replication_role = replica' `
  --file "$BackupRoot/data.sql"

psql --single-transaction --variable ON_ERROR_STOP=1 `
  --file "$BackupRoot/migration-history-schema.sql" `
  --file "$BackupRoot/migration-history-data.sql"
```

Import the Storage archive only into the isolated target. Verify every object's
path, byte length and checksum against `storage-inventory.json`. Confirm Auth,
profiles, tests/attempts, conversations/participants/messages, reports, billing
records and Storage metadata/object counts against the source snapshot. Raw rows
must not be copied into the evidence JSON.

Verify both candidate hashes and run only these files, in order, against the
restored copy. Each file contains its own `begin`/`commit` and fail-fast
contract preflight:

```powershell
$Migration0050 = Resolve-Path 'backend/supabase/migrations/20260722_0050_launch_security_hardening.sql'
$MigrationAbuse = Resolve-Path 'backend/supabase/migrations/20260723000000_launch_abuse_controls.sql'
$Migration0050Hash = (Get-FileHash $Migration0050 -Algorithm SHA256).Hash.ToLowerInvariant()
$MigrationAbuseHash = (Get-FileHash $MigrationAbuse -Algorithm SHA256).Hash.ToLowerInvariant()

$Probe = psql --no-psqlrc --no-align --tuples-only --field-separator '|' `
  --variable ON_ERROR_STOP=1 `
  --command "begin transaction read only; select current_database(), current_user, current_setting('ssl'); rollback;"
if ($LASTEXITCODE -ne 0) { throw 'Pre-0050 read-only identity probe failed' }

psql --no-psqlrc --variable ON_ERROR_STOP=1 --file "$Migration0050"
if ($LASTEXITCODE -ne 0) { throw '0050 rehearsal failed' }

$Probe = psql --no-psqlrc --no-align --tuples-only --field-separator '|' `
  --variable ON_ERROR_STOP=1 `
  --command "begin transaction read only; select current_database(), current_user, current_setting('ssl'); rollback;"
if ($LASTEXITCODE -ne 0) { throw 'Pre-abuse-controls read-only identity probe failed' }

psql --no-psqlrc --variable ON_ERROR_STOP=1 --file "$MigrationAbuse"
if ($LASTEXITCODE -ne 0) { throw 'Abuse-controls rehearsal failed after 0050' }
```

Run the anonymous/A/B/outsider authorization matrix, account-deletion A/B
scenario, message-media checks, social concurrency/rate-limit tests, Storage
authorization/inventory tests, question-bank exposure tests, and release checker
on the restored target.
Record timings, lock observations and only aggregate counts/booleans. Complete
`restore-rehearsal.json` from the supplied example, then clear every `PG*`
connection secret from the process.

## 4. T-2 hours: freeze and GO/NO-GO

1. Freeze the exact 40-character commit in `launch-inputs.json`.
2. Confirm the worktree is clean and every exact required PR/preview check name
   points at that commit with bucket `pass`; required `skipping` is a failure.
3. Ensure the PR is no longer draft and has the required approval.
4. Confirm legal texts, public contacts, moderation/support owners and launch
   window.
5. Confirm both paid flags are false, Stripe evidence is fresh, and the
   approved Google OAuth/CAPTCHA enabled-or-disabled modes match production.
6. Run `Invoke-LaunchPreflight.ps1 -Stage PreDeploy -Online`.
7. The release owner records exactly:

```text
GO REFLAB <40-char commit> iqebkyjcoqggwhausgje df99b355-fbfb-4097-875e-ae322175c876 <UTC timestamp> <approver>
```

Any `NO-GO`, unapproved PR, dirty tree, stale evidence, missing restore proof or
identifier mismatch stops the launch. “Accepting the risk” is not an override.

## 5. T0 rollout

### Checkpoint A — merge and compatible frontend

The new signed-media reader must reach production while the old public-reader
contract still works. Use the Git-connected Netlify release, not an untracked
manual production upload.

```powershell
gh pr checks 22 --repo Jihzza/RefLab
gh pr view 22 --repo Jihzza/RefLab `
  --json state,isDraft,reviewDecision,headRefOid,mergeStateStatus
```

The exact critical check names come from `release.requiredGithubChecks`; every
one, including `requiredPreviewCheckName`, must appear exactly once with bucket
`pass`. A required check reported as `skipping` does not satisfy GO.

After the recorded GO, the release owner may mark the PR ready and merge it. Do
not enable auto-merge before GO. Wait for the `main` Netlify deploy, verify the
deployed tree corresponds to the approved candidate, verify security headers,
then run anonymous and authenticated smoke tests. If this frontend step fails,
restore the previous known Netlify deploy; the database is still unchanged.

The approved GitHub path is explicit and non-automatic:

```powershell
$ExpectedHead = 'REPLACE_WITH_APPROVED_40_CHARACTER_COMMIT'
$LocalHead = (git rev-parse HEAD).Trim()
$Dirty = @(git status --porcelain=v1)
if ($LocalHead -cne $ExpectedHead -or $Dirty.Count -ne 0) {
  throw 'Local HEAD or worktree changed before the Git-connected frontend deploy'
}
$Approved0050Hash = 'REPLACE_WITH_APPROVED_0050_SHA256'
$ApprovedAbuseHash = 'REPLACE_WITH_APPROVED_ABUSE_CONTROLS_SHA256'
if ((Get-FileHash 'backend/supabase/migrations/20260722_0050_launch_security_hardening.sql' -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Approved0050Hash -or
    (Get-FileHash 'backend/supabase/migrations/20260723000000_launch_abuse_controls.sql' -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ApprovedAbuseHash) {
  throw 'Approved launch migration hashes changed before frontend deployment'
}
$Pr = gh pr view 22 --repo Jihzza/RefLab `
  --json headRefOid,isDraft,reviewDecision,mergeStateStatus | ConvertFrom-Json
if ($Pr.headRefOid -ne $ExpectedHead -or $Pr.isDraft -or `
    $Pr.reviewDecision -ne 'APPROVED' -or $Pr.mergeStateStatus -ne 'CLEAN') {
  throw 'PR identity or approval changed after GO'
}

$Confirmation = Read-Host "Type MERGE REFLAB $ExpectedHead"
if ($Confirmation -cne "MERGE REFLAB $ExpectedHead") { throw 'Merge cancelled' }

gh pr merge 22 --repo Jihzza/RefLab --merge --delete-branch=false
if ($LASTEXITCODE -ne 0) { throw 'PR merge failed' }

$MainCommit = gh api repos/Jihzza/RefLab/commits/main --jq .sha
gh api "repos/Jihzza/RefLab/commits/$MainCommit/status" `
  --jq '.statuses[] | {context, state, target_url}'
```

Before Checkpoint B, record:

```text
FRONTEND COMPATIBLE VERIFIED <production deploy id> <commit/tree> <UTC timestamp> <operator>
```

### Checkpoint B — apply the two isolated migrations in pinned order

Pause new release actions. Reconfirm Supabase health, the fresh backup hash and
both exact migration hashes. Load production PostgreSQL connection fields from
the secret manager into `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and
`PGPASSWORD`; this keeps the secret out of command history. Set
`PGSSLMODE=verify-full` and `PGSSLROOTCERT` to the approved CA. Load the exact
non-secret host/port/database/user tuple from the approval record:

```powershell
$ExpectedHead = 'REPLACE_WITH_APPROVED_40_CHARACTER_COMMIT'
$ApprovedProductionIdentity = @{
  Host = 'REPLACE_WITH_EXACT_APPROVED_HOST'
  Port = 'REPLACE_WITH_EXACT_APPROVED_PORT'
  Database = 'REPLACE_WITH_EXACT_APPROVED_DATABASE'
  User = 'REPLACE_WITH_EXACT_APPROVED_USER'
}

function Assert-ReleaseIdentity([string]$Path, [string]$ApprovedSha256) {
  $Head = (git rev-parse HEAD).Trim()
  $Dirty = @(git status --porcelain=v1)
  $ActualHash = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($Head -cne $ExpectedHead -or $Dirty.Count -ne 0 -or
      $ActualHash -cne $ApprovedSha256) {
    throw "HEAD, clean worktree or SHA-256 changed before deployment: $Path"
  }
}

function Assert-ProductionDatabaseIdentity {
  foreach ($Name in @('PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD')) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name))) {
      throw "Missing process environment variable: $Name"
    }
  }
  if ($env:PGHOST -cne $ApprovedProductionIdentity.Host -or
      $env:PGPORT -cne $ApprovedProductionIdentity.Port -or
      $env:PGDATABASE -cne $ApprovedProductionIdentity.Database -or
      $env:PGUSER -cne $ApprovedProductionIdentity.User) {
    throw 'Production database identity differs from the approved exact tuple'
  }
  if ($env:PGSSLMODE -cne 'verify-full' -or
      -not (Test-Path -LiteralPath $env:PGSSLROOTCERT -PathType Leaf)) {
    throw 'TLS verify-full with the approved root certificate is mandatory'
  }
  $Probe = psql --no-psqlrc --no-align --tuples-only --field-separator '|' `
    --variable ON_ERROR_STOP=1 `
    --command "begin transaction read only; select current_database(), current_user, current_setting('ssl'); rollback;"
  if ($LASTEXITCODE -ne 0) { throw 'Read-only production identity probe failed' }
  $IdentityRow = @($Probe | Where-Object { $_ -match '\|' })[-1].Split('|')
  if ($IdentityRow.Count -ne 3 -or
      $IdentityRow[0] -cne $ApprovedProductionIdentity.Database -or
      $IdentityRow[1] -cne $ApprovedProductionIdentity.User -or
      $IdentityRow[2] -cne 'on') {
    throw 'Read-only production identity probe did not match the approved target'
  }
}
```

The exact environment tuple plus the read-only query must pass immediately
before each SQL file. A hostname substring is never accepted as identity.

Record this one-use authorization:

```text
APPLY 0050 APPROVED <migration SHA256> iqebkyjcoqggwhausgje <UTC timestamp> <approver>
```

Then execute only the reviewed 0050 file:

```powershell
$Migration0050 = Resolve-Path 'backend/supabase/migrations/20260722_0050_launch_security_hardening.sql'
$Actual0050Hash = (Get-FileHash $Migration0050 -Algorithm SHA256).Hash.ToLowerInvariant()
$Approved0050Hash = 'REPLACE_WITH_APPROVED_0050_SHA256'
Assert-ReleaseIdentity "$Migration0050" $Approved0050Hash
Assert-ProductionDatabaseIdentity

psql --no-psqlrc --variable ON_ERROR_STOP=1 --file "$Migration0050"
if ($LASTEXITCODE -ne 0) { throw '0050 failed; transaction must be verified rolled back' }
```

Verify 0050 postconditions before authorizing the dependent abuse controls.
Record separately:

```text
APPLY ABUSE CONTROLS APPROVED <migration SHA256> iqebkyjcoqggwhausgje AFTER <0050 SHA256> <UTC timestamp> <approver>
```

Then run only the second reviewed file:

```powershell
$MigrationAbuse = Resolve-Path 'backend/supabase/migrations/20260723000000_launch_abuse_controls.sql'
$ActualAbuseHash = (Get-FileHash $MigrationAbuse -Algorithm SHA256).Hash.ToLowerInvariant()
$ApprovedAbuseHash = 'REPLACE_WITH_APPROVED_ABUSE_CONTROLS_SHA256'
Assert-ReleaseIdentity "$MigrationAbuse" $ApprovedAbuseHash
Assert-ProductionDatabaseIdentity

psql --no-psqlrc --variable ON_ERROR_STOP=1 --file "$MigrationAbuse"
if ($LASTEXITCODE -ne 0) {
  throw 'Abuse-controls migration failed after committed 0050; stop and use the approved forward-fix path'
}
```

Do not mark old migrations as applied. Store both execution times, checksums,
their order and postcondition query results in the private release evidence.
Clear all `PG*` secret variables after verification.

### Checkpoint C — deploy Edge Functions one by one

Record:

```text
FUNCTION DEPLOY APPROVED <commit> iqebkyjcoqggwhausgje <UTC timestamp> <approver>
```

Deploy from `backend/supabase/config.toml`, never with `--no-verify-jwt` and
never with `--prune`:

```powershell
$ProjectRef = 'iqebkyjcoqggwhausgje'
$Functions = @(
  'stripe-webhook',
  'delete-account',
  'create-checkout-session',
  'create-portal-session',
  'change-subscription-plan',
  'cancel-subscription',
  'list-invoices',
  'sync-video-scenarios',
  'get-learn-video-url',
  'sync-learn-videos'
)
$ApprovedConfigSha256 = 'REPLACE_WITH_APPROVED_CONFIG_SHA256'
$ApprovedFunctionSha256 = @{
  'stripe-webhook' = 'REPLACE_WITH_APPROVED_SHA256'
  'delete-account' = 'REPLACE_WITH_APPROVED_SHA256'
  'create-checkout-session' = 'REPLACE_WITH_APPROVED_SHA256'
  'create-portal-session' = 'REPLACE_WITH_APPROVED_SHA256'
  'change-subscription-plan' = 'REPLACE_WITH_APPROVED_SHA256'
  'cancel-subscription' = 'REPLACE_WITH_APPROVED_SHA256'
  'list-invoices' = 'REPLACE_WITH_APPROVED_SHA256'
  'sync-video-scenarios' = 'REPLACE_WITH_APPROVED_SHA256'
  'get-learn-video-url' = 'REPLACE_WITH_APPROVED_SHA256'
  'sync-learn-videos' = 'REPLACE_WITH_APPROVED_SHA256'
}

function Get-DirectoryManifestSha256([string]$Directory) {
  $Root = (Resolve-Path $Directory).Path.TrimEnd('\', '/')
  $Rows = Get-ChildItem -LiteralPath $Root -Recurse -File |
    Sort-Object FullName |
    ForEach-Object {
      $Relative = $_.FullName.Substring($Root.Length).TrimStart('\', '/').Replace('\', '/')
      $Hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      "$Relative`t$Hash"
    }
  $Sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $Bytes = [System.Text.Encoding]::UTF8.GetBytes(($Rows -join "`n"))
    return ([BitConverter]::ToString($Sha.ComputeHash($Bytes))).Replace('-', '').ToLowerInvariant()
  }
  finally { $Sha.Dispose() }
}

foreach ($Function in $Functions) {
  $Head = (git rev-parse HEAD).Trim()
  $Dirty = @(git status --porcelain=v1)
  $ConfigHash = (Get-FileHash -LiteralPath 'backend/supabase/config.toml' -Algorithm SHA256).Hash.ToLowerInvariant()
  $FunctionHash = Get-DirectoryManifestSha256 "backend/supabase/functions/$Function"
  if ($Head -cne $ExpectedHead -or $Dirty.Count -ne 0 -or
      $ConfigHash -cne $ApprovedConfigSha256 -or
      $FunctionHash -cne $ApprovedFunctionSha256[$Function]) {
    throw "HEAD, clean worktree, config or source hash changed before: $Function"
  }
  supabase functions deploy $Function `
    --project-ref $ProjectRef --workdir backend
  if ($LASTEXITCODE -ne 0) { throw "Function deployment failed: $Function" }
  supabase functions list --project-ref $ProjectRef --output-format json
}
```

Create the approval-backed `function-rollout` record, then run the intermediate
gate:

```powershell
./scripts/launch/Invoke-LaunchPreflight.ps1 -Stage PostFunctions -Online
if ($LASTEXITCODE -ne 0) { throw 'Function rollout is not proven; stop before live QA' }
```

At `PreDeploy`, remote function drift is only a warning because the approved
rollout has not happened yet; `function-rollout-readiness` is still mandatory.
At `PostFunctions` and `PostDeploy`, the remote function set must be exact, all
functions must be ACTIVE, and only the Stripe webhook may have `verify_jwt =
false`. Extra remote functions fail the gate.

### Checkpoint D — live authorization and functional proof

Using disposable QA accounts A, B and an outsider—not personal/operator
accounts—verify:

- anonymous public routes; signup/login/reset/logout/session refresh;
- first test, answer persistence, submission and dashboard update;
- profile edit and account switching without stale data;
- A/B conversation and media; outsider and anonymous receive no object/list;
- deleted-peer behavior preserves B's messages and blocks new sends;
- community reports reach the named operator, or community routes/writes are
  truly disabled;
- pricing is free-only and creates no checkout/change-plan request;
- existing subscriber management remains available where applicable;
- Auth, Functions, database, Storage, Realtime and Netlify logs show no P0/P1.

Stop and contain on any cross-user read/write, authentication bypass, paid flow,
unexpected destructive query, checksum drift or sustained 5xx increase.

### Checkpoint E — delete synthetic QA data

Deletion is destructive and applies only to the documented synthetic account.
Record:

```text
QA CLEANUP APPROVED <synthetic user id> <UTC timestamp> <approver>
```

Invoke the production `delete-account` flow as that signed-in QA user. Keep the
access token and public key only in process memory; never place them in evidence
or command history. Accept `202` only as “checkpoint pending”, poll through the
documented retry path, and require eventual completion.

With a read-only SQL session, verify booleans only:

```sql
-- Replace through a psql variable; never commit the UUID or email here.
select not exists (select 1 from auth.users where id = :'qa_user_id') as auth_user_absent;
select not exists (select 1 from public.profiles where id = :'qa_user_id') as profile_absent;
select not exists (select 1 from public.test_attempts where user_id = :'qa_user_id') as attempts_absent;
select not exists (
  select 1
  from public.test_attempt_answers answer_entry
  join public.test_attempts attempt_entry on attempt_entry.id = answer_entry.attempt_id
  where attempt_entry.user_id = :'qa_user_id'
) as answers_absent;
select status = 'completed' as deletion_completed
from public.account_deletion_jobs
where user_id = :'qa_user_id';
```

Compare other participants' conversation/message/media counts to the pre-delete
snapshot and prove they were preserved. Create `qa-cleanup` evidence containing
only booleans and aggregate counts.

## 6. Post-deploy decision

Create `post-deploy-smoke` evidence, then run:

```powershell
./scripts/launch/Invoke-LaunchPreflight.ps1 -Stage PostDeploy -Online
if ($LASTEXITCODE -ne 0) { throw 'Launch remains NO-GO or requires containment' }
```

Observe for at least 30 minutes before declaring technical stability. Recheck
at T+24 hours and T+7 days for errors, abuse reports, capacity, costs,
accessibility and performance. Paid plans remain false until a separate billing
release resolves checkout/deletion concurrency and first-charge compensation.

## 7. Rollback boundaries

- Before 0050 commits: return to the previous Netlify deploy and stop.
- If 0050 errors: `ON_ERROR_STOP` plus its transaction should roll back; prove
  postconditions before doing anything else.
- If abuse-controls fails after 0050 commits: retain the secured 0050 state,
  stop promotion and apply only a new timestamped, reviewed, CI-tested and
  rehearsed additive forward-fix migration; never replay the historical chain.
- After 0050 commits: never roll back to a frontend that requires public
  message media. Use only the pinned compatible target from
  `rollback-rehearsal`.
- After function deployment: redeploy a previous version only if it preserves
  JWT/auth checks and the post-0050 database contract. Otherwise forward-fix.
- Restore production only through a declared incident after evaluating the
  restore point, downtime and writes that would be lost/reconciled.
- Database rollback is never an interactive SQL session: do not hand-run
  `DROP`, reverse DDL or copied statements. A database change is delivered only
  as a new source-controlled forward-fix migration through the same gates.
- Preserve all timestamps, checksums and redacted reports. Do not rewrite
  evidence after the fact; create a new record.
