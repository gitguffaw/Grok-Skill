---
description: Show installed grok version, help, and router coverage
argument-hint: '[--json]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `surface` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`


```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" surface --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
