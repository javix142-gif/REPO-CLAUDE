param([Parameter(Mandatory=$true)][string]$Query,[int]$MaxResults=100)
$Root=(Resolve-Path(Join-Path $PSScriptRoot "..")).Path
$targets=@("04_OFFICIAL_REFERENCES/GDevelop-documentation","04_OFFICIAL_REFERENCES/GDevelop-examples","04_OFFICIAL_REFERENCES/GDevelop-extensions","04_OFFICIAL_REFERENCES/GDevelop-tutorials","02_SKILLS/upstream/gdevelop-reference")
$r=@()
foreach($rel in $targets){
 $p=Join-Path $Root $rel
 if(Test-Path $p){$r+=Get-ChildItem $p -Recurse -File -ErrorAction SilentlyContinue|Where-Object{$_.Length -lt 5MB}|Select-String -Pattern $Query -SimpleMatch -ErrorAction SilentlyContinue}
}
$r|Select-Object -First $MaxResults Path,LineNumber,Line|Format-Table -AutoSize -Wrap
