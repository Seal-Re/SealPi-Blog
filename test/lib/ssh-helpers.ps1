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

function Get-ScpClient {
    # Preferred: pscp.exe (PuTTY native SCP, supports -pw/-hostkey/-batch)
    if (Get-Command pscp.exe -ErrorAction SilentlyContinue) { return 'pscp' }
    # Fallback: plink.exe as stdin/stdout transport (text files only)
    if (Get-Command plink.exe -ErrorAction SilentlyContinue) { return 'plink-stdin' }
    # Last resort: OpenSSH scp + sshpass (Linux/WSL)
    if ((Get-Command scp -ErrorAction SilentlyContinue) -and (Get-Command sshpass -ErrorAction SilentlyContinue)) { return 'scp' }
    throw "Neither pscp.exe, plink.exe (for stdin transport), nor scp+sshpass found in PATH."
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
    $client = Get-ScpClient
    if ($client -eq 'pscp') {
        $pscpArgs = @('-batch', '-pw', $script:SealpiPass)
        if ($script:SealpiHostKey) { $pscpArgs += @('-hostkey', $script:SealpiHostKey) }
        $pscpArgs += @("$($script:SealpiUser)@$($script:SealpiHost):$Remote", $Local)
        & pscp.exe @pscpArgs
        if ($LASTEXITCODE -ne 0) { throw "SCP down failed (exit $LASTEXITCODE) for remote=$Remote local=$Local" }
    } elseif ($client -eq 'plink-stdin') {
        # plink-stdin: stream remote file content via SSH stdout (text files only)
        $plinkArgs = @('-ssh', '-batch', '-pw', $script:SealpiPass)
        if ($script:SealpiHostKey) { $plinkArgs += @('-hostkey', $script:SealpiHostKey) }
        $plinkArgs += @("$($script:SealpiUser)@$($script:SealpiHost)", "cat '$Remote'")
        $content = & plink.exe @plinkArgs
        if ($LASTEXITCODE -ne 0) { throw "plink-stdin download failed (exit $LASTEXITCODE) for remote=$Remote local=$Local" }
        $content | Set-Content -LiteralPath $Local -Encoding utf8
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
    $client = Get-ScpClient
    if ($client -eq 'pscp') {
        $pscpArgs = @('-batch', '-pw', $script:SealpiPass)
        if ($script:SealpiHostKey) { $pscpArgs += @('-hostkey', $script:SealpiHostKey) }
        $pscpArgs += @($Local, "$($script:SealpiUser)@$($script:SealpiHost):$Remote")
        & pscp.exe @pscpArgs
        if ($LASTEXITCODE -ne 0) { throw "SCP up failed (exit $LASTEXITCODE) for local=$Local remote=$Remote" }
    } elseif ($client -eq 'plink-stdin') {
        # plink-stdin: stream local file content via SSH stdin (text files only).
        # Write LF-only bytes to a temp file, then feed it to plink via .NET
        # Process so we can redirect stdin without PowerShell pipeline CRLF mangling.
        $rawContent = (Get-Content -Raw -LiteralPath $Local) -replace "`r`n", "`n"
        $lfBytes = [System.Text.Encoding]::UTF8.GetBytes($rawContent)
        $tmpFile = [System.IO.Path]::GetTempFileName()
        try {
            [System.IO.File]::WriteAllBytes($tmpFile, $lfBytes)
            $plinkExe = (Get-Command plink.exe).Source
            # Build argument list; quote hostkey value to avoid splitting on spaces.
            $argList = @('-ssh', '-batch', '-pw', $script:SealpiPass)
            if ($script:SealpiHostKey) { $argList += @('-hostkey', $script:SealpiHostKey) }
            $argList += @("$($script:SealpiUser)@$($script:SealpiHost)", "cat > '$Remote'")
            # Escape each argument for ProcessStartInfo.Arguments string
            $escapedArgs = $argList | ForEach-Object {
                if ($_ -match '[\s"\\]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
            }
            $psi = [System.Diagnostics.ProcessStartInfo]::new($plinkExe, ($escapedArgs -join ' '))
            $psi.RedirectStandardInput = $true
            $psi.UseShellExecute = $false
            $proc2 = [System.Diagnostics.Process]::Start($psi)
            $stdinStream = [System.IO.FileStream]::new($tmpFile, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
            try { $stdinStream.CopyTo($proc2.StandardInput.BaseStream) } finally { $stdinStream.Close() }
            $proc2.StandardInput.Close()
            $proc2.WaitForExit()
            if ($proc2.ExitCode -ne 0) { throw "plink-stdin upload failed (exit $($proc2.ExitCode)) for local=$Local remote=$Remote" }
        } finally {
            Remove-Item -LiteralPath $tmpFile -ErrorAction SilentlyContinue
        }
    } else {
        & sshpass -e scp $Local "$($script:SealpiUser)@$($script:SealpiHost):$Remote"
        if ($LASTEXITCODE -ne 0) { throw "SCP up failed (exit $LASTEXITCODE) for local=$Local remote=$Remote" }
    }
}
