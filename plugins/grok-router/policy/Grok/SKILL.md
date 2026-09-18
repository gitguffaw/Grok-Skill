---
name: Grok
description: Policy for Grok Router managed jobs. Hosts must call grok-companion, not invent grok argv.
---

# Grok policy

The installed `grok` binary is the source of truth. Probe `grok --help`, `grok models`, and `grok inspect --json` instead of pinning model ids, effort names, or flags.

## Boundaries

- Analyze / review / adversarial-review: `--tools "read_file,grep,list_dir"` (add `web_search,web_fetch` only when `--search`). Never `--always-approve`.
- Exec / write rescue: `--always-approve`. Do not use `--yolo` in recipes.
- Review has no native Grok subcommand. Embed a git diff. Focus text belongs on adversarial-review.
- Repeat posture flags on every `--resume` / `-c` turn. Resume does not inherit launch flags.
- Inner Grok tools, MCP, plugins, and subagents stay inside Grok.

See Workflows/Analyze.md, Exec.md, Review.md, Parallel.md, Session.md.
