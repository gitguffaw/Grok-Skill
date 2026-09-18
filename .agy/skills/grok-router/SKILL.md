---
name: grok-router
description: Delegate Antigravity work to Grok through the grok-router companion runtime
---

# Grok Router for Antigravity

Do not run raw `grok -p` for delegated work unless the user explicitly asks for the raw CLI. Route through the companion:

```bash
node "<grok-router-checkout>/plugins/grok-router/scripts/grok-companion.mjs" <command> [arguments...]
```

Find the checkout in this order: `GROK_ROUTER_ROOT`, a workspace that contains `plugins/grok-router/scripts/grok-companion.mjs`, then search upward.

Before the first run: `... setup`. To pick a model: `... models`. Translate `/grok-router:*` follow-ups into those companion commands. Preserve `--model`, `--effort`, `--best`, `--lean`, `--full`, `--search`, `--docs`, `--tool`, `--parallel`, `--background`. `--wait` is only valid on `status`. `--lean` is router-owned (not a grok flag) and cannot combine with `--parallel`.

Read-only modes must not edit. Do not auto-fix review findings. Return companion stdout as-is.
