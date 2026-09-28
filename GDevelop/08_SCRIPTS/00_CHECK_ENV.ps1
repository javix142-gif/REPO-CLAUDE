$ErrorActionPreference = "Stop"
Write-Host "GDevelop AI Master Kit - Environment check"
foreach ($cmd in @("git","node","npm","powershell")) {
  $found = Get-Command $cmd -ErrorAction SilentlyContinue
  if ($found) { Write-Host "[OK] $cmd -> $($found.Source)" } else { Write-Warning "[MISSING] $cmd" }
}
$g = Get-Command "GDevelop" -ErrorAction SilentlyContinue
if ($g) { Write-Host "[OK] GDevelop CLI -> $($g.Source)" } else { Write-Host "[INFO] GDevelop CLI no encontrado en PATH." }
