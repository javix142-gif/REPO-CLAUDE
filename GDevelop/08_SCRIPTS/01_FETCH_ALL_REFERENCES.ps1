param([switch]$Force)
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Lock = Get-Content (Join-Path $Root "REPOS.lock.json") -Raw | ConvertFrom-Json
$git = Get-Command git -ErrorAction SilentlyContinue

function Materialize-Repo($r) {
  $target = Join-Path $Root $r.target
  New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
  if (Test-Path (Join-Path $target ".git")) {
    git -C $target fetch --all --tags --prune
    git -C $target fetch origin $r.commit --depth 1
    git -C $target checkout --detach $r.commit
    Write-Host "[PINNED] $($r.repo)"
    return
  }
  if ((Test-Path $target) -and ((Get-ChildItem $target -Force | Measure-Object).Count -gt 1)) {
    if (-not $Force) { throw "Target not empty: $target. Review and rerun with -Force if appropriate." }
    Remove-Item $target -Recurse -Force
  }
  if ($git) {
    if (Test-Path $target) { Remove-Item $target -Recurse -Force }
    git clone --no-checkout $r.url $target
    git -C $target fetch origin $r.commit --depth 1
    git -C $target checkout --detach $r.commit
  } else {
    if (Test-Path $target) { Remove-Item $target -Recurse -Force }
    $zip = Join-Path $env:TEMP ($r.id + ".zip")
    $tmp = Join-Path $env:TEMP ($r.id + "-expand")
    Remove-Item $zip -Force -ErrorAction SilentlyContinue
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Invoke-WebRequest -Uri "https://github.com/$($r.repo)/archive/$($r.commit).zip" -OutFile $zip
    Expand-Archive $zip $tmp
    Move-Item (Get-ChildItem $tmp | Select-Object -First 1).FullName $target
    Remove-Item $zip -Force
    Remove-Item $tmp -Recurse -Force
  }
}
foreach ($r in $Lock.repositories) { Materialize-Repo $r }
Write-Host "All pinned repositories materialized."
