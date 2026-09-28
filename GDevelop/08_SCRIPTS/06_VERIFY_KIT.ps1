$ErrorActionPreference="Stop"
$Root=(Resolve-Path(Join-Path $PSScriptRoot "..")).Path
$Lock=Get-Content(Join-Path $Root "REPOS.lock.json") -Raw|ConvertFrom-Json
foreach($f in @("README.md","01_AI_CONTROL/AGENTS.md","02_SKILLS/local/gdevelop-project-orchestrator/SKILL.md","03_MCP/SECURITY_REVIEW.md","06_PROJECT_TEMPLATES/GDEVELOP_PROJECT_AI_TEMPLATE/README.md")){
 if(Test-Path(Join-Path $Root $f)){Write-Host "[OK] $f"}else{throw "Missing $f"}
}
foreach($r in $Lock.repositories){
 $t=Join-Path $Root $r.target
 if(Test-Path(Join-Path $t ".git")){
  $sha=(git -C $t rev-parse HEAD).Trim()
  if($sha -eq $r.commit){Write-Host "[PIN OK] $($r.repo)"}else{Write-Warning "[PIN MISMATCH] $($r.repo): $sha"}
 }else{Write-Warning "[NOT MATERIALIZED] $($r.repo)"}
}
