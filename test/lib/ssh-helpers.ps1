# SSH helpers for sealpi.cn server access.
# Reads creds from env: SEALPI_SSH_HOST, SEALPI_SSH_USER, SEALPI_SSH_PASS.
# Optional: SEALPI_SSH_HOSTKEY — plink -hostkey fingerprint (e.g. "ssh-ed25519 255 SHA256:...").
#   Required when the host key is not yet cached in PuTTY's registry (fresh plink install).
#   Obtain via: ssh-keyscan -t ed25519 <host>  (then note the fingerprint plink reports).
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
        & plink.exe @plinkArgs
    } else {
        # OpenSSH: requires sshpass (Linux/WSL) — on bare Windows, fall back to plink.
        if (-not (Get-Command sshpass -ErrorAction SilentlyContinue)) {
            throw "OpenSSH ssh available but sshpass not found. Install plink (PuTTY) for password auth."
        }
        & sshpass -e ssh -o StrictHostKeyChecking=accept-new "$($script:SealpiUser)@$($script:SealpiHost)" $Command
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
    } else {
        & sshpass -e scp "$($script:SealpiUser)@$($script:SealpiHost):$Remote" $Local
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
    } else {
        & sshpass -e scp $Local "$($script:SealpiUser)@$($script:SealpiHost):$Remote"
    }
}

Export-ModuleMember -Function Invoke-SealpiSsh, Invoke-SealpiScpDown, Invoke-SealpiScpUp
