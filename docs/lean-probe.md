# Lean probe (grok 1.0.34, 2026-09-18)

Live `grok -p` in this repo. Proof is session files under `~/.grok/sessions/`, not `inspect` alone.

| Run | input_tokens | system_prompt.txt | tools | Agents.md in prompt_context |
|---|---|---|---|---|
| Stock `--tools read_file,grep,list_dir` | 11010 | 4893 bytes (Grok default identity) | read_file, list_dir, grep, **search_tool, use_tool** | yes, full home Agents.md |
| `--system-prompt-override` only | 10171 | 47 bytes (override text only) | same five tools | **still yes** |
| Bundle: override + `--disallowed-tools search_tool,use_tool,Agent` + `--disable-web-search --no-subagents --no-plan` + `GROK_MEMORY=0` | 8713 | 47 bytes | **read_file, list_dir, grep only** | still yes |
| `--agent` router-owned lean.md (`mcpInheritance: none`) | 10133 | still default Grok identity | still includes search_tool, use_tool | still yes |
| `--json-schema` | — | default identity | — | `.structuredOutput` populated |

Conclusions used by 0.2:

- `--tools` allowlist does **not** drop MCP meta-tools. `--disallowed-tools search_tool,use_tool` does.
- `--system-prompt-override` replaces `system_prompt.txt` but does **not** remove `agents_md_files` from `prompt_context.json`. Do **not** default-lean on review.
- `--agent` with `mcpInheritance: none` did not strip Agents.md and did not drop meta-tools. Not the 0.2 ambient strategy.
- Isolated `GROK_HOME` not used (auth/trust bomb).
- `GROK_CLAUDE_SKILLS_ENABLED=false` did not change `inspect` skill count (120); most skills are `~/.grok/skills`, not Claude compat.
- `--json-schema` works; companion should read `.structuredOutput`.

Residual for `--lean`: house `~/.grok/Agents.md` may still reach the model via prompt_context. `--full` restores 0.1.0 (no strip bundle).
