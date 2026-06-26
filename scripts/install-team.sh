#!/usr/bin/env bash
# Install the Agentic Dev Team framework (full loop + safety hooks) into another repo.
# Copies CLAUDE.md, .claude/hooks/, .claude/settings.json, .mcp.json, artifacts/README.md.
# Agents + commands are already global (~/.claude) and are NOT copied.
# Existing settings.json / .mcp.json are never clobbered — written as *.agentic.json instead.
#
# Usage: scripts/install-team.sh <target-repo-dir> [gcp-project-id]
set -euo pipefail

TARGET="${1:?usage: install-team.sh <target-repo-dir> [gcp-project-id]}"
GCP="${2:-}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"

[ -d "$TARGET" ] || { echo "Target does not exist: $TARGET" >&2; exit 1; }
mkdir -p "$TARGET/.claude/hooks" "$TARGET/artifacts"

cp -f "$SRC/CLAUDE.md"             "$TARGET/CLAUDE.md"
cp -f "$SRC/.claude/hooks/"*.mjs   "$TARGET/.claude/hooks/"
cp -f "$SRC/artifacts/README.md"   "$TARGET/artifacts/README.md"
echo "  + CLAUDE.md, .claude/hooks/, artifacts/README.md"

copy_or_sidecar() {
  local rel="$1" from="$SRC/$1" to="$TARGET/$1"
  if [ -e "$to" ]; then
    cp -f "$from" "$to.agentic.json"
    echo "  ! $rel exists -> wrote $(basename "$to").agentic.json; merge manually."
  else
    cp -f "$from" "$to"; echo "  + $rel"
  fi
}
copy_or_sidecar ".claude/settings.json"
copy_or_sidecar ".mcp.json"

if [ -n "$GCP" ] && [ -f "$TARGET/.mcp.json" ]; then
  sed -i.bak "s/echo-73ca9/$GCP/g" "$TARGET/.mcp.json" && rm -f "$TARGET/.mcp.json.bak"
  echo "  ~ .mcp.json GCP project -> $GCP"
fi

echo ""
echo "Done. In the target repo: /ship is ready (agents are global);"
echo "run /mcp once to authenticate dev-knowledge; the safety hooks are active."
