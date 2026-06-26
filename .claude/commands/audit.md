---
description: Run the 6-dimension production-readiness audit (features, access-control, audit-log, data-isolation, design, telemetry) + the 5 speed checks
argument-hint: '[path or feature folder] — defaults to the current repo / latest feature'
---

Run the production-readiness audit defined in `./CLAUDE.md` §5. Target: **$ARGUMENTS**
(default: the current repo, or the latest `artifacts/*/` feature folder).

Dispatch the **`production-auditor`** agent **once per dimension, in parallel** (six agents
in a single message), each scoped to one of:
**features · access-control · audit-log · data-isolation · design · telemetry**.

Each returns a Pass/Warn/Fail verdict with file:line evidence and a named fix. Then:
- Synthesize a single `04-audit-report.md` scorecard with an overall **GO / NO-GO**.
- Fold in the 5 speed checks (indexing, image optimization, lazy loading, streaming,
  pagination) and flag any unjustified `// *-DEFERRED` comments.
- NO-GO if any dimension is Fail; list blocking findings with their owner so they can be
  dispatched and re-audited.

Do not edit code in this command — it reports. Fixes are dispatched to the relevant builder.
