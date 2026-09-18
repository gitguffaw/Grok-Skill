---
description: Run a policy-backed read-only Grok analysis job
argument-hint: '[--background] [--lean|--full] [--search] [--docs] [--tool <capability>] [--parallel] [--best|--model <id>] [--effort <level>] [prompt]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `analyze` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`

- This command is read-only.
- Do not edit files or apply patches yourself.
- Preserve --search, --docs, --tool, and --parallel exactly.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" analyze --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
