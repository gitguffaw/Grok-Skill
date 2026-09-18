# Analyze

## ENTER

- Repo-grounded unknowns dominate.
- You need facts, comparisons, or an explanation before acting.
- No file changes are wanted yet.

## AVOID

- A concrete change is the goal: use `Exec`.
- Only a critique of existing changes is wanted: use `Review`.

## OPTIONAL CONTROLS

- `Model`
- `Effort`
- `ToolScope` (read-only)
- `Machine`
- `WebSearch` (on by default)

## DEFAULT LAUNCH

Read-only investigation (no edits, no shell) — default for repo-grounded analysis:

```bash
grok -p "<question>" --tools "read_file,grep,list_dir"
```

Web-external / current-events questions (no repo edits expected; bare `-p` is OK when tools are intentionally unrestricted for web-only work — still not a substitute for read-only when the cwd is a repo you must not touch):

```bash
# Web-external only: bare -p relies on default tools (includes write/shell). Prefer the allowlist below when the cwd is a code repo.
grok -p "<question about current external facts>"
# Safer when both repo and web matter:
grok -p "<question about current external facts and this repo>" --tools "read_file,grep,list_dir,web_search,web_fetch"
```

Model and effort for hard reasoning, keeping web context:

```bash
grok -p "<question>" -m <MODEL> --reasoning-effort <high|xhigh> --tools "read_file,grep,list_dir,web_search,web_fetch"
```

Parseable answer:

```bash
grok -p "<question>" --tools "read_file,grep,list_dir" --output-format json | jq -r '.text'
```

## PROMPT SHAPE

```text
Question: <what must be answered>
Scope: <repo area, files, subsystem>
Output:
- facts (cite files and line ranges)
- options
- tradeoffs
- recommendation
Next decision: <what Claude will do after Grok answers>
```

## POST

- Read the answer.
- Decide: act via `Exec`, critique via `Review`, or deepen via `Parallel`.

## EXIT

- Uncertainty reduced.
- Or re-route to `Exec` / `Review` / `Parallel`.

## Examples

```bash
grok -p "Map how authentication flows from the HTTP layer to the session store in this repo. Cite files and line ranges. Do not edit." --tools "read_file,grep,list_dir"
```

## Current Facts

- A read-only allowlist (`read_file,grep,list_dir`) keeps the run from editing files or running commands. Prefer this for repo analysis.
- Bare `grok -p` without `--tools` is only appropriate when unrestricted tools are intentional (e.g. pure web-external Q&A); default injection includes write/shell.
- `--tools` is an allowlist of built-in tools; add `web_search,web_fetch` back if you want web context. User-guide: MCP meta-tools can remain unless denied.
- `--output-format json` returns `{text, stopReason, sessionId, requestId}` and may include `thought` plus spend fields; capture `sessionId` to continue via `Session` with `--resume` / `-c`.
