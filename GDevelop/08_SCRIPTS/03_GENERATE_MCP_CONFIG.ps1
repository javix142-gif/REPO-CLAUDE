$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$McpIndex = (Join-Path $Root "03_MCP/gdevelop-mcp-server/src/index.js").Replace("\","/")
$GD = (Join-Path $Root "04_OFFICIAL_REFERENCES/GDevelop-engine-source").Replace("\","/")
$Out = Join-Path $Root "generated"; New-Item -ItemType Directory -Force -Path $Out | Out-Null
$toml = @"
[mcp_servers.gdevelop]
command = "node"
args = ["$McpIndex"]

[mcp_servers.gdevelop.env]
GDEVELOP_ROOT = "$GD"
"@
Set-Content (Join-Path $Out "codex-gdevelop-mcp.toml") $toml -Encoding UTF8
@{mcpServers=@{gdevelop=@{command="node";args=@($McpIndex);env=@{GDEVELOP_ROOT=$GD}}}} |
 ConvertTo-Json -Depth 6 | Set-Content (Join-Path $Out "generic-mcp.json") -Encoding UTF8
Write-Host "Generated MCP snippets in $Out. Review before merging into agent config."
