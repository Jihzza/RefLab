#requires -Version 5.1

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path (Join-Path $PSScriptRoot '..') '..'))
$preflightPath = Join-Path $PSScriptRoot 'Invoke-LaunchPreflight.ps1'
$corePath = Join-Path $PSScriptRoot 'LaunchPreflight.Core.ps1'
$exampleInputsPath = Join-Path $repositoryRoot 'ops/launch/launch-inputs.example.json'
$exampleEvidencePath = Join-Path $repositoryRoot 'ops/launch/evidence-record.example.json'
$legalEvidencePath = Join-Path $repositoryRoot 'ops/launch/legal-publication.example.json'
$backupManifestPath = Join-Path $repositoryRoot 'ops/launch/backup-manifest.example.json'
$restoreEvidencePath = Join-Path $repositoryRoot 'ops/launch/restore-rehearsal.example.json'
$runbookPath = Join-Path $repositoryRoot 'ops/launch/README.md'

function Assert-True {
    param(
        [Parameter(Mandatory = $true)][bool]$Condition,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if (-not $Condition) {
        throw "Launch tooling test failed: $Message"
    }
}

foreach ($scriptPath in @($corePath, $preflightPath, $PSCommandPath)) {
    $tokens = $null
    $errors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile(
        $scriptPath,
        [ref]$tokens,
        [ref]$errors
    )
    Assert-True ($errors.Count -eq 0) "PowerShell syntax errors in $([System.IO.Path]::GetFileName($scriptPath))."
}

foreach ($jsonPath in @(
    $exampleInputsPath,
    $exampleEvidencePath,
    $legalEvidencePath,
    $backupManifestPath,
    $restoreEvidencePath
)) {
    $document = [System.IO.File]::ReadAllText($jsonPath) | ConvertFrom-Json
    Assert-True ($document.schemaVersion -eq 1) "Unexpected schemaVersion in $([System.IO.Path]::GetFileName($jsonPath))."
}

. $corePath

# Exercise the same pure check/function contracts used by the production
# preflight. Complete evidence can pass without a network fixture or a hidden
# bypass in the production script.
$requiredChecks = @('Backend Static CI / edge-functions', 'Frontend CI / frontend', 'Netlify Preview')
$passingChecks = @(
    [pscustomobject]@{ name = 'Backend Static CI / edge-functions'; bucket = 'pass' },
    [pscustomobject]@{ name = 'Frontend CI / frontend'; bucket = 'pass' },
    [pscustomobject]@{ name = 'Netlify Preview'; bucket = 'pass' },
    [pscustomobject]@{ name = 'Optional informational check'; bucket = 'skipping' }
)
$passingGithub = Test-GithubCheckContract $passingChecks $requiredChecks 'Netlify Preview'
Assert-True $passingGithub.passed 'A complete exact GitHub check contract did not pass.'
$skippedRequiredChecks = @($passingChecks | ForEach-Object {
    if ($_.name -eq 'Frontend CI / frontend') {
        [pscustomobject]@{ name = $_.name; bucket = 'skipping' }
    }
    else { $_ }
})
Assert-True (-not (Test-GithubCheckContract $skippedRequiredChecks $requiredChecks 'Netlify Preview').passed) `
    'A skipped required GitHub gate was accepted.'

$expectedFunctions = @{ 'stripe-webhook' = $false; 'delete-account' = $true }
$passingFunctions = @(
    [pscustomobject]@{ slug = 'stripe-webhook'; status = 'ACTIVE'; verify_jwt = $false },
    [pscustomobject]@{ slug = 'delete-account'; status = 'ACTIVE'; verify_jwt = $true }
)
Assert-True (Test-RemoteFunctionContract $expectedFunctions $passingFunctions).passed `
    'A complete exact Edge Function contract did not pass.'
$unexpectedFunctions = @($passingFunctions) +
    [pscustomobject]@{ slug = 'unexpected'; status = 'ACTIVE'; verify_jwt = $true }
Assert-True (-not (Test-RemoteFunctionContract $expectedFunctions $unexpectedFunctions).passed) `
    'An unexpected remote Edge Function was accepted.'

foreach ($secretFixture in @(
    '{"url":"https://user:password@example.com/path"}',
    '{"url":"https://embedded-user@example.com/path"}',
    '{"value":"re_1234567890abcdefghijkl"}',
    '{"value":"whsec_1234567890abcdefghijkl"}',
    '{"value":"sbp_1234567890abcdefghijkl"}',
    '{"value":"GOCSPX-1234567890abcdefghijkl"}',
    '{"value":"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.signature12345678"}'
)) {
    Assert-True (Test-LaunchJsonContainsSensitiveMaterial $secretFixture) `
        'An expanded secret-scanner fixture was not rejected.'
}
Assert-True (Test-LaunchUriContainsUserInfo 'https://user:secret@example.com/repo.git') `
    'URI userinfo was not detected.'

$pathGuardRoot = Join-Path ([System.IO.Path]::GetTempPath()) 'reflab-path-guard-root'
Assert-True (Test-LaunchPathInsideRoot $pathGuardRoot $pathGuardRoot) 'The repository root itself was not protected.'
Assert-True (Test-LaunchPathInsideRoot (Join-Path $pathGuardRoot 'artifact.json') $pathGuardRoot) `
    'A repository child path was not detected.'
Assert-True (-not (Test-LaunchPathInsideRoot ($pathGuardRoot + '-sibling\artifact.json') $pathGuardRoot)) `
    'A Windows prefix-collision sibling was treated as inside the repository.'

$runbookSource = [System.IO.File]::ReadAllText($runbookPath)
Assert-True ($runbookSource.Contains('./scripts/launch/Test-LaunchTooling.ps1')) `
    'The local CI gate is missing from the runbook.'
Assert-True ($runbookSource.Contains('supabase db dump --linked --workdir backend')) `
    'The runbook does not use linked database dumps.'
Assert-True (-not ($runbookSource -match '(?im)^\s*supabase\s+db\s+dump\b[^\r\n]*--db-url')) `
    'The runbook passes a database URL through argv.'
Assert-True (-not $runbookSource.Contains('REFLAB_PRODUCTION_DB_URL')) `
    'The runbook still relies on a production database URL argument.'
Assert-True (-not ($runbookSource -match '(?im)^\s*supabase\s+db\s+dump\b[^\r\n]*--dry-run')) `
    'The runbook exposes linked dump credentials via --dry-run.'
Assert-True ($runbookSource.Contains("PGSSLMODE -cne 'verify-full'")) `
    'The runbook does not enforce TLS verify-full.'
Assert-True ($runbookSource.Contains('begin transaction read only')) `
    'The runbook lacks a read-only identity query before SQL.'
Assert-True (-not ($runbookSource -match '(?i)PGHOST\s+-notmatch')) `
    'The runbook still accepts a database hostname substring.'
Assert-True (-not ($runbookSource -match '(?im)^\s*psql\b[^\r\n]*--dbname')) `
    'The runbook passes a database target through psql argv.'
Assert-True (-not ($runbookSource -match '(?im)^\s*DROP\s+')) `
    'The runbook contains manual DROP rollback SQL.'
Assert-True ($runbookSource.Contains('20260722_0050_launch_security_hardening.sql') -and
    $runbookSource.Contains('20260723000000_launch_abuse_controls.sql')) `
    'The runbook does not name both ordered launch migrations.'

# This file is deliberately incapable of executing release mutations. Keep the
# check textual and strict so adding a new command requires conscious review.
$preflightSource = [System.IO.File]::ReadAllText($preflightPath)
$coreSource = [System.IO.File]::ReadAllText($corePath)
$guardedSource = $preflightSource + "`n" + $coreSource
$forbiddenOperations = @(
    '(?im)\bsupabase\s+db\s+(?:push|reset)\b',
    '(?im)\bsupabase\s+migration\s+repair\b',
    '(?im)\bsupabase\s+functions\s+deploy\b',
    '(?im)\bsupabase\s+secrets\s+set\b',
    '(?im)\bnetlify\s+deploy\b',
    '(?im)\bnetlify\s+env:set\b',
    '(?im)\bgh\s+pr\s+merge\b',
    '(?im)\bgit\s+push\b'
)
foreach ($pattern in $forbiddenOperations) {
    Assert-True (-not ($guardedSource -match $pattern)) "A forbidden mutating command was added to the preflight."
}
Assert-True ($preflightSource.Contains('$allowed = switch ($Command.ToLowerInvariant())')) `
    'The external-command read-only allow-list is missing.'
Assert-True (([regex]::Matches($guardedSource, [regex]::Escape('& $Command @Arguments'))).Count -eq 1) `
    'External process invocation must remain centralized in the allow-listed wrapper.'
Assert-True ($preflightSource.Contains("[ValidateSet('PreDeploy', 'PostFunctions', 'PostDeploy')]")) `
    'The PostFunctions stage is missing.'
Assert-True ($preflightSource.Contains("Get-ObjectValue `$record 'approvalReference'")) `
    'Common evidence does not require an approval reference.'
Assert-True ($preflightSource.Contains('Test-ExternalArtifactSet')) `
    'Common evidence does not require an external hashed artifact.'

$pythonCommand = if ($null -ne (Get-Command 'python' -ErrorAction SilentlyContinue)) { 'python' } else { 'python3' }
$launchContentJson = & $pythonCommand (Join-Path $repositoryRoot '.github/scripts/check_release_config.py') '--launch-content-json'
Assert-True ($LASTEXITCODE -eq 0) 'Mechanical launch-content inspection failed to execute.'
$launchContent = $launchContentJson | ConvertFrom-Json
foreach ($checkName in @(
    'policyTextContainsNoPlaceholderMarker',
    'temporaryPrivacyAddressAbsent',
    'signupTermsLinkPresent',
    'signupPrivacyLinkPresent'
)) {
    Assert-True ($null -ne $launchContent.checks.PSObject.Properties[$checkName]) `
        "Mechanical launch-content check is missing: $checkName."
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("reflab-launch-tooling-{0}" -f [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $temporaryRoot
$temporaryEvidence = Join-Path $temporaryRoot 'offline-evidence.json'

try {
    $hostExecutable = (Get-Process -Id $PID).Path
    $argumentList = @('-NoProfile')
    if ($env:OS -eq 'Windows_NT') {
        $argumentList += @('-ExecutionPolicy', 'Bypass')
    }
    $argumentList += @(
        '-File', $preflightPath,
        '-RepositoryRoot', $repositoryRoot,
        '-InputsPath', $exampleInputsPath,
        '-EvidencePath', $temporaryEvidence
    )
    & $hostExecutable @argumentList
    $childExitCode = $LASTEXITCODE

    Assert-True ($childExitCode -ne 0) 'Placeholder inputs unexpectedly returned a successful exit code.'
    Assert-True (Test-Path -LiteralPath $temporaryEvidence -PathType Leaf) 'Offline preflight did not create evidence.'

    $rawEvidence = [System.IO.File]::ReadAllText($temporaryEvidence)
    $report = $rawEvidence | ConvertFrom-Json
    Assert-True ($report.verdict -eq 'NO-GO') 'Placeholder inputs must produce NO-GO.'
    Assert-True ($report.mode -eq 'offline-dry-run') 'Default preflight mode must remain offline-dry-run.'
    Assert-True ($report.externalMutationsPerformed -eq $false) 'Report claims an external mutation.'
    Assert-True ($report.productionDataRead -eq $false) 'Offline preflight claims production data was read.'
    Assert-True ($report.secretsPersisted -eq $false) 'Report claims secrets were persisted.'
    Assert-True ($report.redaction.approvalReferencesIncluded -eq $false) `
        'Report claims approval references were persisted.'
    Assert-True ($report.redaction.originUserInfoIncluded -eq $false) `
        'Report claims Git origin userinfo was persisted.'
    Assert-True ($report.summary.notRun -ge 1) 'Offline mode must not silently pass online gates.'
    Assert-True ($report.repository.migration0050Sha256 -match '^[0-9a-f]{64}$') `
        '0050 fingerprint is missing from evidence.'
    Assert-True ($report.repository.abuseControlsMigrationSha256 -match '^[0-9a-f]{64}$') `
        'Abuse-controls fingerprint is missing from evidence.'
    $migrationOrderGate = @($report.gates | Where-Object { $_.id -eq 'database.migration-order' })
    Assert-True ($migrationOrderGate.Count -eq 1 -and $migrationOrderGate[0].status -eq 'pass') `
        'Preflight evidence does not fail closed on the 0050 -> abuse-controls migration order.'

    $redactedFieldNames = @(
        'controllerName',
        'registeredAddress',
        'privacyEmail',
        'supportEmail',
        'moderationOwner',
        'moderationContact'
    )
    foreach ($fieldName in $redactedFieldNames) {
        Assert-True (-not $rawEvidence.Contains($fieldName)) "Evidence leaked private input field $fieldName."
    }
    Assert-True (-not (Test-LaunchJsonContainsSensitiveMaterial $rawEvidence)) `
        'Evidence contains a secret-like value.'
}
finally {
    $safeTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\', '/') +
        [System.IO.Path]::DirectorySeparatorChar
    $resolvedTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
    if ($resolvedTemporaryRoot.StartsWith($safeTempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        if (Test-Path -LiteralPath $temporaryEvidence -PathType Leaf) {
            Remove-Item -LiteralPath $temporaryEvidence -Force
        }
        if (Test-Path -LiteralPath $temporaryRoot -PathType Container) {
            Remove-Item -LiteralPath $temporaryRoot -Force
        }
    }
}

Write-Host 'Launch preflight syntax, redaction and fail-closed tests passed.'
$global:LASTEXITCODE = 0
