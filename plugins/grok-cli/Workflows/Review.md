# Review

## ENTER

- Need findings, not edits.
- Review target is uncommitted changes, a diff vs a base branch, or a specific commit.

## AVOID

- The same run should also implement fixes: use `Exec`.
- Parallel concern-specific review would materially improve coverage: use `Parallel`.

## OPTIONAL CONTROLS

- `Model`
- `Effort`
- `Machine`
- `ToolScope`

## DEFAULT LAUNCH

**Primary (preferred):** read-only allowlist. Embed the diff in the prompt (prefer command substitution or `--prompt-file` over bare pipe-only context):

```bash
grok -p "Review these changes for bugs, regressions, edge cases, and missing error handling. Findings only; do not edit.

$(git diff)" --tools "read_file,grep,list_dir"
```

Review staged changes:

```bash
grok -p "Review the staged diff. Prioritized findings with file paths and concrete risk.

$(git diff --staged)" --tools "read_file,grep,list_dir"
```

Or write the diff to a prompt file:

```bash
{
  echo "Review the diff below. Findings only; do not edit."
  echo
  git diff
} > /tmp/review-diff.txt
grok --prompt-file /tmp/review-diff.txt --tools "read_file,grep,list_dir"
```

Let Grok read the tree itself (same allowlist):

```bash
grok -p "Review the uncommitted changes in this repo. Findings only." --tools "read_file,grep,list_dir"
```

Model, effort, and machine-readable:

```bash
grok -p "Review for security and correctness.

$(git diff)" -m <MODEL> --reasoning-effort high --tools "read_file,grep,list_dir" --output-format json | jq -r '.text'
```

**Secondary denylist form** (only if broader tools are needed while blocking edits/shell). Must include `write` — denylist without `write` still allows overwrites via the separate `write` tool:

```bash
grok -p "Review these changes. Findings only; do not edit.

$(git diff)" --disallowed-tools "search_replace,write,run_terminal_cmd"
```

## OUTPUT CONTRACT

- prioritized findings
- file paths
- concrete risk
- suggested fix direction

## POST

- Fix manually, hand findings to `Exec`, or open a `Session` to review then fix in one thread (`--resume` / `-c`).

## EXIT

- Findings accepted.
- Or re-route to `Exec` / `Parallel`.

## Examples

```bash
grok -p "Review this branch diff. Focus on regressions, edge cases, and maintainability. Findings only.

$(git diff main...)" --tools "read_file,grep,list_dir"
```

## Current Facts

- Grok has no dedicated `review` subcommand; review is a read-only headless prompt with a diff embedded or with a read-only tool allowlist.
- Prefer embedding the diff via command substitution or `--prompt-file` rather than relying on piped stdin alone (user-guide: headless may not treat pipe-only stdin as the prompt body).
- Prefer `--tools "read_file,grep,list_dir"` for findings-only. If using denylist, include **`write`**: `--disallowed-tools "search_replace,write,run_terminal_cmd"`. Omitting `write` does **not** remove editing (separate edit tool; 0.2.93 proof, still the conservative denylist).
