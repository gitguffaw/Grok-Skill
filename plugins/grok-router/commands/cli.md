---
description: Pass an unmodeled command to the local grok binary
argument-hint: '[--allow-mutating] <grok args...>'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `cli` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`

- Do not use cli as a substitute for analyze, exec, review, or rescue.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" cli --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
