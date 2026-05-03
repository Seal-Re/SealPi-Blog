# Emits an environment snapshot Markdown block to stdout.
# Used to populate the header of test/RESULT.md.

. "$PSScriptRoot/ssh-helpers.ps1"

$now = Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz'
$agent = @{
    OS         = (Get-CimInstance Win32_OperatingSystem).Caption + ' ' + (Get-CimInstance Win32_OperatingSystem).Version
    PowerShell = $PSVersionTable.PSVersion.ToString()
    Node       = (node --version 2>$null)
    Java       = (& java -version 2>&1 | Select-Object -First 1)
    Docker     = (docker --version 2>$null)
    K6         = (k6 version 2>$null | Select-Object -First 1)
}

$server = @{
    Uname  = (Invoke-SealpiSsh -Command 'uname -a')
    Docker = (Invoke-SealpiSsh -Command 'docker --version')
    Java   = (Invoke-SealpiSsh -Command 'docker exec sealpi-blog-start java -version 2>&1 | head -n1')
    Uptime = (Invoke-SealpiSsh -Command 'uptime')
}

@"
**Run window:** $now

**Agent host (Windows):**
- OS: $($agent.OS)
- PowerShell: $($agent.PowerShell)
- Node: $($agent.Node)
- Java: $($agent.Java)
- Docker: $($agent.Docker)
- k6: $($agent.K6)

**Server host (sealpi.cn):**
- $($server.Uname)
- $($server.Docker)
- App JVM: $($server.Java)
- $($server.Uptime)
"@
