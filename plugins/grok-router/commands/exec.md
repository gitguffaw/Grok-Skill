---
description: Run a policy-backed write-capable Grok execution job
argument-hint: '[--background] [--lean|--full] [--search] [--docs] [--tool <capability>] [--parallel] [--best|--model <id>] [--effort <level>] [prompt]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `exec` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`

- This command may edit the repository through Grok.
- Do not substitute an outer-host implementation if Grok fails.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" exec --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
