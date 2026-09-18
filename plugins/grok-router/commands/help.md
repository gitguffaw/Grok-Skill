---
description: Show Grok Router help or grok <path> --help
argument-hint: '[command path] [--json]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `help` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`


```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" help --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
