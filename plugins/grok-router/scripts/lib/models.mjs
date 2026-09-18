function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function parseGrokModels(text) {
  const lines = String(text ?? "").split(/\r?\n/).map((line) => line.trimEnd());
  const models = [];
  let defaultModel = null;
  let loggedIn = false;
  let loginDetail = "";
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (/^you are logged in/i.test(trimmed)) {
      loggedIn = true;
      loginDetail = trimmed;
      continue;
    }
    if (/^you are not logged in/i.test(trimmed) || /^not logged in/i.test(trimmed)) {
      loggedIn = false;
      loginDetail = trimmed;
      continue;
    }
    const defaultMatch = trimmed.match(/^default model:\s+(\S+)/i);
    if (defaultMatch) {
      defaultModel = defaultMatch[1];
      continue;
    }
    if (/^available models:/i.test(trimmed)) {
      inList = true;
      continue;
    }
    if (inList) {
      const item = trimmed.match(/^[-*]\s+(\S+)(?:\s+\((default)\))?/i);
      if (item) {
        const id = item[1];
        const isDefault = Boolean(item[2]) || id === defaultModel;
        models.push({ id, default: isDefault });
        if (isDefault && !defaultModel) {
          defaultModel = id;
        }
        continue;
      }
    }
  }

  if (defaultModel && !models.some((model) => model.id === defaultModel)) {
    models.unshift({ id: defaultModel, default: true });
  }

  return {
    loggedIn,
    loginDetail,
    defaultModel: defaultModel ?? models.find((model) => model.default)?.id ?? null,
    models
  };
}

function suffixAlias(id) {
  const trimmed = String(id ?? "").trim().toLowerCase();
  const parts = trimmed.split("-").filter(Boolean);
  return parts.at(-1) ?? "";
}

export function catalogAliases(models) {
  const aliases = new Map();
  const ids = new Set(models.map((model) => model.id.toLowerCase()));
  const suffixCounts = new Map();
  for (const model of models) {
    const suffix = suffixAlias(model.id);
    if (!suffix || ids.has(suffix)) {
      continue;
    }
    suffixCounts.set(suffix, (suffixCounts.get(suffix) ?? 0) + 1);
  }
  for (const model of models) {
    const suffix = suffixAlias(model.id);
    if (suffix && suffixCounts.get(suffix) === 1 && !ids.has(suffix)) {
      aliases.set(suffix, model.id);
    }
  }
  return aliases;
}

export function resolveModelSelector(catalog, selector, { best = false } = {}) {
  if (best && (selector == null || selector === "")) {
    if (!catalog.defaultModel) {
      throw new Error("No live Grok default model is available. Run models and pass --model <id>.");
    }
    return catalog.defaultModel;
  }
  if (selector == null || selector === "") {
    return null;
  }
  const normalized = String(selector).trim();
  if (!normalized) {
    return null;
  }
  const exact = catalog.models.find((model) => model.id.toLowerCase() === normalized.toLowerCase());
  if (exact) {
    return exact.id;
  }
  const aliases = catalogAliases(catalog.models);
  const aliased = aliases.get(normalized.toLowerCase());
  if (aliased) {
    return aliased;
  }
  const matches = catalog.models.filter((model) => model.id.toLowerCase().includes(normalized.toLowerCase()));
  if (matches.length === 1) {
    return matches[0].id;
  }
  if (matches.length > 1) {
    throw new Error(
      `Grok model selector "${normalized}" is ambiguous; it matches ${matches.map((model) => model.id).join(", ")}. Use an exact id.`
    );
  }
  throw new Error(`Unknown Grok model "${normalized}". Run grok-router models and pick a live id.`);
}

export function renderModelCatalog(catalog, extras = {}) {
  const lines = [
    "# Grok Router Models",
    "",
    `Grok CLI: ${extras.version ?? "unknown"}`,
    `Default: ${catalog.defaultModel ?? "(none)"}`,
    `Auth: ${catalog.loginDetail || (catalog.loggedIn ? "logged in" : "not detected")}`,
    "",
    "Available models:"
  ];
  if (!catalog.models.length) {
    lines.push("- (none reported by `grok models`)");
  }
  const aliases = catalogAliases(catalog.models);
  const aliasById = new Map();
  for (const [alias, id] of aliases) {
    aliasById.set(id, [...(aliasById.get(id) ?? []), alias]);
  }
  for (const model of catalog.models) {
    const mark = model.default ? "*" : "-";
    const extra = aliasById.get(model.id)?.length ? `  aliases: ${aliasById.get(model.id).join(", ")}` : "";
    lines.push(`${mark} ${model.id}${model.default ? " (default)" : ""}${extra}`);
  }
  lines.push(
    "",
    "Effort: forwarded as an opaque `--reasoning-effort` / `--effort` string. This CLI does not enumerate accepted values in `grok models`. If Grok rejects a value, the rejection lists what this binary accepts.",
    "",
    "Use `--best` to select the live default. Do not reuse stale model ids from docs or memory.",
    "",
    "Lean: router-owned `--lean` (opt-in, not a grok flag). Strips default system prompt, MCP meta-tools, web search, subagents, and plan mode. House AGENTS.md may still inject via prompt_context. `--full` restores 0.1.0 behavior."
  );
  if (extras.load) {
    lines.push(
      "",
      `Current inspect load: ${extras.load.instructionTokens ?? 0} instruction tokens, ${extras.load.skills} skills, ${extras.load.plugins} plugins, ${extras.load.mcpServers} MCP.`
    );
  }
  return `${lines.join("\n")}\n`;
}

export { unique };
