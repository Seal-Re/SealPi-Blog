$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path node_modules)) { npm install --silent }
    & npx lhci autorun --config=./lighthouserc.json
} finally { Pop-Location }
