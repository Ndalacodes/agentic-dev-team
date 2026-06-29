# Agentic Dev Team

A **self-prompting** software delivery system for Claude Code. Five AI personas mirror a
real product team and ship features end-to-end — sketch → design → code → audit → security
→ release → analytics → next idea — handing off through artifacts on disk so the system
prompts itself.

Read **[CLAUDE.md](CLAUDE.md)** for the full operating manual. This README is the quickstart.

## The team

| Persona | Agent | Superpower |
|---------|-------|-----------|
| Product Manager (multimodal) | `product-manager` | sketch/idea → PRD + clickable wireframe |
| ↳ Design Inspiration scout | `design-inspiration` | Pinterest moodboard → Figma replica (or a design prompt) |
| UI/UX Developer (Plan Mode + Figma) | `ux-developer` | PRD + inspiration → production design system + screens |
| Software Engineer (GCP Skills + Dev Doc MCP) | `software-engineer` | cloud architecture + fans out 3 builders |
| ↳ builders (parallel) | `api-engineer`, `pipeline-engineer`, `dashboard-engineer` | API · ingestion · dashboard |
| Security Engineer (Hooks) | `security-engineer` | OWASP + IAM review, owns the deploy gate |
| Growth Marketer (BigQuery) | `growth-marketer` | live analytics → next-feature brief (the self-prompt) |
| — Production Auditor | `production-auditor` | 6-dimension production-readiness gate |
| — Release Manager | `release-manager` | branch → PR → merge + 5 speed checks |

## Run it

```
/ship "a feedback app that lets users rate a session 1–5 and leave a comment"
/ship                 # no arg → picks up the latest Growth insights brief (self-prompting)
/audit                # standalone 6-dimension production-readiness audit
/release              # branch → PR → merge with the 5-speed preflight
/insights             # Growth analysis → next-cycle brief

/loop 6h /ship        # hands-free: ship the next feature every 6 hours
```

## What's enforced

- **Autonomy + safety gates** — the loop runs itself and pauses for a human only at:
  cloud **deploy**, **push/merge to staging/main**, and **spend**.
- **Never push to main** — `feature → dev → staging → main`, via PR every time
  (`guard-protected-branch.mjs` hook + the Release Manager).
- **Production-readiness audit** — features · access-control · audit-log · data-isolation ·
  design · telemetry, plus the 5 speed checks (indexing, WebP, lazy load, streaming,
  pagination). A `Fail` blocks release.
- **No secrets on disk** — `secret-scan.mjs` hook.
- Inherits your global rules (Scaling-5, Security-10, Telemetry-from-day-1, Design tooling).

## Layout

```
CLAUDE.md                 # operating manual (the orchestrator's brain)
.claude/agents/           # the 11 persona + support agents
.claude/commands/         # /ship /audit /release /insights
.claude/hooks/            # the 3 safety-gate hooks (Node)
.claude/settings.json     # wires the hooks
artifacts/                # per-feature handoff folders (the shared memory)
```

## MCP servers

| Server | What | How it's wired |
|--------|------|----------------|
| **BigQuery** | live analytics for the Growth Marketer | `.mcp.json` → local Google MCP Toolbox on your `gcloud` ADC (no stored secret). Tested working. |
| **Dev Knowledge** | fresh GCP/Firebase docs for the Software Engineer | `.mcp.json` → Google's remote MCP. **Run `/mcp` once to authenticate.** |
| **magic** (21st.dev) | UI component scaffolding for the UX Developer | global `~/.claude.json` |
| **Figma** | design source of truth for the UX Developer | app connector |

Agents load these on demand via ToolSearch; if one isn't connected, that agent says so
rather than guessing. Change `BIGQUERY_PROJECT` / `X-goog-user-project` in
[.mcp.json](.mcp.json) per project.

## Install into another project

The agents and commands are mirrored to `~/.claude` so the personas and `/ship` work in any
project. To get the **full loop + safety hooks + MCP servers** in a new repo, run the
installer (copies `CLAUDE.md`, `.claude/hooks/`, `.claude/settings.json`, `.mcp.json`, and
the artifacts contract — never clobbering existing config):

```powershell
scripts\install-team.ps1 -Target "D:\Code\my-app" -GcpProject "my-gcp-project"
```
```bash
scripts/install-team.sh /path/to/my-app my-gcp-project   # bash equivalent
```

(The hooks are intentionally project-scoped, not global, so deploy/branch guards don't fire
in repos that don't want them.)

## Branch protection on the remote

The local hook blocks pushes to `main`/`staging`; the remote needs matching rules. Apply the
ruleset (PR + review required, no force-push, no deletion — works before `staging` even
exists) with:

```bash
scripts/setup-branch-protection.sh <owner/repo> 1
```
