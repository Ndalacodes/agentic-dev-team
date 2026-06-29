<#
.SYNOPSIS
  Install the Agentic Dev Team framework (full loop + safety hooks) into another repo.

.DESCRIPTION
  Copies the portable pieces into a target repo:
    CLAUDE.md              operating manual (the orchestrator's brain)
    .claude/hooks/         the 3 safety-gate hooks
    .claude/settings.json  wires the hooks
    .mcp.json              BigQuery + Dev Knowledge MCP servers
    artifacts/README.md    the handoff contract (+ creates artifacts/)
  The 11 agents and 4 commands are already global (~/.claude), so they are NOT copied.
  If the target already has a .claude/settings.json or .mcp.json, the new file is written
  alongside as *.agentic.json and you merge by hand (we never clobber your config).

.EXAMPLE
  ./install-team.ps1 -Target "D:\Code\my-app"
  ./install-team.ps1 -Target "D:\Code\my-app" -GcpProject "my-gcp-project"
#>
param(
  [Parameter(Mandatory = $true)][string]$Target,
  [string]$GcpProject
)

$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $PSScriptRoot   # repo root (this script lives in scripts/)

if (-not (Test-Path $Target)) { throw "Target does not exist: $Target" }
New-Item -ItemType Directory -Force -Path (Join-Path $Target ".claude\hooks") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Target "artifacts") | Out-Null

# 1) CLAUDE.md
Copy-Item (Join-Path $src "CLAUDE.md") (Join-Path $Target "CLAUDE.md") -Force
# 2) hooks
Copy-Item (Join-Path $src ".claude\hooks\*.mjs") (Join-Path $Target ".claude\hooks") -Force
# 3) artifacts contract
Copy-Item (Join-Path $src "artifacts\README.md") (Join-Path $Target "artifacts\README.md") -Force

function Copy-OrSidecar([string]$rel) {
  $from = Join-Path $src $rel
  $to   = Join-Path $Target $rel
  if (Test-Path $to) {
    $side = "$to.agentic.json"
    Copy-Item $from $side -Force
    Write-Host "  ! $rel already exists -> wrote $([IO.Path]::GetFileName($side)); merge manually." -ForegroundColor Yellow
  } else {
    Copy-Item $from $to -Force
    Write-Host "  + $rel"
  }
}
# 4) settings.json (hooks)
Copy-OrSidecar ".claude\settings.json"
# 5) .mcp.json — from the tracked example (.mcp.json itself is gitignored)
$mcpDest = Join-Path $Target ".mcp.json"
if (Test-Path $mcpDest) {
  Copy-Item (Join-Path $src ".mcp.json.example") "$mcpDest.agentic.json" -Force
  Write-Host "  ! .mcp.json exists -> wrote .mcp.json.agentic.json; merge manually." -ForegroundColor Yellow
} else {
  Copy-Item (Join-Path $src ".mcp.json.example") $mcpDest -Force
  Write-Host "  + .mcp.json (from example)"
}

# Optionally retarget the GCP project in the freshly written .mcp.json
if ($GcpProject) {
  $mcp = Join-Path $Target ".mcp.json"
  if (Test-Path $mcp) {
    (Get-Content $mcp -Raw) -replace 'your-gcp-project-id', $GcpProject | Set-Content $mcp -Encoding utf8
    Write-Host "  ~ .mcp.json GCP project -> $GcpProject"
  }
}

Write-Host "`nDone. In the target repo:" -ForegroundColor Green
Write-Host "  - agents/commands are global already (/ship, /audit, /release, /insights)"
Write-Host "  - run /mcp once to authenticate dev-knowledge"
Write-Host "  - the deploy / branch / secret hooks are now active there"
