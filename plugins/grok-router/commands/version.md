---
description: Show Grok Router and grok CLI versions
argument-hint: '[--json]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `version` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`


```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" version --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
