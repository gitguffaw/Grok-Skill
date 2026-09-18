export const LEAN_DISALLOWED_TOOLS = "search_tool,use_tool,Agent";

export const REVIEW_JSON_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string" },
          path: { type: "string" },
          title: { type: "string" },
          risk: { type: "string" },
          fix: { type: "string" }
        },
        required: ["severity", "title"]
      }
    },
    summary: { type: "string" }
  },
  required: ["findings", "summary"]
});

const READ_ONLY_MODES = new Set(["analyze", "review", "adversarial-review"]);

export function resolveLean(options = {}) {
  if (options.full && options.lean) {
    throw new Error("--lean and --full cannot be combined.");
  }
  return Boolean(options.lean) && !options.full;
}

export function leanExtraEnv() {
  return {
    GROK_MEMORY: "0",
    GROK_CLAUDE_SKILLS_ENABLED: "false",
    GROK_CURSOR_SKILLS_ENABLED: "false",
    GROK_REPO_STATUS_IN_SYSTEM_PROMPT: "0",
    GROK_BACKEND_SEARCH: "0"
  };
}

export function leanSystemPrompt(mode) {
  if (mode === "review" || mode === "adversarial-review") {
    return "You are a concise code reviewer. Findings first, ordered by severity, with file paths and concrete risk. Suggested fix direction, not patches. Do not edit files.";
  }
  if (mode === "analyze") {
    return "You are a concise analyst. Return facts, options, tradeoffs, recommendation, and next action. Cite files and line ranges. Do not edit files.";
  }
  return "You are a concise coding agent. Complete the requested task. Avoid unrelated refactors.";
}

export function applyLeanToRequest(request, { mode, options = {}, lean }) {
  const next = { ...request, lean: Boolean(lean) };
  if (!lean) {
    return next;
  }
  const search = Boolean(options.search);
  next.extraEnv = leanExtraEnv();
  next.disableWebSearch = !search;
  next.noSubagents = true;
  next.noPlan = true;
  next.disallowedTools = LEAN_DISALLOWED_TOOLS;
  if (READ_ONLY_MODES.has(mode)) {
    next.systemPromptOverride = leanSystemPrompt(mode);
  }
  return next;
}
