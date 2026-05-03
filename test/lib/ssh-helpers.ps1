# SSH helpers for sealpi.cn server access.
# Reads creds from env: SEALPI_SSH_HOST, SEALPI_SSH_USER, SEALPI_SSH_PASS.
# Optional: SEALPI_SSH_HOSTKEY (e.g. 'ssh-ed25519 255 SHA256:<hash>') — set
# when plink.exe cannot access the host-key cache (standalone install).
# Discover via: ssh-keyscan -t ed25519 sealpi.cn  then convert to plink format.
#
# SECURITY TRADE-OFF: passwords are passed via `plink -pw <pass>` and
# `pscp -pw <pass>` — i.e. argv. Any local user with read access to the
# process command line (admin / SeDebugPrivilege / EDR with cmdline capture)
# can observe the secret. Acceptable for an isolated agent host running short
# RESULT.md collection runs; NOT acceptable for shared/production hosts.
# Production hardening: use `plink -pwfile <path>` (PuTTY 0.77+) with a
# user-only-readable temp file, or switch to ssh key auth (`plink -i key.ppk`).
# NEVER logs or persists the password.

$script:SealpiHost    = $env:SEALPI_SSH_HOST
$script:SealpiUser    = $env:SEALPI_SSH_USER
$script:SealpiPass    = $env:SEALPI_SSH_PASS
$script:SealpiHostKey = $env:SEALPI_SSH_HOSTKEY   # optional; used by plink -hostkey

function Assert-SealpiCreds {
    if (-not $script:SealpiHost -or -not $script:SealpiUser -or -not $script:SealpiPass) {
        throw "SEALPI_SSH_HOST / SEALPI_SSH_USER / SEALPI_SSH_PASS must be set in env."
    }
}

function Get-SshClient {
    if (Get-Command plink.exe -ErrorAction SilentlyContinue) { return 'plink' }
    if (Get-Command ssh -ErrorAction SilentlyContinue) { return 'ssh' }
    throw "Neither plink.exe nor ssh found in PATH."
}

function Invoke-SealpiSsh {
    param([Parameter(Mandatory)][string]$Command)
    Assert-SealpiCreds
    $client = Get-SshClient
    if ($client -eq 'plink') {
        # plink supports -pw inline; suppress host-key prompt with -batch after first connection.
        # If the host key is not yet in PuTTY's registry, pass -hostkey to avoid interactive prompt.
        $plinkArgs = @('-ssh', '-batch', '-pw', $script:SealpiPass)
        if ($script:SealpiHostKey) { $plinkArgs += @('-hostkey', $script:SealpiHostKey) }
        $plinkArgs += @("$($script:SealpiUser)@$($script:SealpiHost)", $Command)
        $out = & plink.exe @plinkArgs
        if ($LASTEXITCODE -ne 0) { throw "SSH failed (exit $LASTEXITCODE) for: $Command" }
        $out
    } else {
        # OpenSSH: requires sshpass (Linux/WSL) — on bare Windows, fall back to plink.
        if (-not (Get-Command sshpass -ErrorAction SilentlyContinue)) {
            throw "OpenSSH ssh available but sshpass not found. Install plink (PuTTY) for password auth."
        }
        $out = & sshpass -e ssh -o StrictHostKeyChecking=accept-new "$($script:SealpiUser)@$($script:SealpiHost)" $Command
        if ($LASTEXITCODE -ne 0) { throw "SSH failed (exit $LASTEXITCODE) for: $Command" }
        $out
    }
}

function Invoke-SealpiScpDown {
    param(
        [Parameter(Mandatory)][string]$Remote,
        [Parameter(Mandatory)][string]$Local
    )
    Assert-SealpiCreds
    $client = Get-SshClient
    if ($client -eq 'plink') {
        $pscpArgs = @('-batch', '-pw', $script:SealpiPass)
        if ($script:SealpiHostKey) { $pscpArgs += @('-hostkey', $script:SealpiHostKey) }
        $pscpArgs += @("$($script:SealpiUser)@$($script:SealpiHost):$Remote", $Local)
        & pscp.exe @pscpArgs
        if ($LASTEXITCODE -ne 0) { throw "SCP down failed (exit $LASTEXITCODE) for remote=$Remote local=$Local" }
    } else {
        & sshpass -e scp "$($script:SealpiUser)@$($script:SealpiHost):$Remote" $Local
        if ($LASTEXITCODE -ne 0) { throw "SCP down failed (exit $LASTEXITCODE) for remote=$Remote local=$Local" }
    }
}

function Invoke-SealpiScpUp {
    param(
        [Parameter(Mandatory)][string]$Local,
        [Parameter(Mandatory)][string]$Remote
    )
    Assert-SealpiCreds
    $client = Get-SshClient
    if ($client -eq 'plink') {
        $pscpArgs = @('-batch', '-pw', $script:SealpiPass)
        if ($script:SealpiHostKey) { $pscpArgs += @('-hostkey', $script:SealpiHostKey) }
        $pscpArgs += @($Local, "$($script:SealpiUser)@$($script:SealpiHost):$Remote")
        & pscp.exe @pscpArgs
        if ($LASTEXITCODE -ne 0) { throw "SCP up failed (exit $LASTEXITCODE) for local=$Local remote=$Remote" }
    } else {
        & sshpass -e scp $Local "$($script:SealpiUser)@$($script:SealpiHost):$Remote"
        if ($LASTEXITCODE -ne 0) { throw "SCP up failed (exit $LASTEXITCODE) for local=$Local remote=$Remote" }
    }
}
