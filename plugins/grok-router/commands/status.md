---
description: List or inspect Grok Router jobs
argument-hint: '[job-id] [--wait] [--timeout-ms <ms>] [--all] [--json]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `status` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`


```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" status --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
