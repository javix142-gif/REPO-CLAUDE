$ErrorActionPreference="Stop"
$Root=(Resolve-Path(Join-Path $PSScriptRoot "..")).Path
$Lock=Get-Content(Join-Path $Root "REPOS.lock.json") -Raw|ConvertFrom-Json
foreach($r in $Lock.repositories){
 $t=Join-Path $Root $r.target
 if(Test-Path(Join-Path $t ".git")){
  git -C $t fetch origin $r.commit --depth 1
  git -C $t checkout --detach $r.commit
  Write-Host "[PINNED] $($r.repo)"
 } else { Write-Warning "Not a git checkout: $($r.repo)" }
}
