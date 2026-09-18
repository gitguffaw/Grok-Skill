import assert from "node:assert/strict";
import test from "node:test";
import { buildGrokPrintArgs, gitStatusChanged, summarizeInspect } from "../plugins/grok-router/scripts/lib/grok.mjs";
import { classifyControls } from "../plugins/grok-router/scripts/lib/live-controls.mjs";
import { LEAN_DISALLOWED_TOOLS } from "../plugins/grok-router/scripts/lib/lean.mjs";
import { parseGrokModels } from "../plugins/grok-router/scripts/lib/models.mjs";
import { buildRouterRequest } from "../plugins/grok-router/scripts/lib/router.mjs";
import { helpText } from "./helpers.mjs";

const catalog = parseGrokModels(`Default model: grok-4.6

Available models:
  * grok-4.6 (default)
`);
const nativeControls = classifyControls(helpText()).safeForward;

test("lean is router-owned and not forwarded as --lean", () => {
  const request = buildRouterRequest({
    mode: "analyze",
    prompt: "q",
    options: { lean: true },
    catalog,
    nativeControls
  });
  const args = buildGrokPrintArgs(request);
  assert.equal(request.lean, true);
  assert.ok(!args.includes("--lean"));
  assert.ok(!request.nativeArgs.includes("--lean"));
  assert.ok(args.includes("--disallowed-tools"));
  assert.equal(args[args.indexOf("--disallowed-tools") + 1], LEAN_DISALLOWED_TOOLS);
  assert.ok(args.includes("--disable-web-search"));
  assert.ok(args.includes("--no-subagents"));
  assert.ok(args.includes("--no-plan"));
  assert.ok(args.includes("--system-prompt-override"));
  assert.ok(args.includes("--tools"));
  assert.ok(!args.includes("--always-approve"));
  assert.equal(request.extraEnv.GROK_MEMORY, "0");
});

test("review --full does not emit the lean strip", () => {
  const request = buildRouterRequest({
    mode: "review",
    prompt: "",
    options: { full: true },
    catalog,
    nativeControls,
    diff: { text: "diff --git a/x b/x", command: "git diff" }
  });
  const args = buildGrokPrintArgs(request);
  assert.equal(request.lean, false);
  assert.ok(!args.includes("--disable-web-search"));
  assert.ok(!args.includes("--no-subagents"));
  assert.ok(!args.includes("--system-prompt-override"));
  assert.ok(args.includes("--json-schema"));
});

test("--lean and --full conflict", () => {
  assert.throws(
    () => buildRouterRequest({
      mode: "analyze",
      prompt: "q",
      options: { lean: true, full: true },
      catalog,
      nativeControls
    }),
    /cannot be combined/
  );
});

test("--lean --search keeps web tools", () => {
  const request = buildRouterRequest({
    mode: "analyze",
    prompt: "q",
    options: { lean: true, search: true },
    catalog,
    nativeControls
  });
  const args = buildGrokPrintArgs(request);
  assert.equal(request.tools, "read_file,grep,list_dir,web_search,web_fetch");
  assert.ok(!args.includes("--disable-web-search"));
});

test("gitStatusChanged compares short status", () => {
  assert.equal(gitStatusChanged({ available: true, short: "" }, { available: true, short: " M file" }), true);
  assert.equal(gitStatusChanged({ available: true, short: "" }, { available: true, short: "" }), false);
  assert.equal(gitStatusChanged({ available: false, short: "" }, { available: true, short: " M file" }), false);
});

test("summarizeInspect uses live field names", () => {
  const summary = summarizeInspect({
    grokVersion: "1.0.34",
    projectInstructions: [{ path: "/Users/mika/.grok/Agents.md", scope: "global", approxTokens: 1739 }],
    skills: [{ name: "a" }, { name: "b" }],
    plugins: [{}],
    mcpServers: [{}, {}],
    hooks: []
  });
  assert.equal(summary.instructionTokens, 1739);
  assert.equal(summary.skills, 2);
  assert.equal(summary.mcpServers, 2);
  assert.equal(summary.hooks, 0);
});
