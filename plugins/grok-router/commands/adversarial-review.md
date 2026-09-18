---
description: Run a steerable Grok review that challenges the approach
argument-hint: '[--background] [--lean|--full] [--base <ref>] [--best|--model <id>] [--effort <level>] [focus]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `adversarial-review` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`

- This command is read-only. Do not auto-fix findings.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" adversarial-review --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
