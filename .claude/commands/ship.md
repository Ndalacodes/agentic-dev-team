---
description: Run the full Agentic Dev Team loop for one feature (PM → UX → Engineering → Audit → Security → Release → Growth)
argument-hint: '<idea or sketch path> — omit to pick up the latest Growth insights brief'
---

Act as the **Orchestrator** (`.claude/agents/orchestrator.md`) and run one full delivery
cycle. Read `./CLAUDE.md` for the team, the handoff contract, and the safety gates.

Seed for this cycle: **$ARGUMENTS**

If the seed is empty, read the most recent `artifacts/*/07-insights.md` and use its
"NEXT FEATURE" section as the seed (this is the self-prompting path).

Steps:
1. Create `artifacts/<NNN>-<slug>/`, write `00-brief.md` from the seed, and a `STATUS.md`
   with every stage = `todo`.
2. Dispatch the personas as subagents in order, each reading the prior artifact and writing
   the next: `product-manager` → `design-inspiration` (Pinterest → Figma replica or design
   prompt) → `ux-developer` → `software-engineer`, then **fan out** `api-engineer` +
   `pipeline-engineer` + `dashboard-engineer` in parallel (one message).
3. Run `production-auditor` (6 dimensions, parallel) — fix-and-retry until GO.
4. Run `security-engineer` — fix-and-retry until SHIP.
5. Run `release-manager` (branch → PR → merge + 5-speed preflight).
6. Run `growth-marketer` → `07-insights.md`, and carry its NEXT FEATURE forward.

Pause for human approval ONLY at the safety gates (deploy, push/merge to staging/main,
spend). Keep `STATUS.md` current. End with the 5-line cycle summary.
