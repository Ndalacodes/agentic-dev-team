# artifacts/

This is the **shared memory** of the Agentic Dev Team. Every feature the team builds gets
one folder here, and the numbered files inside it are how the personas talk to each other.

> The artifact is the prompt. Each stage reads the previous file and writes the next one —
> no human sits in the middle relaying messages. That is what makes the system
> self-prompting.

## Layout

```
artifacts/
  <NNN>-<feature-slug>/
    STATUS.md             # the pipeline board (orchestrator keeps it current)
    00-brief.md           # the seed: a human idea, a sketch reference, or Growth's next-feature
    01-prd.md             # Product Manager
    wireframe.html        # Product Manager (open in a browser)
    02-inspiration.md     # Design Inspiration scout (Pinterest moodboard → Figma replica or design prompt)
    02-inspiration/       # Design Inspiration scout (saved reference screenshots: ref-N.png)
    02-design-spec.md     # UI/UX Developer
    03-architecture.md    # Software Engineer (tech lead)
    03a-api/              # API Engineer code + notes
    03b-pipeline/         # Pipeline Engineer code + notes
    03c-dashboard/        # Dashboard Engineer code + notes
    04-audit-report.md    # Production Auditor (6 dimensions)
    05-security-report.md # Security Engineer
    06-release.md         # Release Manager (branch/PR/merge + speed checks)
    07-insights.md        # Growth Marketer → seeds the NEXT cycle
```

## Conventions

- `<NNN>` is a zero-padded counter (`001`, `002`, …). The orchestrator picks the next one.
- `<feature-slug>` is kebab-case, ≤ 5 words (`001-feedback-app`, `002-csat-trends`).
- A stage that can't find its input artifact marks itself `blocked` in `STATUS.md` and
  stops — it never invents upstream work.
- To resume an interrupted cycle, open the feature's `STATUS.md` and continue from the
  first row that isn't `done`.

## STATUS.md template

```markdown
# 001-feedback-app — pipeline status

| Stage | Owner | State | Artifact |
|-------|-------|-------|----------|
| Brief | human/growth | done    | 00-brief.md |
| PRD | product-manager | done    | 01-prd.md |
| Inspiration | design-inspiration | done | 02-inspiration.md |
| Design | ux-developer | doing   | 02-design-spec.md |
| Architecture | software-engineer | todo | 03-architecture.md |
| Build:API | api-engineer | todo  | 03a-api/ |
| Build:Pipeline | pipeline-engineer | todo | 03b-pipeline/ |
| Build:Dashboard | dashboard-engineer | todo | 03c-dashboard/ |
| Audit | production-auditor | todo | 04-audit-report.md |
| Security | security-engineer | todo | 05-security-report.md |
| Release | release-manager | todo | 06-release.md |
| Insights | growth-marketer | todo | 07-insights.md |
```
