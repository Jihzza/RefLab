#requires -Version 5.1

Set-StrictMode -Version Latest

function Get-LaunchObjectValue {
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

function Test-LaunchJsonContainsSensitiveMaterial {
    param([Parameter(Mandatory = $true)][string]$RawJson)

    $forbidden = @(
        '(?i)\b[a-z][a-z0-9+.-]*://[^/\s@]+@',
        '(?i)postgres(?:ql)?://',
        '(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+',
        '(?i)\b(sk|rk)_(live|test)_[A-Za-z0-9]+',
        '(?i)\b(?:gho|ghp|github_pat)_[A-Za-z0-9_]+',
        '(?i)\bsb_(?:secret|publishable)_[A-Za-z0-9._-]+',
        '(?i)\bsbp_[A-Za-z0-9_-]{16,}',
        '(?i)\bre_[A-Za-z0-9_-]{16,}',
        '(?i)\bwhsec_[A-Za-z0-9_-]{16,}',
        '(?i)\bGOCSPX-[A-Za-z0-9_-]{16,}',
        '(?i)\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}',
        '(?i)"(?:password|accessToken|refreshToken|authorization|connectionString|dbUrl|serviceRoleKey|anonKey|secretKey|clientSecret|client_secret|apiKey|api_key)"\s*:'
    )
    foreach ($pattern in $forbidden) {
        if ($RawJson -match $pattern) {
            return $true
        }
    }
    return $false
}

function Test-LaunchUriContainsUserInfo {
    param([AllowNull()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }
    $uri = $null
    if (-not [System.Uri]::TryCreate($Value, [System.UriKind]::Absolute, [ref]$uri)) {
        return $false
    }
    return -not [string]::IsNullOrWhiteSpace($uri.UserInfo)
}

function Test-LaunchPathInsideRoot {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Root
    )

    $comparison = if ([System.IO.Path]::DirectorySeparatorChar -eq '\') {
        [System.StringComparison]::OrdinalIgnoreCase
    }
    else {
        [System.StringComparison]::Ordinal
    }
    $normalizedRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    $normalizedPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
    if ($normalizedPath.Equals($normalizedRoot, $comparison)) {
        return $true
    }
    $rootPrefix = $normalizedRoot + [System.IO.Path]::DirectorySeparatorChar
    return $normalizedPath.StartsWith($rootPrefix, $comparison)
}

function Test-LaunchPathHasReparsePoint {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $false
    }
    $current = [System.IO.Path]::GetFullPath($Path)
    while (-not [string]::IsNullOrWhiteSpace($current)) {
        $item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
        if ($null -ne $item -and
            (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)) {
            return $true
        }
        $parent = [System.IO.Directory]::GetParent($current)
        if ($null -eq $parent) {
            break
        }
        $current = $parent.FullName
    }
    return $false
}

function Test-GithubCheckContract {
    param(
        [AllowNull()]$Checks,
        [AllowNull()][string[]]$RequiredNames,
        [AllowNull()][string]$RequiredPreviewName
    )

    $allChecks = @($Checks)
    $required = @($RequiredNames | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    $issues = @()
    if ($allChecks.Count -eq 0) { $issues += 'checks-missing' }
    if ($required.Count -eq 0) { $issues += 'required-names-missing' }
    if (@($required | Sort-Object -Unique).Count -ne $required.Count) { $issues += 'required-names-duplicate' }
    if ([string]::IsNullOrWhiteSpace($RequiredPreviewName)) { $issues += 'preview-name-missing' }
    if (-not [string]::IsNullOrWhiteSpace($RequiredPreviewName) -and $RequiredPreviewName -notin $required) {
        $issues += 'preview-not-required'
    }

    $requiredPassed = 0
    foreach ($name in $required) {
        $matches = @($allChecks | Where-Object { (Get-LaunchObjectValue $_ 'name') -ceq $name })
        if ($matches.Count -ne 1) {
            $issues += "required-check-$name"
            continue
        }
        # A required gate must be exactly pass. GitHub's skipping bucket never
        # satisfies a required launch gate.
        if ((Get-LaunchObjectValue $matches[0] 'bucket') -cne 'pass') {
            $issues += "required-check-not-pass-$name"
            continue
        }
        $requiredPassed++
    }

    $blocking = @($allChecks | Where-Object {
        (Get-LaunchObjectValue $_ 'bucket') -notin @('pass', 'skipping')
    })
    if ($blocking.Count -gt 0) { $issues += 'blocking-checks' }

    return [pscustomobject]@{
        passed              = ($issues.Count -eq 0)
        issueCount          = $issues.Count
        checkCount          = $allChecks.Count
        blockingCount       = $blocking.Count
        requiredCount       = $required.Count
        requiredPassedCount = $requiredPassed
    }
}

function Test-RemoteFunctionContract {
    param(
        [Parameter(Mandatory = $true)][hashtable]$ExpectedFunctions,
        [AllowNull()]$RemoteFunctions
    )

    $remote = @($RemoteFunctions)
    $issues = @()
    foreach ($slug in $ExpectedFunctions.Keys) {
        $matches = @($remote | Where-Object { (Get-LaunchObjectValue $_ 'slug') -ceq $slug })
        if ($matches.Count -ne 1) {
            $issues += "missing-or-duplicate-$slug"
            continue
        }
        if ((Get-LaunchObjectValue $matches[0] 'status') -cne 'ACTIVE') {
            $issues += "inactive-$slug"
        }
        if ((Get-LaunchObjectValue $matches[0] 'verify_jwt') -isnot [bool] -or
            (Get-LaunchObjectValue $matches[0] 'verify_jwt') -ne $ExpectedFunctions[$slug]) {
            $issues += "jwt-$slug"
        }
    }

    $extra = @($remote | Where-Object {
        $slug = [string](Get-LaunchObjectValue $_ 'slug')
        -not $ExpectedFunctions.ContainsKey($slug)
    })
    if ($extra.Count -gt 0) { $issues += 'unexpected-functions' }
    if ($remote.Count -ne $ExpectedFunctions.Count) { $issues += 'set-size' }

    return [pscustomobject]@{
        passed        = ($issues.Count -eq 0)
        issueCount    = $issues.Count
        expectedCount = $ExpectedFunctions.Count
        remoteCount   = $remote.Count
        extraCount    = $extra.Count
    }
}
