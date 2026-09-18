---
description: Cancel an active Grok Router job
argument-hint: '[job-id] [--json]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `cancel` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`


```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" cancel --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
