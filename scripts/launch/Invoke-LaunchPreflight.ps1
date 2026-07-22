#requires -Version 5.1

<#
.SYNOPSIS
Creates a redacted, fail-closed RefLab launch evidence report.

.DESCRIPTION
The default mode performs local checks only. Pass -Online to add read-only
GitHub, Netlify and Supabase queries. This script has no deployment, migration,
credential-management or production-data mutation path.

Exit code 0 means every required gate passed. Exit code 2 means NO-GO.
#>

[CmdletBinding()]
param(
    [ValidateSet('PreDeploy', 'PostFunctions', 'PostDeploy')]
    [string]$Stage = 'PreDeploy',

    [switch]$Online,

    [string]$RepositoryRoot,

    [string]$InputsPath,

    [string]$EvidencePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
    $RepositoryRoot = Join-Path (Join-Path $PSScriptRoot '..') '..'
}
$RepositoryRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)

$corePath = Join-Path $PSScriptRoot 'LaunchPreflight.Core.ps1'
if (-not (Test-Path -LiteralPath $corePath -PathType Leaf)) {
    throw 'Launch preflight core is missing.'
}
. $corePath

if ([string]::IsNullOrWhiteSpace($InputsPath)) {
    $InputsPath = Join-Path $RepositoryRoot 'ops/launch/launch-inputs.json'
}
$InputsPath = [System.IO.Path]::GetFullPath($InputsPath)

if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
    $stamp = [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ')
    $EvidencePath = Join-Path $RepositoryRoot "ops/launch/evidence/preflight-$stamp.json"
}
$EvidencePath = [System.IO.Path]::GetFullPath($EvidencePath)

$script:Gates = @()

function Get-ObjectValue {
    param(
        [AllowNull()]$Object,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $current = $Object
    foreach ($part in $Path.Split('.')) {
        if ($null -eq $current) {
            return $null
        }
        $property = $current.PSObject.Properties[$part]
        if ($null -eq $property) {
            return $null
        }
        $current = $property.Value
    }
    return $current
}

function Add-Gate {
    param(
        [Parameter(Mandatory = $true)][string]$Id,
        [Parameter(Mandatory = $true)][string]$Category,
        [ValidateSet('pass', 'fail', 'warn', 'not-run')]
        [Parameter(Mandatory = $true)][string]$Status,
        [Parameter(Mandatory = $true)][string]$Message,
        [hashtable]$Details = @{}
    )

    $safeDetails = [ordered]@{}
    foreach ($key in ($Details.Keys | Sort-Object)) {
        $safeDetails[$key] = $Details[$key]
    }
    $script:Gates += [pscustomobject][ordered]@{
        id       = $Id
        category = $Category
        status   = $Status
        message  = $Message
        details  = [pscustomobject]$safeDetails
    }
}

function Test-MeaningfulValue {
    param([AllowNull()]$Value)

    if ($null -eq $Value) {
        return $false
    }
    $text = ([string]$Value).Trim()
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $false
    }
    return $text -notmatch '(?i)(REPLACE_|REPLACE ME|REPLACE_WITH|CHANGE_ME|CHANGEME|\bTODO\b|\bTBD\b|UNCONFIRMED|EXAMPLE\.INVALID)'
}

function Test-EmailValue {
    param([AllowNull()]$Value)

    if (-not (Test-MeaningfulValue $Value)) {
        return $false
    }
    try {
        $parsed = New-Object System.Net.Mail.MailAddress(([string]$Value).Trim())
        return ($parsed.Address -eq ([string]$Value).Trim()) -and
            ($parsed.Host -notmatch '(?i)^(example\.(com|org|net)|invalid)$')
    }
    catch {
        return $false
    }
}

function ConvertTo-UtcTimestamp {
    param([AllowNull()]$Value)

    if (-not (Test-MeaningfulValue $Value)) {
        return $null
    }
    $parsed = [DateTimeOffset]::MinValue
    $styles = [System.Globalization.DateTimeStyles]::AssumeUniversal -bor
        [System.Globalization.DateTimeStyles]::AdjustToUniversal
    $ok = [DateTimeOffset]::TryParse(
        [string]$Value,
        [System.Globalization.CultureInfo]::InvariantCulture,
        $styles,
        [ref]$parsed
    )
    if (-not $ok) {
        return $null
    }
    return $parsed.ToUniversalTime()
}

function Test-ApprovalTimestamp {
    param([AllowNull()]$Value)

    $timestamp = ConvertTo-UtcTimestamp $Value
    return $null -ne $timestamp -and
        $timestamp -le [DateTimeOffset]::UtcNow.AddMinutes(15)
}

function Get-StringSha256 {
    param([Parameter(Mandatory = $true)][string]$Value)

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
        return ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
}

function Resolve-ConfiguredPath {
    param(
        [AllowNull()]$Value,
        [Parameter(Mandatory = $true)][string]$BaseDirectory
    )

    if (-not (Test-MeaningfulValue $Value)) {
        return $null
    }
    $candidate = [string]$Value
    if (-not [System.IO.Path]::IsPathRooted($candidate)) {
        $candidate = Join-Path $BaseDirectory $candidate
    }
    return [System.IO.Path]::GetFullPath($candidate)
}

function Test-PathInsideRepository {
    param([Parameter(Mandatory = $true)][string]$Path)

    return Test-LaunchPathInsideRoot $Path $RepositoryRoot
}

function Test-PathHasReparsePoint {
    param([Parameter(Mandatory = $true)][string]$Path)

    return Test-LaunchPathHasReparsePoint $Path
}

function Test-JsonContainsSensitiveMaterial {
    param([Parameter(Mandatory = $true)][string]$RawJson)

    return Test-LaunchJsonContainsSensitiveMaterial $RawJson
}

function Read-JsonDocument {
    param([Parameter(Mandatory = $true)][string]$Path)

    $raw = [System.IO.File]::ReadAllText($Path)
    if (Test-JsonContainsSensitiveMaterial $raw) {
        return [pscustomobject]@{
            ok        = $false
            sensitive = $true
            data      = $null
            raw       = $null
        }
    }
    try {
        return [pscustomobject]@{
            ok        = $true
            sensitive = $false
            data      = ($raw | ConvertFrom-Json)
            raw       = $raw
        }
    }
    catch {
        return [pscustomobject]@{
            ok        = $false
            sensitive = $false
            data      = $null
            raw       = $null
        }
    }
}

function Invoke-ReadOnlyCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$WorkingDirectory = $RepositoryRoot
    )

    $signature = ($Arguments -join ' ')
    $allowed = switch ($Command.ToLowerInvariant()) {
        'git' {
            $signature -in @(
                'rev-parse --show-toplevel',
                'rev-parse HEAD',
                'branch --show-current',
                'remote get-url origin',
                'status --porcelain=v1',
                'diff --check'
            )
            break
        }
        'python' {
            $signature -in @(
                '.github/scripts/check_release_config.py',
                '.github/scripts/check_release_config.py --launch-content-json'
            )
            break
        }
        'python3' {
            $signature -in @(
                '.github/scripts/check_release_config.py',
                '.github/scripts/check_release_config.py --launch-content-json'
            )
            break
        }
        'gh' {
            $signature -match '^pr (?:view|checks) [0-9]+ --repo [A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+ --json [A-Za-z0-9,]+$'
            break
        }
        'netlify' {
            $signature -eq 'status --json' -or
                $signature -eq 'env:get VITE_PAID_PLANS_ENABLED --context production' -or
                $signature -eq 'env:get VITE_GOOGLE_OAUTH_ENABLED --context production' -or
                $signature -eq 'env:get VITE_CAPTCHA_ENABLED --context production'
            break
        }
        'supabase' {
            $signature -eq 'projects list --output-format json' -or
                $signature -match '^(?:backups|secrets|functions) list --project-ref [a-z]{20} --output-format json$'
            break
        }
        default { $false }
    }

    if (-not $allowed) {
        return [pscustomobject]@{ ok = $false; exitCode = 126; output = ''; available = $false }
    }

    if ($null -eq (Get-Command $Command -ErrorAction SilentlyContinue)) {
        return [pscustomobject]@{ ok = $false; exitCode = 127; output = ''; available = $false }
    }

    $oldLocation = Get-Location
    $oldErrorActionPreference = $ErrorActionPreference
    try {
        Set-Location $WorkingDirectory
        # Windows PowerShell 5.1 can promote benign native stderr warnings to
        # ErrorRecord objects when the script-wide preference is Stop. The
        # native exit code remains the authority for these read-only commands.
        $ErrorActionPreference = 'Continue'
        $output = @(& $Command @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
        $text = ($output | ForEach-Object { [string]$_ }) -join "`n"
        return [pscustomobject]@{
            ok        = ($exitCode -eq 0)
            exitCode  = $exitCode
            output    = $text.Trim()
            available = $true
        }
    }
    catch {
        return [pscustomobject]@{ ok = $false; exitCode = 1; output = ''; available = $true }
    }
    finally {
        $ErrorActionPreference = $oldErrorActionPreference
        Set-Location $oldLocation
    }
}

function ConvertFrom-CommandJson {
    param([Parameter(Mandatory = $true)]$CommandResult)

    if ([string]::IsNullOrWhiteSpace($CommandResult.output)) {
        return $null
    }
    try {
        return $CommandResult.output | ConvertFrom-Json
    }
    catch {
        $startObject = $CommandResult.output.IndexOf('{')
        $startArray = $CommandResult.output.IndexOf('[')
        $starts = @($startObject, $startArray) | Where-Object { $_ -ge 0 } | Sort-Object
        if (@($starts).Count -eq 0) {
            return $null
        }
        try {
            return $CommandResult.output.Substring($starts[0]) | ConvertFrom-Json
        }
        catch {
            return $null
        }
    }
}

function Test-BooleanChecks {
    param(
        [AllowNull()]$Checks,
        [Parameter(Mandatory = $true)][string[]]$RequiredNames
    )

    $missingOrFalse = @()
    foreach ($name in $RequiredNames) {
        $value = Get-ObjectValue $Checks $name
        if (($value -isnot [bool]) -or (-not $value)) {
            $missingOrFalse += $name
        }
    }
    return @($missingOrFalse)
}

function Test-ExternalArtifactSet {
    param(
        [AllowNull()]$Artifacts,
        [Parameter(Mandatory = $true)][string]$BaseDirectory
    )

    $entries = @($Artifacts)
    $issues = @()
    if ($entries.Count -lt 1) {
        $issues += 'artifact-missing'
    }
    foreach ($artifact in $entries) {
        $kind = Get-ObjectValue $artifact 'kind'
        $path = Resolve-ConfiguredPath (Get-ObjectValue $artifact 'path') $BaseDirectory
        $sha256 = [string](Get-ObjectValue $artifact 'sha256')
        if (-not (Test-MeaningfulValue $kind)) {
            $issues += 'artifact-kind'
        }
        if ($null -eq $path -or -not (Test-Path -LiteralPath $path -PathType Leaf) -or
            (Test-PathInsideRepository $path) -or (Test-PathHasReparsePoint $path)) {
            $issues += 'artifact-path'
            continue
        }
        if ($sha256 -notmatch '^[0-9a-fA-F]{64}$') {
            $issues += 'artifact-sha256'
            continue
        }
        $item = Get-Item -LiteralPath $path
        if ($item.Length -le 0) {
            $issues += 'artifact-empty'
            continue
        }
        $actual = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $sha256.ToLowerInvariant()) {
            $issues += 'artifact-hash'
        }
    }
    return [pscustomobject]@{
        passed        = ($issues.Count -eq 0)
        artifactCount = $entries.Count
        issueCount    = $issues.Count
    }
}

function Test-CommonEvidenceRecord {
    param(
        [Parameter(Mandatory = $true)][string]$InputProperty,
        [Parameter(Mandatory = $true)][string]$ExpectedKind,
        [Parameter(Mandatory = $true)][int]$MaximumAgeHours,
        [Parameter(Mandatory = $true)][string[]]$RequiredChecks,
        [bool]$RequireCommit = $true,
        [bool]$RequireProject = $true,
        [bool]$RequireMigrationHash = $false
    )

    $configured = Get-ObjectValue $inputs "evidence.$InputProperty"
    $path = Resolve-ConfiguredPath $configured $inputsDirectory
    $id = "evidence.$ExpectedKind"
    if ($null -eq $path -or -not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Add-Gate $id 'evidence' 'fail' "Missing $ExpectedKind evidence record." @{ kind = $ExpectedKind }
        return $null
    }
    if (Test-PathHasReparsePoint $path) {
        Add-Gate $id 'evidence' 'fail' "$ExpectedKind evidence cannot traverse a reparse point." @{
            file = [System.IO.Path]::GetFileName($path)
            kind = $ExpectedKind
        }
        return $null
    }

    $document = Read-JsonDocument $path
    if (-not $document.ok) {
        $message = if ($document.sensitive) {
            "$ExpectedKind evidence contains a forbidden secret-like value or key."
        }
        else {
            "$ExpectedKind evidence is not valid JSON."
        }
        Add-Gate $id 'evidence' 'fail' $message @{ file = [System.IO.Path]::GetFileName($path) }
        return $null
    }

    $record = $document.data
    $issues = @()
    if ((Get-ObjectValue $record 'schemaVersion') -ne 1) { $issues += 'schema-version' }
    if ((Get-ObjectValue $record 'kind') -ne $ExpectedKind) { $issues += 'kind' }
    if ((Get-ObjectValue $record 'passed') -isnot [bool] -or -not (Get-ObjectValue $record 'passed')) { $issues += 'passed' }
    if (-not (Test-MeaningfulValue (Get-ObjectValue $record 'approvedBy'))) { $issues += 'approval' }
    if (-not (Test-MeaningfulValue (Get-ObjectValue $record 'approvalReference'))) { $issues += 'approval-reference' }

    $artifactResult = Test-ExternalArtifactSet (Get-ObjectValue $record 'artifacts') (Split-Path -Parent $path)
    if (-not $artifactResult.passed) { $issues += 'external-artifact' }

    $capturedAt = ConvertTo-UtcTimestamp (Get-ObjectValue $record 'capturedAtUtc')
    $ageHours = $null
    if ($null -eq $capturedAt) {
        $issues += 'timestamp'
    }
    else {
        $ageHours = [Math]::Round(([DateTimeOffset]::UtcNow - $capturedAt).TotalHours, 2)
        if ($ageHours -lt -0.25 -or $ageHours -gt $MaximumAgeHours) { $issues += 'stale' }
    }

    if ($RequireCommit -and (Get-ObjectValue $record 'releaseCommit') -ne $expectedCommit) {
        $issues += 'commit'
    }
    if ($RequireProject -and (Get-ObjectValue $record 'productionProjectRef') -ne $supabaseProjectRef) {
        $issues += 'project'
    }

    $failedChecks = Test-BooleanChecks (Get-ObjectValue $record 'checks') $RequiredChecks
    if ($failedChecks.Count -gt 0) { $issues += 'checks' }
    if ($RequireMigrationHash) {
        if ((Get-ObjectValue $record 'checks.migration0050Sha256') -ne $migrationSha256) {
            $issues += 'migration-0050-hash'
        }
        if ((Get-ObjectValue $record 'checks.abuseControlsMigrationSha256') -ne $abuseMigrationSha256) {
            $issues += 'migration-abuse-controls-hash'
        }
    }

    if ($issues.Count -gt 0) {
        Add-Gate $id 'evidence' 'fail' "$ExpectedKind evidence is incomplete, stale or does not match this release." @{
            artifactCount = $artifactResult.artifactCount
            file       = [System.IO.Path]::GetFileName($path)
            issueCount = $issues.Count
            kind       = $ExpectedKind
        }
        return $null
    }

    Add-Gate $id 'evidence' 'pass' "$ExpectedKind evidence is current, approval-backed and linked to an external hashed artifact." @{
        ageHours  = $ageHours
        artifactCount = $artifactResult.artifactCount
        checkCount = $RequiredChecks.Count
        file      = [System.IO.Path]::GetFileName($path)
        kind      = $ExpectedKind
    }
    return $record
}

if (-not (Test-Path -LiteralPath $RepositoryRoot -PathType Container)) {
    throw "Repository root does not exist: $RepositoryRoot"
}
if (Test-Path -LiteralPath $EvidencePath) {
    throw "Evidence files are immutable; choose a new path: $EvidencePath"
}

$inputs = [pscustomobject]@{}
$inputsDirectory = Split-Path -Parent $InputsPath
if (-not (Test-Path -LiteralPath $InputsPath -PathType Leaf)) {
    Add-Gate 'inputs.file' 'inputs' 'fail' 'Private launch inputs file is missing.' @{
        expectedFile = [System.IO.Path]::GetFileName($InputsPath)
    }
}
else {
    $inputDocument = Read-JsonDocument $InputsPath
    if (-not $inputDocument.ok) {
        $message = if ($inputDocument.sensitive) {
            'Launch inputs contain a forbidden secret-like value or key.'
        }
        else {
            'Launch inputs are not valid JSON.'
        }
        Add-Gate 'inputs.file' 'inputs' 'fail' $message @{
            file = [System.IO.Path]::GetFileName($InputsPath)
        }
    }
    else {
        $inputs = $inputDocument.data
        $schemaOk = (Get-ObjectValue $inputs 'schemaVersion') -eq 1
        Add-Gate 'inputs.file' 'inputs' $(if ($schemaOk) { 'pass' } else { 'fail' }) `
            $(if ($schemaOk) { 'Launch inputs loaded.' } else { 'Launch inputs schemaVersion must be 1.' }) @{
                file = [System.IO.Path]::GetFileName($InputsPath)
            }
    }
}

$expectedCommit = [string](Get-ObjectValue $inputs 'release.expectedCommit')
$supabaseProjectRef = [string](Get-ObjectValue $inputs 'release.supabaseProjectRef')
$migrationFileName = '20260722_0050_launch_security_hardening.sql'
$abuseMigrationFileName = '20260723000000_launch_abuse_controls.sql'
$migrationPath = Join-Path $RepositoryRoot "backend/supabase/migrations/$migrationFileName"
$migrationSha256 = if (Test-Path -LiteralPath $migrationPath -PathType Leaf) {
    (Get-FileHash -LiteralPath $migrationPath -Algorithm SHA256).Hash.ToLowerInvariant()
}
else {
    ''
}
$abuseMigrationPath = Join-Path $RepositoryRoot "backend/supabase/migrations/$abuseMigrationFileName"
$abuseMigrationSha256 = if (Test-Path -LiteralPath $abuseMigrationPath -PathType Leaf) {
    (Get-FileHash -LiteralPath $abuseMigrationPath -Algorithm SHA256).Hash.ToLowerInvariant()
}
else {
    ''
}

# Local immutable release identity and safety checks.
$gitRoot = Invoke-ReadOnlyCommand 'git' @('rev-parse', '--show-toplevel')
$gitHead = Invoke-ReadOnlyCommand 'git' @('rev-parse', 'HEAD')
$gitBranch = Invoke-ReadOnlyCommand 'git' @('branch', '--show-current')
$gitRemote = Invoke-ReadOnlyCommand 'git' @('remote', 'get-url', 'origin')
$gitStatus = Invoke-ReadOnlyCommand 'git' @('status', '--porcelain=v1')
$gitDiffCheck = Invoke-ReadOnlyCommand 'git' @('diff', '--check')

$canonicalRoot = $gitRoot.ok -and
    ([System.IO.Path]::GetFullPath($gitRoot.output) -eq $RepositoryRoot)
Add-Gate 'git.canonical-root' 'git' $(if ($canonicalRoot) { 'pass' } else { 'fail' }) `
    $(if ($canonicalRoot) { 'Canonical checkout confirmed.' } else { 'Current checkout is not the configured repository root.' }) @{}

$expectedRemote = [string](Get-ObjectValue $inputs 'release.expectedRemoteUrl')
$remoteContainsUserInfo = $gitRemote.ok -and (Test-LaunchUriContainsUserInfo $gitRemote.output)
$safeRemoteUrl = if ($gitRemote.ok -and -not $remoteContainsUserInfo) { $gitRemote.output } else { '' }
$remoteOk = $gitRemote.ok -and -not $remoteContainsUserInfo -and
    (Test-MeaningfulValue $expectedRemote) -and ($gitRemote.output -eq $expectedRemote)
Add-Gate 'git.remote' 'git' $(if ($remoteOk) { 'pass' } else { 'fail' }) `
    $(if ($remoteOk) { 'Git origin matches the approved repository and contains no URI userinfo.' } else { 'Git origin does not match the approved repository or contains forbidden URI userinfo.' }) @{}

$expectedBranch = [string](Get-ObjectValue $inputs 'release.expectedBranch')
$branchOk = $gitBranch.ok -and (Test-MeaningfulValue $expectedBranch) -and ($gitBranch.output -eq $expectedBranch)
Add-Gate 'git.branch' 'git' $(if ($branchOk) { 'pass' } else { 'fail' }) `
    $(if ($branchOk) { 'Release branch matches.' } else { 'Release branch does not match launch inputs.' }) @{}

$commitOk = $gitHead.ok -and ($expectedCommit -match '^[0-9a-fA-F]{40}$') -and
    ($gitHead.output -eq $expectedCommit)
Add-Gate 'git.commit' 'git' $(if ($commitOk) { 'pass' } else { 'fail' }) `
    $(if ($commitOk) { 'Immutable release commit matches.' } else { 'Full immutable release commit is missing or does not match HEAD.' }) @{
        actualCommit = if ($gitHead.ok) { $gitHead.output } else { '' }
    }

$cleanOk = $gitStatus.ok -and [string]::IsNullOrWhiteSpace($gitStatus.output)
Add-Gate 'git.clean' 'git' $(if ($cleanOk) { 'pass' } else { 'fail' }) `
    $(if ($cleanOk) { 'Worktree is clean.' } else { 'Worktree must be clean before launch.' }) @{}

Add-Gate 'git.diff-check' 'git' $(if ($gitDiffCheck.ok) { 'pass' } else { 'fail' }) `
    $(if ($gitDiffCheck.ok) { 'Git whitespace validation passed.' } else { 'Git whitespace validation failed.' }) @{
        exitCode = $gitDiffCheck.exitCode
    }

$migrationExists = -not [string]::IsNullOrWhiteSpace($migrationSha256)
Add-Gate 'database.migration-0050' 'database' $(if ($migrationExists) { 'pass' } else { 'fail' }) `
    $(if ($migrationExists) { 'Isolated migration 0050 is present and fingerprinted.' } else { 'Isolated migration 0050 is missing.' }) @{
        sha256 = $migrationSha256
    }

$abuseMigrationExists = -not [string]::IsNullOrWhiteSpace($abuseMigrationSha256)
Add-Gate 'database.migration-abuse-controls' 'database' $(if ($abuseMigrationExists) { 'pass' } else { 'fail' }) `
    $(if ($abuseMigrationExists) { 'Ordered abuse-controls migration is present and fingerprinted.' } else { 'Ordered abuse-controls migration is missing.' }) @{
        afterMigration = $migrationFileName
        migrationFile  = $abuseMigrationFileName
        sha256         = $abuseMigrationSha256
    }

$migrationOrderOk = [string]::CompareOrdinal($migrationFileName, $abuseMigrationFileName) -lt 0 -and
    [int64]($migrationFileName.Split('_')[0]) -lt [int64]($abuseMigrationFileName.Split('_')[0])
Add-Gate 'database.migration-order' 'database' $(if ($migrationOrderOk) { 'pass' } else { 'fail' }) `
    $(if ($migrationOrderOk) { '0050 sorts before the unique dependent abuse-controls version.' } else { 'Migration order is inverse or the dependent Supabase version is not unique and monotonic.' }) @{
        first  = $migrationFileName
        second = $abuseMigrationFileName
    }

$pythonCommand = if ($null -ne (Get-Command 'python' -ErrorAction SilentlyContinue)) { 'python' } else { 'python3' }
$releaseChecker = Invoke-ReadOnlyCommand $pythonCommand @('.github/scripts/check_release_config.py')
Add-Gate 'local.release-checker' 'local' $(if ($releaseChecker.ok) { 'pass' } else { 'fail' }) `
    $(if ($releaseChecker.ok) { 'Release configuration checker passed.' } else { 'Release configuration checker failed or Python is unavailable.' }) @{}

$launchContentResult = Invoke-ReadOnlyCommand $pythonCommand @(
    '.github/scripts/check_release_config.py', '--launch-content-json'
)
$launchContent = ConvertFrom-CommandJson $launchContentResult
$launchContentOk = $launchContentResult.ok -and $null -ne $launchContent -and
    (Get-ObjectValue $launchContent 'passed') -eq $true
Add-Gate 'local.launch-content' 'legal' $(if ($launchContentOk) { 'pass' } else { 'fail' }) `
    $(if ($launchContentOk) { 'Policy text and signup legal-link mechanical checks passed.' } else { 'Policy placeholders, a temporary privacy address or missing signup legal links keep launch at NO-GO.' }) @{
        findingCount = if ($null -ne $launchContent) { @(Get-ObjectValue $launchContent 'findings').Count } else { 1 }
    }

$managedBackupPolicyRequired = (Get-ObjectValue $inputs 'policies.requireManagedBackupForFirstPublicLaunch') -eq $true
Add-Gate 'policy.first-launch-managed-backup' 'backup' $(if ($managedBackupPolicyRequired) { 'pass' } else { 'fail' }) `
    $(if ($managedBackupPolicyRequired) { 'Managed restore capability is an explicit first-public-launch policy.' } else { 'First-public-launch managed-backup policy must be explicitly enabled.' }) @{
        externalSpendAuthorizationMayBeRequired = $true
    }

# Required public/legal facts. Values are deliberately not copied into evidence.
$legalChecks = [ordered]@{
    controllerName          = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.controllerName')
    legalForm               = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.legalForm')
    registrationAndTaxIdentifiers = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.registrationAndTaxIdentifiersOrNotApplicable')
    registeredAddress       = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.registeredAddress')
    country                 = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.country')
    privacyEmail            = Test-EmailValue (Get-ObjectValue $inputs 'legal.privacyEmail')
    supportEmail            = Test-EmailValue (Get-ObjectValue $inputs 'legal.supportEmail')
    dataProtectionContact   = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.dataProtectionContactOrNotApplicable')
    minimumAge              = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.minimumAge')
    governingLaw            = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.governingLaw')
    competentJurisdiction   = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.competentJurisdiction')
    retentionSchedule       = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.retentionScheduleApproved')
    privacyPolicyVersion    = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.privacyPolicyVersion')
    termsVersion            = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.termsVersion')
    cookiesVersion          = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.cookiesVersion')
    approvedBy              = Test-MeaningfulValue (Get-ObjectValue $inputs 'legal.approvedBy')
    privacyApprovedAtUtc    = Test-ApprovalTimestamp (Get-ObjectValue $inputs 'legal.privacyApprovedAtUtc')
    termsApprovedAtUtc      = Test-ApprovalTimestamp (Get-ObjectValue $inputs 'legal.termsApprovedAtUtc')
    cookiesApprovedAtUtc    = Test-ApprovalTimestamp (Get-ObjectValue $inputs 'legal.cookiesApprovedAtUtc')
}
$missingLegal = @($legalChecks.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key })
Add-Gate 'legal.required-facts' 'legal' $(if ($missingLegal.Count -eq 0) { 'pass' } else { 'fail' }) `
    $(if ($missingLegal.Count -eq 0) { 'Required legal facts and approvals are present.' } else { 'Required legal facts or dated approvals are missing.' }) @{
        providedCount = $legalChecks.Count - $missingLegal.Count
        requiredCount = $legalChecks.Count
    }

# Named owners and an explicit launch window are mandatory.
$communityMode = [string](Get-ObjectValue $inputs 'operations.communityMode')
$ownerChecks = [ordered]@{
    incidentOwner = Test-MeaningfulValue (Get-ObjectValue $inputs 'operations.incidentOwner')
    rollbackOwner = Test-MeaningfulValue (Get-ObjectValue $inputs 'operations.rollbackOwner')
    goNoGoOwner    = Test-MeaningfulValue (Get-ObjectValue $inputs 'operations.goNoGoOwner')
}
if ($communityMode -eq 'enabled') {
    $ownerChecks['moderationOwner'] = Test-MeaningfulValue (Get-ObjectValue $inputs 'operations.moderationOwner')
    $ownerChecks['moderationContact'] = Test-EmailValue (Get-ObjectValue $inputs 'operations.moderationContact')
}
elseif ($communityMode -ne 'disabled') {
    $ownerChecks['communityMode'] = $false
}

$windowStart = ConvertTo-UtcTimestamp (Get-ObjectValue $inputs 'operations.launchWindowStartUtc')
$windowEnd = ConvertTo-UtcTimestamp (Get-ObjectValue $inputs 'operations.launchWindowEndUtc')
$windowOk = ($null -ne $windowStart) -and ($null -ne $windowEnd) -and
    ($windowEnd -gt $windowStart) -and ($windowEnd -gt [DateTimeOffset]::UtcNow)
$ownerChecks['launchWindow'] = $windowOk
$missingOwners = @($ownerChecks.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key })
Add-Gate 'operations.ownership' 'operations' $(if ($missingOwners.Count -eq 0) { 'pass' } else { 'fail' }) `
    $(if ($missingOwners.Count -eq 0) { 'Operational owners and launch window are assigned.' } else { 'Operational ownership or launch window is incomplete.' }) @{
        communityMode = if ($communityMode -in @('enabled', 'disabled')) { $communityMode } else { 'invalid' }
        providedCount = $ownerChecks.Count - $missingOwners.Count
        requiredCount = $ownerChecks.Count
    }

# Backup proof: logical DB plus Storage objects, kept outside the repository.
$backupManifestPath = Resolve-ConfiguredPath (Get-ObjectValue $inputs 'evidence.backupManifestPath') $inputsDirectory
$backupManifest = $null
$backupManifestSha256 = ''
if ($null -eq $backupManifestPath -or -not (Test-Path -LiteralPath $backupManifestPath -PathType Leaf)) {
    Add-Gate 'evidence.backup-manifest' 'backup' 'fail' 'Backup manifest is missing.' @{}
}
elseif ((Test-PathInsideRepository $backupManifestPath) -or (Test-PathHasReparsePoint $backupManifestPath)) {
    Add-Gate 'evidence.backup-manifest' 'backup' 'fail' 'Backup manifest must be outside the repository and cannot traverse a reparse point.' @{
        file = [System.IO.Path]::GetFileName($backupManifestPath)
    }
}
else {
    $backupDocument = Read-JsonDocument $backupManifestPath
    if (-not $backupDocument.ok) {
        Add-Gate 'evidence.backup-manifest' 'backup' 'fail' 'Backup manifest is invalid or contains secret-like material.' @{
            file = [System.IO.Path]::GetFileName($backupManifestPath)
        }
    }
    else {
        $backupManifest = $backupDocument.data
        $backupManifestSha256 = (Get-FileHash -LiteralPath $backupManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
        $backupIssues = @()
        if ((Get-ObjectValue $backupManifest 'schemaVersion') -ne 1) { $backupIssues += 'schema-version' }
        if ((Get-ObjectValue $backupManifest 'kind') -ne 'backup-manifest') { $backupIssues += 'kind' }
        if ((Get-ObjectValue $backupManifest 'passed') -isnot [bool] -or -not (Get-ObjectValue $backupManifest 'passed')) { $backupIssues += 'passed' }
        if ((Get-ObjectValue $backupManifest 'sourceProjectRef') -ne $supabaseProjectRef) { $backupIssues += 'project' }
        if ((Get-ObjectValue $backupManifest 'encryptedAtRest') -isnot [bool] -or -not (Get-ObjectValue $backupManifest 'encryptedAtRest')) { $backupIssues += 'encryption' }
        if ((Get-ObjectValue $backupManifest 'offsiteCopyVerified') -isnot [bool] -or -not (Get-ObjectValue $backupManifest 'offsiteCopyVerified')) { $backupIssues += 'offsite-copy' }
        if (-not (Test-MeaningfulValue (Get-ObjectValue $backupManifest 'approvedBy'))) { $backupIssues += 'approval' }
        if (-not (Test-MeaningfulValue (Get-ObjectValue $backupManifest 'approvalReference'))) { $backupIssues += 'approval-reference' }

        $backupAt = ConvertTo-UtcTimestamp (Get-ObjectValue $backupManifest 'capturedAtUtc')
        if ($null -eq $backupAt -or ([DateTimeOffset]::UtcNow - $backupAt).TotalHours -gt 24 -or
            ([DateTimeOffset]::UtcNow - $backupAt).TotalHours -lt -0.25) {
            $backupIssues += 'stale'
        }

        $requiredArtifactKinds = @(
            'roles',
            'schema',
            'data',
            'migration-history-schema',
            'migration-history-data',
            'storage-inventory',
            'storage-objects'
        )
        $artifacts = @(Get-ObjectValue $backupManifest 'artifacts')
        foreach ($kind in $requiredArtifactKinds) {
            $matches = @($artifacts | Where-Object { (Get-ObjectValue $_ 'kind') -eq $kind })
            if ($matches.Count -ne 1) {
                $backupIssues += "artifact-$kind"
                continue
            }
            $artifact = $matches[0]
            $artifactPath = Resolve-ConfiguredPath (Get-ObjectValue $artifact 'path') (Split-Path -Parent $backupManifestPath)
            $artifactHash = [string](Get-ObjectValue $artifact 'sha256')
            if ($null -eq $artifactPath -or (Test-PathInsideRepository $artifactPath) -or
                (Test-PathHasReparsePoint $artifactPath) -or
                -not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
                $backupIssues += "artifact-path-$kind"
                continue
            }
            $fileInfo = Get-Item -LiteralPath $artifactPath
            if ($fileInfo.Length -le 0 -or $artifactHash -notmatch '^[0-9a-fA-F]{64}$') {
                $backupIssues += "artifact-metadata-$kind"
                continue
            }
            $actualHash = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($actualHash -ne $artifactHash.ToLowerInvariant()) {
                $backupIssues += "artifact-hash-$kind"
            }
        }

        if ($backupIssues.Count -eq 0) {
            Add-Gate 'evidence.backup-manifest' 'backup' 'pass' 'Fresh encrypted off-repository backup artifacts are verified.' @{
                artifactCount = $requiredArtifactKinds.Count
                file          = [System.IO.Path]::GetFileName($backupManifestPath)
                manifestSha256 = $backupManifestSha256
            }
        }
        else {
            Add-Gate 'evidence.backup-manifest' 'backup' 'fail' 'Backup proof is incomplete, stale or has a checksum mismatch.' @{
                file       = [System.IO.Path]::GetFileName($backupManifestPath)
                issueCount = $backupIssues.Count
            }
            $backupManifest = $null
        }
    }
}

# Restore proof must use an isolated target and the exact backup/migration hashes.
$restorePath = Resolve-ConfiguredPath (Get-ObjectValue $inputs 'evidence.restoreRehearsalPath') $inputsDirectory
if ($null -eq $restorePath -or -not (Test-Path -LiteralPath $restorePath -PathType Leaf)) {
    Add-Gate 'evidence.restore-rehearsal' 'backup' 'fail' 'Restore rehearsal evidence is missing.' @{}
}
elseif ((Test-PathInsideRepository $restorePath) -or (Test-PathHasReparsePoint $restorePath)) {
    Add-Gate 'evidence.restore-rehearsal' 'backup' 'fail' 'Restore rehearsal evidence must be outside the repository and cannot traverse a reparse point.' @{
        file = [System.IO.Path]::GetFileName($restorePath)
    }
}
else {
    $restoreDocument = Read-JsonDocument $restorePath
    if (-not $restoreDocument.ok) {
        Add-Gate 'evidence.restore-rehearsal' 'backup' 'fail' 'Restore rehearsal evidence is invalid or contains secret-like material.' @{
            file = [System.IO.Path]::GetFileName($restorePath)
        }
    }
    else {
        $restore = $restoreDocument.data
        $restoreIssues = @()
        if ((Get-ObjectValue $restore 'schemaVersion') -ne 1) { $restoreIssues += 'schema-version' }
        if ((Get-ObjectValue $restore 'kind') -ne 'restore-rehearsal') { $restoreIssues += 'kind' }
        if ((Get-ObjectValue $restore 'passed') -isnot [bool] -or -not (Get-ObjectValue $restore 'passed')) { $restoreIssues += 'passed' }
        if ((Get-ObjectValue $restore 'sourceProjectRef') -ne $supabaseProjectRef) { $restoreIssues += 'source-project' }
        $targetRef = [string](Get-ObjectValue $restore 'targetProjectRef')
        if (-not (Test-MeaningfulValue $targetRef) -or $targetRef -eq $supabaseProjectRef) { $restoreIssues += 'isolated-target' }
        if ((Get-ObjectValue $restore 'backupManifestSha256') -ne $backupManifestSha256 -or
            [string]::IsNullOrWhiteSpace($backupManifestSha256)) { $restoreIssues += 'backup-hash' }
        if ((Get-ObjectValue $restore 'migration0050Sha256') -ne $migrationSha256) { $restoreIssues += 'migration-0050-hash' }
        if ((Get-ObjectValue $restore 'abuseControlsMigrationSha256') -ne $abuseMigrationSha256) { $restoreIssues += 'migration-abuse-controls-hash' }
        if ((Get-ObjectValue $restore 'releaseCommit') -ne $expectedCommit) { $restoreIssues += 'commit' }
        if (-not (Test-MeaningfulValue (Get-ObjectValue $restore 'approvedBy'))) { $restoreIssues += 'approval' }
        if (-not (Test-MeaningfulValue (Get-ObjectValue $restore 'approvalReference'))) { $restoreIssues += 'approval-reference' }
        $restoreArtifacts = Test-ExternalArtifactSet (Get-ObjectValue $restore 'artifacts') (Split-Path -Parent $restorePath)
        if (-not $restoreArtifacts.passed) { $restoreIssues += 'external-artifact' }

        $restoreAt = ConvertTo-UtcTimestamp (Get-ObjectValue $restore 'capturedAtUtc')
        if ($null -eq $restoreAt -or ([DateTimeOffset]::UtcNow - $restoreAt).TotalHours -gt 168 -or
            ([DateTimeOffset]::UtcNow - $restoreAt).TotalHours -lt -0.25) {
            $restoreIssues += 'stale'
        }
        $restoreChecks = @(
            'rolesRestored',
            'schemaRestored',
            'dataRestored',
            'authCountsMatched',
            'storageMetadataMatched',
            'storageObjectsMatched',
            'criticalRowCountsMatched',
            'migration0050Applied',
            'abuseControlsMigrationAppliedAfter0050',
            'rlsRpcStorageMatrixPassed',
            'newForwardFixMigrationRehearsed',
            'productionUntouched'
        )
        $failedRestoreChecks = Test-BooleanChecks (Get-ObjectValue $restore 'checks') $restoreChecks
        if ($failedRestoreChecks.Count -gt 0) { $restoreIssues += 'checks' }

        Add-Gate 'evidence.restore-rehearsal' 'backup' $(if ($restoreIssues.Count -eq 0) { 'pass' } else { 'fail' }) `
            $(if ($restoreIssues.Count -eq 0) { 'Isolated restore and migration rehearsal are proven.' } else { 'Restore rehearsal is incomplete, stale or not isolated from production.' }) @{
                checkCount = $restoreChecks.Count
                artifactCount = $restoreArtifacts.artifactCount
                file       = [System.IO.Path]::GetFileName($restorePath)
                issueCount = $restoreIssues.Count
            }
    }
}

# Release-specific approval-backed evidence records. A JSON assertion alone is
# insufficient: every common record must link to an external hashed artifact.
$googleOAuthMode = [string](Get-ObjectValue $inputs 'auth.googleOAuthMode')
$googleOAuthModeOk = $googleOAuthMode -in @('enabled', 'disabled')
Add-Gate 'auth.google-oauth-mode' 'auth' $(if ($googleOAuthModeOk) { 'pass' } else { 'fail' }) `
    $(if ($googleOAuthModeOk) { 'Google OAuth launch mode is explicit.' } else { 'Google OAuth mode must be exactly enabled or disabled.' }) @{
        mode = if ($googleOAuthModeOk) { $googleOAuthMode } else { 'invalid' }
    }
$captchaMode = [string](Get-ObjectValue $inputs 'auth.captchaMode')
$captchaModeOk = $captchaMode -in @('enabled', 'disabled')
Add-Gate 'auth.captcha-mode' 'auth' $(if ($captchaModeOk) { 'pass' } else { 'fail' }) `
    $(if ($captchaModeOk) { 'CAPTCHA launch mode is explicit and evidence-gated.' } else { 'CAPTCHA mode must be exactly enabled or disabled.' }) @{
        mode = if ($captchaModeOk) { $captchaMode } else { 'invalid' }
    }

$null = Test-CommonEvidenceRecord 'managedBackupPolicyPath' 'managed-backup-policy' 168 @(
    'firstPublicLaunchPolicyAccepted',
    'managedRestorePointRequired',
    'externalSpendAuthorizationRecordedIfUpgradeRequired'
)
$null = Test-CommonEvidenceRecord 'functionRolloutReadinessPath' 'function-rollout-readiness' 24 @(
    'exactFunctionSetPinned',
    'jwtContractReviewed',
    'deploymentOrderReviewed',
    'headCleanAndHashRecheckProcedureApproved',
    'operatorAndStopConditionsAssigned'
)
$null = Test-CommonEvidenceRecord 'legalPublicationPath' 'legal-publication' 168 @(
    'privacyTextContainsNoPlaceholders',
    'termsTextContainsNoPlaceholders',
    'cookiesTextVerified',
    'operatorIdentityPublished',
    'privacyAndSupportContactsTested',
    'processingInventoryMatchedImplementation',
    'retentionAndDeletionTextPublished',
    'ageAndMinorsPolicyPublished',
    'userContentOwnershipAndLicenceCorrect',
    'communityModerationTermsPublishedOrFeatureDisabled',
    'approvedVersionsMatchPublicUrls',
    'legalReviewerApproved'
)
$null = Test-CommonEvidenceRecord 'migrationBaselinePath' 'migration-baseline' 24 @(
    'schemaInventoryCaptured',
    'migrationHistoryCaptured',
    'historicalReplayBlocked',
    'migration0050ReviewedAgainstLive',
    'abuseControlsReviewedAgainst0050',
    'launchMigrationOrderPinned',
    'launchMigrationsOnly'
) $true $true $true
$null = Test-CommonEvidenceRecord 'smtpRecoveryPath' 'smtp-recovery' 168 @(
    'emailDelivered',
    'resetLinkOpened',
    'passwordResetCompleted',
    'oldPasswordRejected',
    'sessionRotationVerified'
)
$null = Test-CommonEvidenceRecord 'supportChannelPath' 'support-channel' 168 @(
    'privacyInboxReachable',
    'supportInboxReachable',
    'replyOwnerAssigned'
)
$null = Test-CommonEvidenceRecord 'authProductionReadinessPath' 'auth-production-readiness' 4 @(
    'customSmtpEnabled',
    'authEmailRateLimitCapacityApproved',
    'emailConfirmationEnabled',
    'minimumPasswordLengthAtLeast10',
    'passwordRequiresLetterAndNumber',
    'passwordPolicyAlignedInFrontend',
    'signupConfirmationTested',
    'passwordRecoveryTested'
)
if ($captchaMode -eq 'enabled') {
    $null = Test-CommonEvidenceRecord 'captchaReadinessPath' 'captcha-readiness' 24 @(
        'productionSiteKeyConfigured',
        'frontendStrictOptInEnabled',
        'backendProviderEnabled',
        'frontendAndBackendProviderMatch',
        'signupChallengePassed',
        'loginChallengePassed',
        'passwordRecoveryChallengePassed',
        'invalidChallengeRejected'
    )
}
elseif ($captchaMode -eq 'disabled') {
    $null = Test-CommonEvidenceRecord 'captchaWaiverPath' 'captcha-waiver' 24 @(
        'disabledStateVerifiedFrontendAndBackend',
        'firstLaunchRiskReviewed',
        'waiverExplicitlyApproved',
        'waiverExpiryRecorded',
        'abuseMonitoringAndOwnerAssigned'
    )
}
$credentialRotationChecks = @(
    'databaseCredentialRotated',
    'databaseConsumersUpdated',
    'oldDatabaseCredentialRejected',
    'authenticationSmokePassed'
)
if ($googleOAuthMode -eq 'enabled') {
    $credentialRotationChecks += @(
        'googleOauthCredentialRotated',
        'googleOauthConsumersUpdated',
        'oldGoogleOauthCredentialRejected'
    )
}
$null = Test-CommonEvidenceRecord 'credentialRotationPath' 'credential-rotation' 24 $credentialRotationChecks

if ($googleOAuthMode -eq 'enabled') {
    $null = Test-CommonEvidenceRecord 'googleOAuthReadinessPath' 'google-oauth-readiness' 24 @(
        'oauthConsentScreenPublishedToProduction',
        'brandNameVerified',
        'homepageUrlVerified',
        'privacyPolicyUrlVerified',
        'termsOfServiceUrlVerified',
        'authorizedDomainsVerified',
        'supabaseRedirectUriExact',
        'applicationRedirectUrlsExact',
        'externalUserSignupAndLoginPassed'
    )
}
elseif ($googleOAuthMode -eq 'disabled') {
    $null = Test-CommonEvidenceRecord 'googleOAuthDisabledPath' 'google-oauth-disabled' 24 @(
        'providerDisabledInSupabase',
        'productionFlagFalse',
        'signupButtonHidden',
        'loginButtonHidden',
        'directOauthInitiationBlocked'
    )
}
$null = Test-CommonEvidenceRecord 'stripeInventoryPath' 'stripe-inventory' 4 @(
    'newPurchasesDisabled',
    'openCheckoutSessionsZero',
    'activeSubscriptionsReconciled',
    'webhookEndpointHealthy'
)
$null = Test-CommonEvidenceRecord 'previewQaPath' 'preview-qa' 72 @(
    'mobilePassed',
    'desktopPassed',
    'anonymousPassed',
    'authenticatedPassed',
    'accessibilityNoSeriousCritical',
    'noP0P1'
)
$null = Test-CommonEvidenceRecord 'rollbackRehearsalPath' 'rollback-rehearsal' 168 @(
    'frontendCompatibleTargetPinned',
    'edgeFunctionRollbackReviewed',
    'newDatabaseForwardFixMigrationReviewed',
    'manualDropRollbackProhibited',
    'restorationDecisionPathReviewed',
    'operatorExercisePassed'
)
$null = Test-CommonEvidenceRecord 'observabilityReadinessPath' 'observability-readiness' 168 @(
    'authErrorsVisible',
    'functionErrorsVisible',
    'databaseHealthVisible',
    'netlifyFailuresVisible',
    'incidentEscalationTested'
)

if ($communityMode -eq 'enabled') {
    $null = Test-CommonEvidenceRecord 'moderationReadinessPath' 'moderation-readiness' 168 @(
        'reportQueueAccessible',
        'existingReportsTriaged',
        'responseProcedureTested',
        'contactChannelVerified'
    )
}
elseif ($communityMode -eq 'disabled') {
    $null = Test-CommonEvidenceRecord 'communityDisablePath' 'community-disabled' 72 @(
        'routesDisabled',
        'writesBlocked',
        'navigationHidden',
        'directAccessTested'
    )
}

if ($Stage -in @('PostFunctions', 'PostDeploy')) {
    $null = Test-CommonEvidenceRecord 'functionRolloutPath' 'function-rollout' 4 @(
        'headReconfirmedBeforeEveryDeploy',
        'cleanWorktreeReconfirmedBeforeEveryDeploy',
        'sourceHashesReconfirmedBeforeEveryDeploy',
        'functionsDeployedOneByOne',
        'exactRemoteSetVerified',
        'jwtContractVerified',
        'noPruneOrJwtBypassUsed'
    )
}

if ($Stage -eq 'PostDeploy') {
    $null = Test-CommonEvidenceRecord 'postDeploySmokePath' 'post-deploy-smoke' 4 @(
        'productionCommitMatched',
        'anonymousSmokePassed',
        'authenticationSmokePassed',
        'learningLoopPassed',
        'messagingAuthorizationPassed',
        'paidPlansDisabled',
        'noP0P1'
    )
    $null = Test-CommonEvidenceRecord 'qaCleanupPath' 'qa-cleanup' 4 @(
        'authUserAbsent',
        'profileAbsent',
        'attemptsAbsent',
        'answersAbsent',
        'mediaAbsent',
        'otherUserDataPreserved'
    )
}

# Online mode only executes an explicit allow-list of read-only commands.
if (-not $Online) {
    Add-Gate 'online.reads' 'online' 'not-run' 'Online state was not queried; rerun with -Online for a launch verdict.' @{}
}
else {
    $repository = [string](Get-ObjectValue $inputs 'release.repository')
    $prNumber = Get-ObjectValue $inputs 'release.pullRequestNumber'
    $baseBranch = [string](Get-ObjectValue $inputs 'release.baseBranch')

    $prResult = Invoke-ReadOnlyCommand 'gh' @(
        'pr', 'view', [string]$prNumber,
        '--repo', $repository,
        '--json', 'number,url,state,isDraft,headRefName,baseRefName,mergeStateStatus,headRefOid,reviewDecision,updatedAt'
    )
    $pr = ConvertFrom-CommandJson $prResult
    $expectedPrState = if ($Stage -in @('PostFunctions', 'PostDeploy')) { 'MERGED' } else { 'OPEN' }
    $stateSpecificPrOk = if ($Stage -in @('PostFunctions', 'PostDeploy')) {
        (Get-ObjectValue $pr 'state') -eq 'MERGED'
    }
    else {
        (Get-ObjectValue $pr 'state') -eq 'OPEN' -and
            (Get-ObjectValue $pr 'mergeStateStatus') -eq 'CLEAN'
    }
    $prOk = $prResult.ok -and $null -ne $pr -and
        $stateSpecificPrOk -and
        -not (Get-ObjectValue $pr 'isDraft') -and
        (Get-ObjectValue $pr 'headRefName') -eq $expectedBranch -and
        (Get-ObjectValue $pr 'baseRefName') -eq $baseBranch -and
        (Get-ObjectValue $pr 'headRefOid') -eq $expectedCommit -and
        (Get-ObjectValue $inputs 'release.requireApproval') -eq $true -and
        (Get-ObjectValue $pr 'reviewDecision') -eq 'APPROVED'
    Add-Gate 'github.pull-request' 'github' $(if ($prOk) { 'pass' } else { 'fail' }) `
        $(if ($prOk) { 'Pull request state, approval and immutable head match this stage.' } else { 'Pull request is missing, in the wrong stage, draft, unapproved, stale or not mergeable.' }) @{
            expectedState = $expectedPrState
            number = if ($null -ne $pr) { Get-ObjectValue $pr 'number' } else { $prNumber }
            state  = if ($null -ne $pr) { Get-ObjectValue $pr 'state' } else { 'unavailable' }
        }

    $checkResult = Invoke-ReadOnlyCommand 'gh' @(
        'pr', 'checks', [string]$prNumber,
        '--repo', $repository,
        '--json', 'bucket,completedAt,link,name,state,workflow'
    )
    $parsedChecks = ConvertFrom-CommandJson $checkResult
    # Windows PowerShell 5.1 preserves a top-level JSON array as one pipeline
    # object. Enumerate it explicitly so each check is evaluated separately.
    $checks = if ($parsedChecks -is [System.Array]) {
        @($parsedChecks | ForEach-Object { $_ })
    }
    elseif ($null -ne $parsedChecks) {
        @($parsedChecks)
    }
    else {
        @()
    }
    $requiredCheckNames = @(Get-ObjectValue $inputs 'release.requiredGithubChecks')
    $requiredPreviewCheckName = [string](Get-ObjectValue $inputs 'release.requiredPreviewCheckName')
    $requiredNamesConfigured = $requiredCheckNames.Count -gt 0 -and
        @($requiredCheckNames | Where-Object { -not (Test-MeaningfulValue $_) }).Count -eq 0 -and
        (Test-MeaningfulValue $requiredPreviewCheckName)
    $checkContract = Test-GithubCheckContract $checks $requiredCheckNames $requiredPreviewCheckName
    $checksOk = $checkResult.ok -and $requiredNamesConfigured -and $checkContract.passed
    Add-Gate 'github.checks' 'github' $(if ($checksOk) { 'pass' } else { 'fail' }) `
        $(if ($checksOk) { 'Every exact required GitHub gate, including preview, passed.' } else { 'Required check names are missing, duplicated, skipped, pending or not exactly pass.' }) @{
            checkCount          = $checkContract.checkCount
            blockingCount       = $checkContract.blockingCount
            requiredCount       = $checkContract.requiredCount
            requiredPassedCount = $checkContract.requiredPassedCount
        }

    $netlifyStatusResult = Invoke-ReadOnlyCommand 'netlify' @('status', '--json')
    $netlifyStatus = ConvertFrom-CommandJson $netlifyStatusResult
    $siteData = Get-ObjectValue $netlifyStatus 'siteData'
    $expectedSiteId = [string](Get-ObjectValue $inputs 'release.netlifySiteId')
    $expectedSiteName = [string](Get-ObjectValue $inputs 'release.netlifySiteName')
    $productionUrl = [string](Get-ObjectValue $inputs 'release.productionUrl')
    $netlifyOk = $netlifyStatusResult.ok -and $null -ne $siteData -and
        (Get-ObjectValue $siteData 'site-id') -eq $expectedSiteId -and
        (Get-ObjectValue $siteData 'site-name') -eq $expectedSiteName -and
        (Get-ObjectValue $siteData 'site-url') -eq $productionUrl
    Add-Gate 'netlify.site' 'netlify' $(if ($netlifyOk) { 'pass' } else { 'fail' }) `
        $(if ($netlifyOk) { 'Linked Netlify site matches launch inputs.' } else { 'Netlify site is unavailable or does not match launch inputs.' }) @{
            siteId   = $expectedSiteId
            siteName = $expectedSiteName
        }

    $netlifyFlagResult = Invoke-ReadOnlyCommand 'netlify' @(
        'env:get', 'VITE_PAID_PLANS_ENABLED', '--context', 'production'
    )
    $flagLines = @($netlifyFlagResult.output -split "`r?`n" | Where-Object { $_.Trim() -match '^(true|false)$' })
    $netlifyFlag = if ($flagLines.Count -gt 0) { $flagLines[-1].Trim().ToLowerInvariant() } else { '' }
    $expectedFlagFalse = (Get-ObjectValue $inputs 'release.expectedPaidPlansEnabled') -eq $false
    $netlifyFlagOk = $netlifyFlagResult.ok -and $expectedFlagFalse -and $netlifyFlag -eq 'false'
    Add-Gate 'netlify.paid-flag' 'payments' $(if ($netlifyFlagOk) { 'pass' } else { 'fail' }) `
        $(if ($netlifyFlagOk) { 'Netlify production paid-plans flag is false.' } else { 'Netlify production paid-plans flag is not proven false.' }) @{}

    $googleFlagResult = Invoke-ReadOnlyCommand 'netlify' @(
        'env:get', 'VITE_GOOGLE_OAUTH_ENABLED', '--context', 'production'
    )
    $googleFlagLines = @($googleFlagResult.output -split "`r?`n" | Where-Object { $_.Trim() -match '^(true|false)$' })
    $googleFlag = if ($googleFlagLines.Count -gt 0) { $googleFlagLines[-1].Trim().ToLowerInvariant() } else { '' }
    $expectedGoogleFlag = if ($googleOAuthMode -eq 'enabled') { 'true' } elseif ($googleOAuthMode -eq 'disabled') { 'false' } else { '' }
    $googleFlagOk = $googleFlagResult.ok -and -not [string]::IsNullOrWhiteSpace($expectedGoogleFlag) -and
        $googleFlag -eq $expectedGoogleFlag
    Add-Gate 'netlify.google-oauth-flag' 'auth' $(if ($googleFlagOk) { 'pass' } else { 'fail' }) `
        $(if ($googleFlagOk) { 'Production Google OAuth flag matches the approved explicit mode.' } else { 'Production Google OAuth flag does not match the approved enabled/disabled mode.' }) @{
            expectedMode = if ($googleOAuthModeOk) { $googleOAuthMode } else { 'invalid' }
        }

    $captchaFlagResult = Invoke-ReadOnlyCommand 'netlify' @(
        'env:get', 'VITE_CAPTCHA_ENABLED', '--context', 'production'
    )
    $captchaFlagLines = @($captchaFlagResult.output -split "`r?`n" | Where-Object { $_.Trim() -match '^(true|false)$' })
    $captchaFlag = if ($captchaFlagLines.Count -gt 0) { $captchaFlagLines[-1].Trim().ToLowerInvariant() } else { '' }
    $expectedCaptchaFlag = if ($captchaMode -eq 'enabled') { 'true' } elseif ($captchaMode -eq 'disabled') { 'false' } else { '' }
    $captchaFlagOk = $captchaFlagResult.ok -and -not [string]::IsNullOrWhiteSpace($expectedCaptchaFlag) -and
        $captchaFlag -eq $expectedCaptchaFlag
    Add-Gate 'netlify.captcha-flag' 'auth' $(if ($captchaFlagOk) { 'pass' } else { 'fail' }) `
        $(if ($captchaFlagOk) { 'Production CAPTCHA flag matches the approved explicit mode.' } else { 'Production CAPTCHA flag does not match the approved enabled/disabled mode.' }) @{
            expectedMode = if ($captchaModeOk) { $captchaMode } else { 'invalid' }
        }

    $projectsResult = Invoke-ReadOnlyCommand 'supabase' @('projects', 'list', '--output-format', 'json')
    $projectsDocument = ConvertFrom-CommandJson $projectsResult
    $projects = @(Get-ObjectValue $projectsDocument 'projects')
    $matchingProjects = @($projects | Where-Object { (Get-ObjectValue $_ 'ref') -eq $supabaseProjectRef })
    $projectOk = $matchingProjects.Count -eq 1 -and
        (Get-ObjectValue $matchingProjects[0] 'status') -eq 'ACTIVE_HEALTHY'
    Add-Gate 'supabase.project' 'supabase' $(if ($projectOk) { 'pass' } else { 'fail' }) `
        $(if ($projectOk) { 'Supabase production project is healthy.' } else { 'Supabase production project is unavailable, ambiguous or unhealthy.' }) @{
            projectRef = $supabaseProjectRef
            status     = if ($matchingProjects.Count -eq 1) { Get-ObjectValue $matchingProjects[0] 'status' } else { 'unavailable' }
        }

    $backupsResult = Invoke-ReadOnlyCommand 'supabase' @(
        'backups', 'list', '--project-ref', $supabaseProjectRef, '--output-format', 'json'
    )
    $backupsDocument = ConvertFrom-CommandJson $backupsResult
    $backupCount = @(Get-ObjectValue $backupsDocument 'backups').Count
    $pitrEnabled = (Get-ObjectValue $backupsDocument 'pitr_enabled') -eq $true
    $managedBackupOk = $backupsResult.ok -and ($pitrEnabled -or $backupCount -gt 0)
    Add-Gate 'supabase.managed-backups' 'backup' $(if ($managedBackupOk) { 'pass' } else { 'fail' }) `
        $(if ($managedBackupOk) { 'A managed Supabase restore point is available.' } else { 'No managed restore point is visible; production launch remains blocked.' }) @{
            backupCount = $backupCount
            externalPlanUpgradeAuthorizationRequired = (-not $managedBackupOk)
            pitrEnabled = $pitrEnabled
            policy = 'first-public-launch'
        }

    $secretsResult = Invoke-ReadOnlyCommand 'supabase' @(
        'secrets', 'list', '--project-ref', $supabaseProjectRef, '--output-format', 'json'
    )
    $secretsDocument = ConvertFrom-CommandJson $secretsResult
    $secretEntries = @(Get-ObjectValue $secretsDocument 'secrets')
    $secretNames = @($secretEntries | ForEach-Object { [string](Get-ObjectValue $_ 'name') })
    $requiredSecretNames = @(
        'PAID_PLANS_ENABLED',
        'SITE_URL',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
    )
    $missingSecretNames = @($requiredSecretNames | Where-Object { $_ -notin $secretNames })
    $paidEntry = @($secretEntries | Where-Object { (Get-ObjectValue $_ 'name') -eq 'PAID_PLANS_ENABLED' })
    $siteUrlEntry = @($secretEntries | Where-Object { (Get-ObjectValue $_ 'name') -eq 'SITE_URL' })
    $paidDigestOk = $paidEntry.Count -eq 1 -and
        (Get-ObjectValue $paidEntry[0] 'value') -eq (Get-StringSha256 'false')
    $siteDigestOk = $siteUrlEntry.Count -eq 1 -and
        (Get-ObjectValue $siteUrlEntry[0] 'value') -eq (Get-StringSha256 $productionUrl)
    $secretContractOk = $secretsResult.ok -and $missingSecretNames.Count -eq 0 -and
        $paidDigestOk -and $siteDigestOk
    Add-Gate 'supabase.secret-contract' 'supabase' $(if ($secretContractOk) { 'pass' } else { 'fail' }) `
        $(if ($secretContractOk) { 'Required secret names exist and low-entropy public flags match by digest.' } else { 'Required Supabase secret names or public flag digests do not match.' }) @{
            missingCount = $missingSecretNames.Count
            paidFlagFalse = $paidDigestOk
            siteUrlMatches = $siteDigestOk
        }

    $functionResult = Invoke-ReadOnlyCommand 'supabase' @(
        'functions', 'list', '--project-ref', $supabaseProjectRef, '--output-format', 'json'
    )
    $functionDocument = ConvertFrom-CommandJson $functionResult
    $remoteFunctions = @(Get-ObjectValue $functionDocument 'functions')
    $configPath = Join-Path $RepositoryRoot 'backend/supabase/config.toml'
    $expectedFunctions = @{}
    $currentFunction = $null
    foreach ($line in [System.IO.File]::ReadAllLines($configPath)) {
        if ($line -match '^\s*\[functions\.([^\]]+)\]\s*$') {
            $currentFunction = $Matches[1]
        }
        elseif ($null -ne $currentFunction -and $line -match '^\s*verify_jwt\s*=\s*(true|false)\s*$') {
            $expectedFunctions[$currentFunction] = ($Matches[1] -eq 'true')
            $currentFunction = $null
        }
    }
    $functionContract = Test-RemoteFunctionContract $expectedFunctions $remoteFunctions
    $functionsOk = $functionResult.ok -and $functionContract.passed
    $functionGateStatus = if ($functionsOk) {
        'pass'
    }
    elseif ($Stage -eq 'PreDeploy' -and $functionResult.ok) {
        'warn'
    }
    else {
        'fail'
    }
    Add-Gate 'supabase.functions' 'supabase' $functionGateStatus `
        $(if ($functionsOk) { 'Deployed Edge Functions exactly match the source-controlled set and JWT contract.' } elseif ($Stage -eq 'PreDeploy' -and $functionResult.ok) { 'Remote function drift is recorded before rollout; approved rollout-readiness evidence is still mandatory.' } else { 'Function metadata is unavailable, or after rollout the exact remote set, ACTIVE status and JWT contract are not proven.' }) @{
            expectedCount = $functionContract.expectedCount
            issueCount    = $functionContract.issueCount
            remoteCount   = $functionContract.remoteCount
            extraCount    = $functionContract.extraCount
        }
}

$failCount = @($script:Gates | Where-Object { $_.status -eq 'fail' }).Count
$notRunCount = @($script:Gates | Where-Object { $_.status -eq 'not-run' }).Count
$warnCount = @($script:Gates | Where-Object { $_.status -eq 'warn' }).Count
$passCount = @($script:Gates | Where-Object { $_.status -eq 'pass' }).Count
$go = $failCount -eq 0 -and $notRunCount -eq 0

$report = [pscustomobject][ordered]@{
    schemaVersion                 = 1
    generatedAtUtc               = [DateTimeOffset]::UtcNow.ToString('o')
    stage                        = $Stage
    mode                         = if ($Online) { 'read-only-online' } else { 'offline-dry-run' }
    verdict                      = if ($go) { 'GO' } else { 'NO-GO' }
    externalMutationsPerformed   = $false
    productionDataRead           = $false
    secretsPersisted             = $false
    repository                   = [pscustomobject][ordered]@{
        remoteUrl       = $safeRemoteUrl
        branch          = if ($gitBranch.ok) { $gitBranch.output } else { '' }
        commit          = if ($gitHead.ok) { $gitHead.output } else { '' }
        worktreeClean   = $cleanOk
        migration0050Sha256 = $migrationSha256
        abuseControlsMigrationSha256 = $abuseMigrationSha256
    }
    release                      = [pscustomobject][ordered]@{
        repository         = [string](Get-ObjectValue $inputs 'release.repository')
        pullRequestNumber  = Get-ObjectValue $inputs 'release.pullRequestNumber'
        supabaseProjectRef = $supabaseProjectRef
        netlifySiteId      = [string](Get-ObjectValue $inputs 'release.netlifySiteId')
        productionUrl      = [string](Get-ObjectValue $inputs 'release.productionUrl')
        paidPlansExpected  = $false
    }
    redaction                     = [pscustomobject][ordered]@{
        legalValuesIncluded       = $false
        operatorContactsIncluded  = $false
        approvalReferencesIncluded = $false
        localArtifactPathsIncluded = $false
        originUserInfoIncluded     = $false
        secretDigestsIncluded     = $false
    }
    summary                       = [pscustomobject][ordered]@{
        passed  = $passCount
        failed  = $failCount
        warnings = $warnCount
        notRun  = $notRunCount
        total   = $script:Gates.Count
    }
    gates                         = $script:Gates
}

$evidenceDirectory = Split-Path -Parent $EvidencePath
if (-not (Test-Path -LiteralPath $evidenceDirectory)) {
    $null = New-Item -ItemType Directory -Path $evidenceDirectory -Force
}
$json = $report | ConvertTo-Json -Depth 12
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($EvidencePath, $json + [Environment]::NewLine, $utf8)

Write-Host "RefLab launch preflight: $($report.verdict) ($Stage, $($report.mode))"
Write-Host "Evidence: $EvidencePath"
Write-Host "Gates: $passCount pass, $failCount fail, $warnCount warning, $notRunCount not-run"

if ($go) {
    exit 0
}
exit 2
