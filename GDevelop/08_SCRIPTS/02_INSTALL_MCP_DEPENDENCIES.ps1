param([switch]$IUnderstand)
$ErrorActionPreference = "Stop"
if (-not $IUnderstand) { throw "Review 03_MCP/SECURITY_REVIEW.md and rerun with -IUnderstand." }
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Mcp = Join-Path $Root "03_MCP/gdevelop-mcp-server"
$GD = Join-Path $Root "04_OFFICIAL_REFERENCES/GDevelop-engine-source"
if (-not (Test-Path (Join-Path $Mcp "package.json"))) { throw "MCP missing; run bootstrap." }
if (-not (Test-Path (Join-Path $GD "newIDE/app/package.json"))) { throw "GDevelop source missing; run bootstrap." }
Push-Location $Mcp; npm ci; Pop-Location
Push-Location (Join-Path $GD "newIDE/app"); npm install; Pop-Location
Write-Host "Dependencies installed."
