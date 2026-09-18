# Grok TUI sidecar

Do not install the Claude plugin into Grok. `setup` copies two named workflows to `~/.grok/workflows/`:

```
/workflow grok-router-review
/workflow grok-router-adversarial-review
```

They sit beside Grok's bundled `deep-research` and `learn-traces`. Fan-out is Grok's workflow engine, not `spawn_subagent` from the chat agent.

Claude and Codex still use `/grok-router:review --panel`.
