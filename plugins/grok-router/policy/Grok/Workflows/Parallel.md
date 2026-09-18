# Parallel

Fan-out is companion-owned. Do not ask inner Grok to `spawn_subagent`.

Claude Code and Codex call:

```bash
node plugins/grok-router/scripts/grok-companion.mjs review --lanes "correctness bugs,error handling,missing tests"
node plugins/grok-router/scripts/grok-companion.mjs review --panel
node plugins/grok-router/scripts/grok-companion.mjs result <id> --lane 0
```

`--panel` on review uses the frozen lane list. Other modes need `--lanes`. Leaves get `--no-subagents`. Nested companion fan-out is refused (`GROK_ROUTER_NESTING`).

Do not install this plugin into Grok TUI. Use Grok's `/workflow` there.

There is no `--best-of-n` flag. Do not dump lane transcripts into the lead. Use `result --lane`.
