# Session

## ENTER

- Work spans multiple `grok -p` calls and must keep context, OR
- Claude needs machine-readable output to parse or chain.

## AVOID

- A single self-contained run is enough: use `Exec` / `Analyze` / `Review`.

## OPTIONAL CONTROLS

- `Model`
- `Effort`
- `Machine`
- `Permissions`
- `JsonSchema`

## DEFAULT LAUNCH

Use `references/LaunchPatterns.md` § Multi-Turn / Machine-Readable Sessions. Pair each turn with the matching mode: `--always-approve` for writes, `--tools "read_file,grep,list_dir"` for findings. Repeat those flags every turn — resume does not inherit them.

Continue the most recent session for this directory (still pass the posture flags):

```bash
grok -p "<next turn>" -c --output-format json --tools "read_file,grep,list_dir"
```

Streaming events for real-time consumption:

```bash
grok -p "<task>" --output-format streaming-json
grok -p "<task>" --output-format streaming-messages-json
```

Structured output (implies JSON; may include `structuredOutput`):

```bash
grok -p "<task>" --json-schema '{"type":"object","properties":{"ok":{"type":"boolean"}},"required":["ok"]}'
```

## POST

- Parse `.text` / `.sessionId` from the JSON object (`.thought` and spend fields may also be present).
- With `--json-schema`, prefer `.structuredOutput` when present.
- Persist the session id if the thread continues.
- Inspect repo state if the turns made edits.

## EXIT

- Thread complete.
- Or re-route to `Exec` / `Review` / `Parallel` within the same session via `--resume` / `-c`.

## Examples

```bash
SID=$(grok -p "Review the changes in this PR. Findings only. Do not edit." \
  --tools "read_file,grep,list_dir" \
  --output-format json | jq -r '.sessionId')
grok -p "Now check only for security issues. Findings only." \
  --resume "$SID" --tools "read_file,grep,list_dir" --output-format json | jq -r '.text'
```

## Current Facts

- Multi-turn that works: capture `sessionId` from JSON → `--resume $SID` or `-c` for most recent in cwd.
- `-s/--session-id` is **create-only**: valid UUID required; reusing an existing UUID errors; non-UUID IDs error. Documented in `grok --help`. Never teach create-or-resume with `-s`.
- `--resume` accepts a session ID or a title for the current directory (case-insensitive; UUID-shaped values always take the ID path). Scripts should pass IDs.
- With `--resume` / `--continue`, `-s` is only valid together with `--fork-session` (names the forked session).
- `--fork-session` creates a new session ID on resume while retaining history.
- `--output-format json` returns `{text, stopReason, sessionId, requestId}` and may include `thought` plus spend fields; `--json-schema` implies json and may add `structuredOutput`.
- `streaming-json`: NDJSON `text`/`thought` events carry `data`; terminal `end` carries metadata. `streaming-messages-json` is the Messages API wire format; `--include-partial-messages` only affects that format.
- `--restore-code` restores the original session's repository snapshot when resuming. Remote sessions require `--worktree` (never checks out into the current directory). Without the flag, resume restores conversation only.
- Compaction CLI flags exist but are hidden from `grok --help`: `--compaction-mode` / `--compaction-detail` — verify acceptance if needed.
- Headless starts a fresh session by default; pass `--resume`/`-c` (or create-only `-s` then later resume) to maintain context across calls.
- Sessions are keyed by cwd under `~/.grok/sessions/`. Isolate scripted work with a unique `--cwd` / process cwd when needed. User-guide documents `GROK_HOME` as the config-directory override.
- `grok sessions list|search|delete` and `grok export <id>` manage the session store. There is no `grok import` command on this binary.
