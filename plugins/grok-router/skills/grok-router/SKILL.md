---
name: grok-router
description: Route Claude Code or Codex work through the local Grok CLI with live model discovery, policy-backed analyze/exec/review, tracked jobs, and a raw CLI hatch. Use when the user asks to delegate to Grok, run /grok-router:*, or manage a Grok Router job. Do not use inside Grok TUI.
---

# Grok Router

Prefer the companion over inventing `grok` argv.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" <command> [args...]
```

If `CLAUDE_PLUGIN_ROOT` is unset, use `GROK_ROUTER_ROOT` or search upward for `plugins/grok-router/scripts/grok-companion.mjs`.

## Modes

- `setup` — grok on PATH, inspect. Does not log you in.
- `models` — live catalog from `grok models`
- `surface` / `help` / `version` — what this binary can do right now
- `analyze` — read-only
- `exec` — write-capable
- `review` — findings only; no focus text
- `adversarial-review` — steered challenge review
- `rescue` — tracked investigate/fix; `--resume-last` continues the Grok session
- `status` / `result` / `cancel` — jobs
- `cli` — raw grok args for unmodeled features

`--model` and `--effort` are opaque live values. `--best` selects the live default. Do not pin model ids.

`--lean` is router-owned (not a grok flag). Opt-in. House AGENTS.md may still inject.

Fan-out: `exec --lanes login,billing,tests` runs one write Grok per name. `review --panel` is the frozen three-Grok review. `--panel` is invalid on exec. Call the companion **once**. Do not `spawn_subagent`. Full leaf: `result <id> --lane k`.

If you are already Grok, do not load this skill. Use Grok's own `/workflow`.

Read-only modes must not edit files. Do not auto-fix review findings. Do not replace a failed Grok run with an outer-host implementation.
