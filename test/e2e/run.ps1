$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path node_modules)) { npm install --silent }
    # PLAYWRIGHT_BROWSERS_PATH=0 stores browsers inside node_modules (avoids system-wide install issues on Windows)
    $env:PLAYWRIGHT_BROWSERS_PATH = '0'
    & npx playwright install --with-deps chromium
    & npx playwright test
} finally { Pop-Location }
