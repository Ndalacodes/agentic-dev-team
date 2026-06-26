#!/usr/bin/env bash
# Apply the Agentic Dev Team branch-protection ruleset to a GitHub repo.
# Protects main + staging: changes must go through a reviewed PR, no force-push, no deletion.
# This is the remote-side enforcement of "never push to main" (the local hook is the backstop).
# Uses repository RULESETS so it works even before the staging branch exists.
#
# Requires: gh (authenticated). Usage:
#   scripts/setup-branch-protection.sh <owner/repo> [required_reviews]
# Example:
#   scripts/setup-branch-protection.sh Ndalacodes/agentic-dev-team 1
set -euo pipefail

REPO="${1:?usage: setup-branch-protection.sh <owner/repo> [required_reviews]}"
REVIEWS="${2:-1}"
NAME="agentic-dev-team-protect"

body() {
  cat <<JSON
{
  "name": "$NAME",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main", "refs/heads/staging"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request",
      "parameters": {
        "required_approving_review_count": $REVIEWS,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      } }
  ]
}
JSON
}

echo "Repo:    $REPO"
echo "Reviews: $REVIEWS approval(s) required on main + staging"

# Idempotent: update the ruleset if it already exists, else create it.
existing_id="$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name==\"$NAME\") | .id" 2>/dev/null || true)"

if [ -n "$existing_id" ]; then
  echo "Updating existing ruleset #$existing_id ..."
  body | gh api -X PUT "repos/$REPO/rulesets/$existing_id" --input - >/dev/null
else
  echo "Creating ruleset ..."
  body | gh api -X POST "repos/$REPO/rulesets" --input - >/dev/null
fi

echo "Done. Verify:"
echo "  gh api repos/$REPO/rulesets --jq '.[].name'"
echo "  (or: https://github.com/$REPO/settings/rules)"
