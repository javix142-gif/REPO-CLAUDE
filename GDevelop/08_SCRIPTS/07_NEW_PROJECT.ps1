param([Parameter(Mandatory=$true)][string]$Destination,[switch]$InitGit)
$ErrorActionPreference="Stop"
$Root=(Resolve-Path(Join-Path $PSScriptRoot "..")).Path
$T=Join-Path $Root "06_PROJECT_TEMPLATES/GDEVELOP_PROJECT_AI_TEMPLATE"
if((Test-Path $Destination)-and((Get-ChildItem $Destination -Force -ErrorAction SilentlyContinue|Measure-Object).Count -gt 0)){throw "Destination not empty."}
New-Item -ItemType Directory -Force -Path $Destination|Out-Null
Copy-Item (Join-Path $T "*") $Destination -Recurse -Force
Copy-Item (Join-Path $T ".gitignore") $Destination -Force
if($InitGit){git -C $Destination init;git -C $Destination add .;git -C $Destination commit -m "chore: initialize GDevelop AI project scaffold"}
Write-Host "Created $Destination"
