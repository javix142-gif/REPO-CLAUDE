param([Parameter(Mandatory=$true)][string]$ProjectPath,[switch]$IncludeUpstreamReference)
$Root=(Resolve-Path(Join-Path $PSScriptRoot "..")).Path
$Dest=Join-Path $ProjectPath ".agents/skills";New-Item -ItemType Directory -Force -Path $Dest|Out-Null
Get-ChildItem(Join-Path $Root "02_SKILLS/local") -Directory|ForEach-Object{Copy-Item $_.FullName (Join-Path $Dest $_.Name) -Recurse -Force}
if($IncludeUpstreamReference){
 $up=Join-Path $Root "02_SKILLS/upstream/gdevelop-reference"
 if(-not(Test-Path(Join-Path $up "SKILL.md"))){throw "Run bootstrap first."}
 Copy-Item $up (Join-Path $Dest "gdevelop-reference") -Recurse -Force
}
Write-Host "Skills copied to $Dest. OpenCode discovers .agents/skills; other agents may need import/config."
