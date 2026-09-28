$ErrorActionPreference="Stop"
$Root=(Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Lock=Get-Content (Join-Path $Root "REPOS.lock.json") -Raw | ConvertFrom-Json
$state=@()
foreach($r in $Lock.repositories){
 $t=Join-Path $Root $r.target
 if(-not(Test-Path(Join-Path $t ".git"))){Write-Warning "Skip $($r.repo)";continue}
 git -C $t fetch origin $r.branch --prune
 git -C $t checkout $r.branch
 git -C $t pull --ff-only origin $r.branch
 $state += [pscustomobject]@{repo=$r.repo;branch=$r.branch;sha=(git -C $t rev-parse HEAD).Trim()}
}
$state|ConvertTo-Json -Depth 4|Set-Content(Join-Path $Root "CURRENT_REPOS.json") -Encoding UTF8
Write-Warning "Updated beyond pinned baseline; lock was not changed."
