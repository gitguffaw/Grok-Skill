---
name: grok-router
description: Delegate host work to Grok through the grok-router companion runtime. Use when a host should call grok-companion rather than raw grok -p.
---

# Grok Router

```bash
node "<checkout>/plugins/grok-router/scripts/grok-companion.mjs" <command> [args...]
```

Resolve `<checkout>` from `GROK_ROUTER_ROOT`, then the current workspace, then a parent that contains that script.

Claude Code and Codex only. See `plugins/grok-router/skills/grok-router/SKILL.md`. Do not load this inside Grok TUI.
