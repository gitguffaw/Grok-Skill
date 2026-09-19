---
description: Check whether Grok Router can run the local grok CLI
argument-hint: '[--json]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `setup` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`


```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" setup --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
