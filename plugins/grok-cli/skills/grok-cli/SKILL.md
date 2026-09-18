---
name: grok-cli
description: Drive the installed Grok CLI directly when the user wants the raw grok binary or the minimal grok-cli skill without Router job tracking. Do not use this skill when grok-router is installed or the user asks for /grok-router:*, managed jobs, status/result/cancel, or context packs — defer to that plugin.
---

# Grok CLI

Operate Grok like a careful human CLI user. The installed `grok` binary owns authentication, models, sessions, tools, plugins, and execution.

## Prefer Grok Router when present

If the `grok-router` plugin is installed, or the user asks for `/grok-router:*`, managed jobs, status/result/cancel, rescue, or context packs, stop using this skill and follow `grok-router`.

If this session is already Grok, do not load this skill to "become Grok." Work in-session.

## Preflight

Probe only what the request needs:

```bash
grok --version
grok --help
grok <cmd> --help
grok models
grok inspect --json
```

Treat CLI help and `grok models` as authoritative over this skill. Do not hard-code model ids, effort names, or flag lists.

## Modes

- Repo unknowns, no edits → `grok -p "<q>" --tools "read_file,grep,list_dir"`
- Bounded deliverable → `grok -p "<task>" --always-approve`
- Findings only → same read-only allowlist (a denylist must include `write`)
- Role-split work → ask for subagents in the prompt
- Work spans calls → `--output-format json`, capture `sessionId`, continue with `--resume` / `-c`. Repeat posture flags every turn.

Do not drive the interactive TUI from the host. Prefer `--always-approve` over `--yolo`. Inspect the result (diff, findings, or JSON `.text`) when the run returns.
