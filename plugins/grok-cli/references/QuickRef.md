# Grok CLI Quick Reference

LAST VERIFIED:
- skill `v1.0.8`
- `grok 1.0.5 (5115b46bc909) [stable]`
- `2026-08-21`

SOURCE OF TRUTH:
1. Installed `grok` binary (`grok --help`, live parse/runtime errors)
2. `~/.grok/docs/user-guide/`
3. Root `~/.grok/*.md` (often stale — do not copy session/effort/yolo claims)
4. This skill

PREFLIGHT:
- `grok --help`
- `grok <cmd> --help`
- `grok models`
- `grok mcp list`
- `grok plugin list`
- `grok inspect` / `grok inspect --json`
- `~/.grok/config.toml`

LAST OBSERVED LOCAL STATE (point-in-time, not contract):
- default model: `grok-4.6`
- also seen: `grok-4.5`
- catalog is volatile — resolve live every time; never pin a non-default model
- live `--reasoning-effort` accept list (rejection message): `low`, `medium`, `high`, `xhigh`
- auth: logged in with grok.com; `XAI_API_KEY` for headless/CI
- native `mcp`/`plugin list` may look empty or sparse while `grok inspect` discovers Claude-compatible MCP/plugins

MODEL FACTS:
- resolve the live catalog with `grok models`; do not hard-code a permanent default in this skill
- set a persistent default with `[models] default = "<id>"` in `~/.grok/config.toml`
- override per run with `-m <MODEL>`

HEADLESS SPINE (`grok -p` / `--single`):
- `-p, --single <PROMPT>` single-turn headless; prints to stdout and exits
- `--prompt-file <PATH>` / `--prompt-json <JSON>` prompt from file / JSON content blocks
- `-m, --model <MODEL>`
- `--reasoning-effort <EFFORT>` (aliases: `--effort`) — live accept list this binary: `low`, `medium`, `high`, `xhigh`. User-guide lists extra tiers that currently reject (`none`, `minimal`, `max`). Verify with a rejection message.
- `--output-format <plain|json|streaming-json|streaming-messages-json>` (headless mode; default plain)
- `--include-partial-messages` incremental `stream_event` deltas; only affects `streaming-messages-json`
- `--json-schema <SCHEMA>` structured output; implies `--output-format json`
- `--always-approve` auto-approve all tool executions (prefer this; a historical short CLI alias is accepted by the parser but not help-listed — do not use in recipes; `/yolo` is TUI-only)
- `--permission-mode <default|acceptEdits|auto|dontAsk|bypassPermissions|plan>` — enum from help; do not assume non-bypass modes fully enforce in headless CLI
- `--allow <RULE>` / `--deny <RULE>` `ToolPrefix(glob)` rules; repeatable; deny wins
- `--sandbox <PROFILE>` OS-level fs/network guardrails (env `GROK_SANDBOX`; profiles commonly include off, workspace, devbox, read-only, strict — verify live)
- `--tools <ids>` allowlist / `--disallowed-tools <ids>` denylist (headless automation)
- `--max-turns <N>` (headless automation)
- `-s, --session-id <UUID>` **create-only** new session UUID (must be valid UUID; must not already exist). With `--resume`/`--continue`, only valid with `--fork-session`. Does **not** resume. Documented in `grok --help`.
- `-r, --resume [<ID_OR_TITLE>]` resume by id, by title for the current directory, or most recent if omitted. UUID-shaped values always mean IDs; scripts should pass IDs. Errors if missing when a value is given and absent
- `-c, --continue` continue most recent session for cwd
- `--fork-session` when resuming/continuing, create a new session ID instead of reusing (optionally name via `-s`)
- `--restore-code` restore the original session's repository snapshot when resuming. Remote sessions require `--worktree` (never checks out into the current directory). Without this flag, resume restores conversation only
- `--worktree-ref <REF>` / `--ref <REF>` branch/tag/commit base for `-w/--worktree`
- `--leader-socket <PATH>` share/isolate the backend leader process (root surface)
- `--leader` / `--no-leader` — agent-primary / help-hidden on root `-p` (documented on `grok agent --help`; accepted as hidden aliases on root)
- `--cwd <PATH>` working directory (session store is keyed by cwd under `~/.grok/sessions/`)
- `--rules <TEXT>` append to system prompt
- `--system-prompt-override <TEXT>` replace system prompt
- `--verbatim` send the prompt exactly as given
- `--disable-web-search` disables web_search/web_fetch only (on by default); X search and other tools may remain — prefer tight `--tools` for isolation
- `--no-subagents` / `--agent <NAME|path>` / `--agents <JSON>`
- `-w, --worktree [<NAME>]` start in a new git worktree for **interactive** sessions. Help: headless (`-p`) does **not** create a worktree from this flag
- `--experimental-memory` / `--no-memory` — hidden; documented path is `GROK_MEMORY=1` / `GROK_MEMORY=0` (memory off by default)
- `--no-plan` disable plan mode
- `--no-auto-update` — hidden; also `GROK_DISABLE_AUTOUPDATER=1`
- Compaction (hidden from `grok --help`; binary accepts): `--compaction-mode <MODE>` / `--compaction-detail <DETAIL>` (env `GROK_COMPACTION_MODE` / `GROK_COMPACTION_DETAIL`)

GONE ON THIS BINARY (parser rejects; do not teach):
- `--check` / `--self-verify`
- `--best-of-n`
- `grok import`

HEADLESS-ONLY / HEADLESS AUTOMATION (help-marked or user-guide headless set):
- help-marked headless: `--output-format`
- headless automation (user-guide): `--tools`, `--disallowed-tools`, `--max-turns`, `--agents`
- do **not** treat `--reasoning-effort`/`--effort`, `--permission-mode`, or `-s/--session-id` as headless-only unless live help marks them so

SESSION SEMANTICS:
- Multi-turn: `SID=$(… --output-format json | jq -r .sessionId)` then `grok -p … --resume "$SID"` or `-c`
- `-s` create-only UUID; reuse → error; non-UUID → error
- `--resume` may match a session title in the current directory; scripts should pass IDs
- Fork: `--resume $SID --fork-session` (+ optional `-s FORK_UUID`)
- Never teach create-or-resume with `-s`

DRIFT TO REMEMBER (binary vs docs):
- prefer `--always-approve`; a historical short CLI alias is parser-accepted and user-guide-listed, but not in `grok --help` — do not use in recipes; `/yolo` is TUI-only
- live effort set is `low|medium|high|xhigh`; user-guide extra tiers currently reject
- user-guide CI examples still show the short auto-approve alias — use `--always-approve`
- web search is ON by default in headless; `--disable-web-search` removes web_search/web_fetch only (not full external isolation)
- `-w` on `grok -p` does not create a worktree

OUTPUT FORMATS:
- `plain` (default): human-readable text
- `json`: object with `text`, `stopReason`, `sessionId`, `requestId`; may include `thought`; with `--json-schema` may include `structuredOutput`; when the prompt reached the model may include spend fields (`usage`, `num_turns`, `modelUsage`, cost)
- `streaming-json`: NDJSON ACP events; `text` / `thought` events carry a `data` field; terminal `end` event carries `stopReason` / `sessionId` / `requestId` plus spend when available (event set is non-exhaustive)
- `streaming-messages-json`: NDJSON in the Anthropic Messages API wire format; use `--include-partial-messages` for raw stream_event deltas
- extract: `grok -p "..." --output-format json | jq -r '.sessionId'`

BUILT-IN TOOL IDS (`--tools` / `--disallowed-tools`):
- Non-exhaustive catalog — prefer allowlist for read-only runs
- Common: `read_file`, `search_replace`, `write`, `grep`, `list_dir`, `run_terminal_cmd` (shell — not `bash`; model-facing name may appear as `run_terminal_command`), `web_search`, `web_fetch`, `todo_write`
- Edit paths: `search_replace` **and** `write` (denylist without `write` does not block overwrites)
- `memory_search` exists but is a model-invokable memory tool gated by memory enablement, not a documented `--tools` allowlist entry
- subagent gates: `Agent`, `Agent(explore)`, `Agent(explore, plan)`

PERMISSION RULE PREFIXES (`--allow` / `--deny`):
- `Bash(...)`, `Edit(...)`, `Write(...)`, `Read(...)`, `Grep(...)`, `WebFetch(... | domain:host)`, `MCPTool(...)`
- globs: `*` single-level, `**` recursive; bare prefix matches all; deny precedence

SUBAGENTS / PERSONAS:
- types: `general-purpose` (all), `explore` (read-only + shell), `plan`
- bundled personas: `implementer`, `reviewer`, `researcher`, `test-writer`, `security-auditor`, `design-doc-writer`, `design-doc-reviewer`
- enabled by default; ask for them in the prompt when you want role-split work; disable with `--no-subagents`; capability modes `read-only` | `read-write` | `execute` | `all`
- isolation: `none` (shared workspace) or `worktree`

SECONDARY SURFACES (not one-shot delegation):
- `grok agent stdio` ACP over stdin/stdout (IDE clients)
- `grok agent serve --bind <addr> --secret <tok>` / `grok agent headless --grok-ws-url <wss>` WebSocket
- `grok sessions list|search|delete` (subcommand required), `grok export <id> [out]`
- `grok mcp list|add|remove|enable|disable|doctor`, `grok plugin list|install|uninstall|update|enable|disable|details|validate|tag|marketplace`
- `grok worktree list|show|rm|gc|db`, `grok memory clear`, `grok inspect [--json]`
- `grok doctor`, `grok du` (`disk-usage`), `grok wrap`

AUTH:
- browser: `grok login` (`--oauth`, `--device-auth`); stored in `~/.grok/auth.json`
- headless/CI: `export XAI_API_KEY="xai-..."` (takes precedence)

ENV:
- `XAI_API_KEY`, `GROK_SANDBOX`, `GROK_LOG_FILE`, `RUST_LOG`
- `GROK_HOME` — user-guide: override config directory (default `~/.grok`)
- `GROK_MEMORY=1` enable / `GROK_MEMORY=0` force-disable (memory experimental, off by default)
- `GROK_DISABLE_AUTOUPDATER=1`
- compaction: `GROK_COMPACTION_MODE`, `GROK_COMPACTION_DETAIL`

EXIT CODES:
- `0` success; `1` error (auth, network, runtime, invalid session flags); `130` SIGINT; `143` SIGTERM

MACHINE SNAPSHOT:
- Flag surface capture: `references/cli-surface.json` (optional; regenerate via local harness when binary updates)
