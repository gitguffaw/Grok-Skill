---
name: grok-cli-runtime
description: Internal helper contract for calling grok-companion from a host plugin or rescue subagent.
user-invocable: false
---

# Grok runtime

Primary helper:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" <command> [args...]
```

Prefer the helper over hand-rolled `grok -p` strings. Preserve `--model`, `--effort`, `--search`, `--docs`, `--tool`, `--parallel`, `--resume`, and `--fresh`. Strip host-only `--background` / `--wait` before calling `task`-style rescue if a watcher owns those flags.
