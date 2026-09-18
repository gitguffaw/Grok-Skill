# Grok Launch Patterns

Use these when Claude should drive inner Grok with explicit controls. Everything routes through headless `grok -p`.

## Preflight

```bash
grok --help
grok <cmd> --help
grok models
grok mcp list
grok plugin list
grok inspect
```

Probe before assuming models, tools, MCP servers, plugins, or features. Source of truth: binary help > user-guide > root `~/.grok/*.md` > skill.

## Model Resolution

Do not preserve a static default model in reusable launch patterns. Resolve at launch.

```bash
grok models
```

Inherit the local default when the user does not care which model runs. For the strongest run, pair the strongest available model with high reasoning effort:

```bash
grok -p "<prompt>" -m <MODEL> --reasoning-effort <high|xhigh>
```

Use a fast model only when speed or cost outweighs capability, and only if `grok models` currently lists one. The available list is volatile — resolve it every time.

## Read-Only Analysis

Bare `grok -p` without `--tools` injects write/shell. Use it only when unrestricted tools are intentional (pure web-external Q&A). In a repo, use the allowlist.

```bash
grok -p "<question>" --tools "read_file,grep,list_dir"
grok -p "<question>" --tools "read_file,grep,list_dir,web_search,web_fetch" -m <MODEL> --reasoning-effort high
```

## Bounded Execution

```bash
grok -p "<prompt>" --always-approve
grok -p "<prompt>" -m <MODEL> --reasoning-effort xhigh --always-approve
```

Put tests, lint, and acceptance checks in the prompt. There is no `--check` flag.

## Findings-Only Review

Prefer read-only allowlist. Denylist form must include `write` or edits can still land via the separate `write` tool.

```bash
grok -p "Review for regressions, edge cases, and missing error handling. Findings only.

$(git diff)" --tools "read_file,grep,list_dir"
grok -p "Review the uncommitted changes. Findings only." --tools "read_file,grep,list_dir"
# secondary denylist (must include write):
grok -p "Review. Findings only.

$(git diff)" --disallowed-tools "search_replace,write,run_terminal_cmd"
```

## Subagent Orchestration

```bash
grok -p "Use subagents. Spawn explore, then an implementer-persona agent, then a reviewer-persona agent. Task: <goal>." --always-approve
grok -p "<task>" --no-subagents
grok -p "<task>" --disallowed-tools "Agent(plan)"
```

Subagents are enabled by default. Ask for them in the prompt when you want role-split work; disable with `--no-subagents`. The parent can also spawn on its own.

## Independent Attempts

There is no `--best-of-n` flag. For N independent tries, launch N separate `grok -p` runs (host-side) or ask inner Grok to spawn independent subagents.

```bash
grok -p "<task>" --always-approve
# repeat as separate processes, then compare results
```

## Multi-Turn / Machine-Readable Sessions

Capture auto session id, then resume. Session flags and `--output-format json` are the spine. Keep the same tool and approval posture as the matching mode. Repeat `--tools` or `--always-approve` on every turn — resume does not inherit the previous launch's flags.

Writing turns (edits expected) — § Bounded Execution plus session flags:

```bash
SID=$(grok -p "<turn 1>" --output-format json --always-approve | jq -r '.sessionId')
grok -p "<turn 2>" --resume "$SID" --output-format json --always-approve | jq -r '.text'
grok -p "<next>" -c --output-format json --always-approve
```

Findings-only turns (no edits) — § Findings-Only Review plus session flags. Omit `--always-approve`; a findings prompt with default tools can still write.

```bash
SID=$(grok -p "<turn 1>" --output-format json --tools "read_file,grep,list_dir" | jq -r '.sessionId')
grok -p "<turn 2>" --resume "$SID" --output-format json --tools "read_file,grep,list_dir" | jq -r '.text'
```

Optional create-only UUID (must be valid UUID; must not exist). Later turns always use `--resume` / `-c` — never reuse `-s`. Repeat `--tools` on every turn (shown). Writing turns use `--always-approve` instead.

```bash
UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
grok -p "<turn 1>" -s "$UUID" --output-format json --tools "read_file,grep,list_dir"
grok -p "<turn 2>" --resume "$UUID" --output-format json --tools "read_file,grep,list_dir"
```

Fork on resume (optional new UUID via `-s`). Repeat `--tools` or `--always-approve` on the fork.

```bash
FORK=$(uuidgen | tr '[:upper:]' '[:lower:]')
grok -p "<branch>" --resume "$SID" --fork-session -s "$FORK" --output-format json --tools "read_file,grep,list_dir"
```

Structured output:

```bash
grok -p "<task>" --json-schema '{"type":"object","properties":{"ok":{"type":"boolean"}},"required":["ok"]}'
```

Streaming:

```bash
grok -p "<task>" --output-format streaming-json
grok -p "<task>" --output-format streaming-messages-json
grok -p "<task>" --output-format streaming-messages-json --include-partial-messages
```

## Permission Posture

```bash
grok -p "<task>" --always-approve                          # unattended, trusted, well-scoped
grok -p "<task>" --allow "Bash(npm*)" --deny "Bash(sudo*)" # gate execution by rule
grok -p "<task>" --permission-mode plan                    # enum accepted; headless plan enforcement NOT proven — prefer prompt + read-only --tools
grok -p "<task>" --sandbox <PROFILE>                       # OS-level fs/network guardrails
```

`--permission-mode plan` is listable from help but other modes (except `bypassPermissions` / always-approve / `default` wiring) are often accepted without full CLI enforcement. Do not treat `plan` alone as plan-first / no-edits in headless; use prompt discipline + `--tools "read_file,grep,list_dir"` (and avoid `--always-approve`) when edits must not happen.

## Determinism / Isolation

```bash
grok -p "<task>" --disable-web-search                      # disables web_search/web_fetch only; X search + image tools may remain
grok -p "<task>" --tools "read_file,grep,list_dir"         # stronger isolation: tight allowlist
grok -p "<task>" --cwd <existing-worktree-path> --always-approve
grok -p "<task>" --rules "Never delete files. Keep public APIs stable."
```

Do not pass `-w` on `grok -p` expecting a new worktree. Create or resume a worktree outside headless, then `--cwd` into it, or ask inner Grok to spawn a subagent with worktree isolation.

## CI / Unattended

CI adds `XAI_API_KEY` and `--output-format json`. Keep the same tool and approval posture as the matching mode.

Unattended execution (writes expected) — § Bounded Execution plus JSON:

```bash
export XAI_API_KEY="xai-..."
grok -p "<exec prompt>" --always-approve --output-format json | jq -r '.text'
```

Unattended findings (no edits) — § Findings-Only Review plus JSON. Omit `--always-approve`.

```bash
export XAI_API_KEY="xai-..."
grok -p "Review staged changes for obvious bugs. Findings only.

$(git diff --staged)" --tools "read_file,grep,list_dir" --output-format json | jq -r '.text'
```
