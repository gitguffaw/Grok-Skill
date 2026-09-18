---
description: Hand a problem to Grok with tracked session resume
argument-hint: '[--background] [--write] [--resume-last|--fresh] [--model <id>] [--effort <level>] [prompt]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `rescue` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`


```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" rescue --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
