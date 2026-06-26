---
description: Branch → PR → merge workflow (feature → dev → staging → main) with the 5-speed preflight and branch protection
argument-hint: '[feature slug] — defaults to current work'
---

Act as the **`release-manager`** agent and ship the current work safely per `./CLAUDE.md`
§6. Target: **$ARGUMENTS** (default: current branch / latest feature).

Enforce, in order:
1. **Never push to `main`.** If not a git repo yet, `git init` and create `dev`, `staging`,
   `main`. Put work on `feature/<NNN>-<slug>`.
2. **5-speed preflight** (block the `staging` PR on any failure): indexing · image
   optimization (WebP) · lazy loading · response streaming · pagination. Also grep
   production source for `console.log(` and block on hits.
3. Open PRs `feature → dev → staging → main`, each promotion via PR; `staging`/`main`
   require review and have branch protection configured on the remote (use `gh`).
4. **Safety gate:** pushing/merging to `staging`/`main` and any deploy are human-approved —
   the hooks will block them; surface a one-line approval request with the PR link and wait.

Write `06-release.md`: branch, PR links, the 5-speed checklist results, branch-protection
status, and the merge/deploy record (or pending approval). Use the required commit/PR
trailers.
