# Changelog

## Unreleased

## 0.3.4

- Panel parent jobs record a controller PID, persist each lane as it finishes, and reconcile to a terminal status when the controller is gone. Never-started lanes are marked. `status`/`result` no longer leave a dead panel `running` with `{}`.
- Job records store the managed timeout (default 30 minutes). Timed-out exec results include that timeout and `git status --short` so partial working-tree edits are visible.
- `git status` / `git diff` used by the router cap at 8 seconds so a huge dirty tree cannot stall the job after Grok already timed out.

## 0.3.3

- `exec --lanes login,billing,tests` is the multiple-coding-Grok option. Help, MCP schema, and exec command advertise it. `--panel` stays review-only. Exec/analyze lane reports are per-slice summaries, not empty review findings.

## 0.3.2

- Grok Router does not log you in. Setup is ready when `node` and `grok` are on PATH.
- Stop hook runs `review --panel` on a dirty git tree when the host ends a turn. Clean tree skips. Findings go to stderr so the hook does not block the turn. Approving the hook in Codex is opt-in, not a login.

## 0.3.1

- Foreground analyze/exec/review/rescue print `Job ID` and live progress on stderr as soon as the job is queued. Finished findings stay on stdout. `--background` still prints the job id on stdout and returns.

## 0.3.0

- Kill inner-parent Parallel: `--parallel` / `--panel` / `--lanes` now launch N `grok -p --no-subagents` leaves. Companion merges json-schema findings into one bounded report. `result --lane k` fetches a leaf. Nested fan-out refused (`GROK_ROUTER_NESTING`).
- Grok-as-host: `setup` copies `grok-router-review.rhai` and `grok-router-adversarial-review.rhai` to `~/.grok/workflows/`. Use `/workflow grok-router-review`. Do not install grok-router MCP/skill into a Grok session.
- See `docs/grok-host.md` and `policy/Grok/Workflows/Parallel.md`.

## 0.2.0

- Router-owned `--lean` (opt-in) / `--full`. Not a Grok flag. Live probe: `--system-prompt-override` replaces `system_prompt.txt` but house `Agents.md` still appears in `prompt_context.json`, so review does **not** default to lean.
- Lean bundle emits `--disallowed-tools search_tool,use_tool,Agent` (allowlist alone does not drop MCP meta-tools), `--disable-web-search`, `--no-subagents`, `--no-plan`, `GROK_MEMORY=0`, and a short `--system-prompt-override` on read-only modes. `--search` keeps web tools. `--parallel` conflicts with `--lean`.
- Review/adversarial-review send the prompt via `--prompt-file` and constrain findings with `--json-schema` (`.structuredOutput`).
- Read-only jobs that dirty git status complete as `completed-with-warnings`.
- `setup` / `models` report inspect load (instruction tokens, skills, plugins, MCP, hooks).
- Probe notes: `docs/lean-probe.md`.

## 0.1.0

- Turn the markdown Grok skill into **Grok Router**: a companion runtime (`grok-companion.mjs`) with Claude Code slash commands, Codex MCP tools, and an AGY skill.
- Live discovery from `grok --help`, `grok models`, and `grok inspect --json`. No pinned model ids or effort enums.
- Managed modes: `setup`, `models`, `surface`, `help`, `analyze`, `exec`, `review`, `adversarial-review`, `rescue`, `status`, `result`, `cancel`, `cli`.
- Read-only modes use `--tools "read_file,grep,list_dir"`; exec uses `--always-approve`. Review embeds a git diff (Grok has no native review subcommand).
- New Grok flags/commands appear on `surface` the same day the binary updates; unmodeled subcommands go through `cli`.
- Keep a thin `grok-cli` plugin for raw `grok -p` without job tracking.

## v1.0.8 notes (skill era)

- LaunchPatterns Multi-Turn and CI now split writing (`--always-approve`) from findings-only (`--tools "read_file,grep,list_dir"`). Repeat those flags on every turn; `--resume` does not inherit them.
- Session DEFAULT LAUNCH points at that Multi-Turn module instead of a write-capable copy-paste spine.

## v1.0.8 — 2026-08-21

Install docs: `git clone` creates the repo at `~/.claude/Grok-Skill`. `~/.claude/skills/Grok` is only a symlink to `Grok/`. Removed the migrate/`mv` steps that ran `git fetch` in a folder that was not a clone.

On **main** (no new tag): un-nest. `SKILL.md` is at the repo root. Install is `git clone … ~/.claude/skills/Grok`. That path is a real git repo, not a symlink.

## v1.0.7 — 2026-08-21

Packaging: the installable skill is `Grok/` (`SKILL.md`, `Workflows/`, `references/`). README, LICENSE, and this changelog stay at the repo root and are no longer loaded as skill files.

Install is now clone-the-repo + symlink `Grok/` into each host. See README migrate notes if `~/.claude/skills/Grok` is still a full-repo clone.

`SKILL.md` is a router. Flag surface and launch recipes stay in `references/` and `Workflows/`.

## v1.0.6 — 2026-08-21

Skill package `v1.0.6`. Re-verify against `grok 1.0.5 (5115b46bc909) [stable]`.

### Breaking vs v0.2.94 skill recipes

- **`--check` / `--self-verify` gone.** Parser rejects them. Self-verification belongs in the prompt Validation section.
- **`--best-of-n` gone.** Parser rejects it. `Parallel` is subagent orchestration; independent attempts are N host-side `grok -p` runs.
- **`grok import` gone.** Session movement is `grok export` plus `grok sessions`.
- **Headless `-w` does not create a worktree.** Isolate with `--cwd` into an existing worktree, or inner subagent worktree isolation.
- **Live effort accept list is `low|medium|high|xhigh`.** User-guide extra tiers (`none`, `minimal`, `max`) currently reject.

### Added / updated

- Output format `streaming-messages-json` and `--include-partial-messages`.
- `--resume` matches session ID **or** title for the current directory (scripts should still pass IDs).
- `--restore-code` restores a session snapshot on resume; remote sessions require `--worktree`.
- JSON output may include spend fields (`usage`, `num_turns`, `modelUsage`, cost).
- Secondary commands: `grok doctor`, `grok du` (`disk-usage`), `grok wrap`.
- User-guide documents `GROK_HOME` and `GROK_MEMORY=1|0` (memory still experimental, off by default).
- Observed default model: `grok-4.6` (point-in-time).

### Unchanged

- Headless spine `grok -p`; create-only `-s`; multi-turn via `--resume` / `-c`.
- Prefer `--always-approve` (the short parser alias remains hidden from `grok --help`).
- Review allowlist `read_file,grep,list_dir`; denylist must include `write`.

## v0.2.94 — 2026-07-08

### Added

- **Google Antigravity** install paths:
  - Global: `~/.gemini/config/skills/Grok` (AGY / AGY IDE / AGY CLI)
  - Workspace: `<workspace>/.agents/skills/Grok`
- Multi-host **symlink** install as the recommended default (one clone under Claude Code, link Codex / Grok / Antigravity).

### Unchanged

- CLI contracts still those verified against **`grok 0.2.93`** (P0). No headless semantic changes in this packaging release.

## v0.2.93 — 2026-07-08

P0 re-verify against `grok 0.2.93`: create-only session UUID, resume multi-turn spine, write-safe review allowlist, surface snapshot, invariant-checked packaging. See `CHANGELOG-P0.md` for the full P0 delta.
