# Exec

## ENTER

- Deliverable is concrete.
- Task is bounded.
- Acceptance criteria are known.
- Claude can inspect the result after the run.

## AVOID

- Unknowns still dominate: use `Analyze`.
- Only a review report is needed: use `Review`.
- The work splits cleanly across roles: use `Parallel` with subagents.
- One shot is risky and N independent attempts would help: launch N separate `grok -p` runs, or use `Parallel` with independent subagents.

## MODIFIERS

- `Model`
- `Effort`
- `Permissions`
- `ToolScope`
- `MaxTurns`

## DEFAULT LAUNCH

Bounded, unattended write run:

```bash
grok -p "<prompt>" --always-approve
```

Model and effort override:

```bash
grok -p "<prompt>" -m <MODEL> --reasoning-effort <high|xhigh> --always-approve
```

Isolate file changes by pointing at an existing worktree (headless `-w` does not create one):

```bash
grok -p "<prompt>" --always-approve --cwd <existing-worktree-path>
```

Resolve `<MODEL>` from user intent, local config, or `grok models`; do not reuse stale model IDs.

## PROMPT SHAPE

```text
Goal: <required change>
Scope: <files/directories/subsystem>
Constraints:
- <constraint>
Validation:
- <test/lint/typecheck/manual check>
Non-goals:
- <explicitly excluded work>
```

Put the verification loop in `Validation`. There is no `--check` flag.

## POST

- Read Grok's final message (or `--output-format json` `.text`).
- Inspect `git status`.
- Inspect `git diff`.
- Run requested validation locally if Grok did not.

## EXIT

- Accepted diff/result.
- Or re-route to:
  - `Analyze`
  - `Review`
  - `Parallel`

## Examples

```bash
grok -p "Goal: add input validation to src/forms/Register.tsx. Scope: registration form only. Constraints: keep the public API unchanged. Validation: pnpm test, pnpm lint. Non-goals: redesign the form UX." -m <MODEL> --reasoning-effort high --always-approve
```

## Current Facts

- Prefer help-visible `--always-approve` for unattended auto-approval. A historical short CLI alias is accepted by the parser but not help-listed — do not use it in recipes. `/yolo` is TUI-only.
- `--tools`, `--disallowed-tools`, `--max-turns`, and `--agents` are headless automation knobs. `--check` and `--best-of-n` are gone.
- Prefer `--reasoning-effort` (alias `--effort`); live accept list this binary: `low`, `medium`, `high`, `xhigh` — verify with a rejection message.
- Web search (`web_search`/`web_fetch`) is on by default; `--disable-web-search` turns those off only (X search may remain). Prefer tight `--tools` for stronger isolation.
- Headless `-p` does not create a git worktree from `-w`. Isolate with `--cwd` into an existing worktree, or ask inner Grok to spawn a subagent with worktree isolation.
