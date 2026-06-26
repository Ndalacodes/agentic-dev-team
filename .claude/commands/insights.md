---
description: Run the Growth Marketer analysis on live data (BigQuery/Looker) and produce the next-cycle feature brief
argument-hint: '[feature folder] — defaults to the latest shipped feature'
---

Act as the **`growth-marketer`** agent per `./CLAUDE.md`. Target: **$ARGUMENTS** (default:
the latest shipped feature folder).

Using the **BigQuery MCP** (load via ToolSearch `bigquery`) and Looker where available:
- Compute the KPI snapshot (DAU/WAU/MAU, conversion funnel, feature usage, retention) and
  the PRD's success metrics — show the queries.
- Identify the single top insight, evidence-backed, no PII.
- Write `07-insights.md`, ending with a concrete, scoped **NEXT FEATURE** brief.

Then **copy that NEXT FEATURE section into a fresh `00-brief.md`** for the next cycle so the
loop can re-prompt itself (or hand it to `/ship` / the next `/loop` tick). Report the top
insight and the proposed next feature in 3 lines.
