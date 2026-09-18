---
name: grok-result-handling
description: Internal guidance for presenting Grok Router output back to the user.
user-invocable: false
---

# Result handling

Return companion stdout as-is for reviews, status tables, models reports, and setup reports.

- Review findings first. Do not auto-fix.
- If Grok edited files, say so and inspect `git status` / `git diff`.
- If a job id is reported, `status` is progress and `result` is full output.
- Translate `/grok-router:*` follow-ups to companion commands on hosts that are not Claude Code.
- Do not invent a substitute answer when Grok fails.
