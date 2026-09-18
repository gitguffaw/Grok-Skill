---
description: Run a findings-only Grok review of a git diff
argument-hint: '[--panel|--lanes <a,b>] [--background] [--lean|--full] [--base <ref>] [--best|--model <id>] [--effort <level>]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run a Grok Router `review` command through the shared companion.

Raw slash-command arguments:
`$ARGUMENTS`

- This command is read-only. Focus text is an error; use adversarial-review.
- Preserve `--lean`, `--full`, `--panel`, and `--lanes`.
- `--panel` / `--lanes` is companion-owned fan-out. Call this command once. Do not spawn_subagent. Do not dump lane transcripts; stdout is a bounded synthesis.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/grok-companion.mjs" review --raw-arg-string "$ARGUMENTS"
```

Return the command stdout verbatim, exactly as-is.
