---
description: Show the live Grok model catalog
argument-hint: '[--json] [--all]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `models` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`


```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" models --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
