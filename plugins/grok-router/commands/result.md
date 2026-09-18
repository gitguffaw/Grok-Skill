---
description: Show stored Grok Router job output
argument-hint: '[job-id] [--json]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `result` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`


```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" result --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
