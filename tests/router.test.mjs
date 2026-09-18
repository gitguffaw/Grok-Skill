import assert from "node:assert/strict";
import test from "node:test";
import { classifyControls } from "../plugins/grok-router/scripts/lib/live-controls.mjs";
import { parseGrokModels } from "../plugins/grok-router/scripts/lib/models.mjs";
import { buildRouterRequest } from "../plugins/grok-router/scripts/lib/router.mjs";
import { helpText } from "./helpers.mjs";

const catalog = parseGrokModels(`Default model: grok-4.6

Available models:
  * grok-4.6 (default)
  - grok-4.5
`);
const nativeControls = classifyControls(helpText()).safeForward;

test("analyze is read-only and never auto-approves", () => {
  const request = buildRouterRequest({
    mode: "analyze",
    prompt: "map auth",
    options: { search: true, model: "4.6", effort: "xhigh", verbatim: true },
    catalog,
    nativeControls
  });
  assert.equal(request.write, false);
  assert.equal(request.tools, "read_file,grep,list_dir,web_search,web_fetch");
  assert.equal(request.controls.model, "grok-4.6");
  assert.equal(request.controls.effort, "xhigh");
  assert.ok(request.nativeArgs.includes("--verbatim"));
  assert.ok(!request.nativeArgs.includes("--always-approve"));
  assert.ok(!request.nativeArgs.includes("--tools"));
});

test("exec is write-capable", () => {
  const request = buildRouterRequest({
    mode: "exec",
    prompt: "fix the race",
    options: { best: true },
    catalog,
    nativeControls
  });
  assert.equal(request.write, true);
  assert.equal(request.tools, null);
  assert.equal(request.controls.model, "grok-4.6");
});

test("review rejects focus text", () => {
  assert.throws(
    () => buildRouterRequest({ mode: "review", prompt: "look at auth", catalog, nativeControls }),
    /adversarial-review/
  );
});

test("review without prompt uses the working tree", () => {
  const request = buildRouterRequest({
    mode: "review",
    prompt: "",
    options: {},
    catalog,
    nativeControls,
    diff: { text: "diff --git a/x b/x", command: "git diff" }
  });
  assert.equal(request.write, false);
  assert.match(request.prompt, /Findings only/);
  assert.match(request.prompt, /diff --git/);
});

test("safe-forward includes newly discovered flags", () => {
  const controls = classifyControls(helpText({
    flags: `
      --brand-new-flag <VALUE>
          future flag
`
  })).safeForward;
  const request = buildRouterRequest({
    mode: "analyze",
    prompt: "q",
    options: { "brand-new-flag": "yes" },
    catalog,
    nativeControls: controls
  });
  assert.deepEqual(
    request.nativeArgs.slice(request.nativeArgs.indexOf("--brand-new-flag"), request.nativeArgs.indexOf("--brand-new-flag") + 2),
    ["--brand-new-flag", "yes"]
  );
});

test("policy flags are not auto-forwarded from user options", () => {
  const request = buildRouterRequest({
    mode: "analyze",
    prompt: "q",
    options: { "always-approve": true, yolo: true, tools: "write", sandbox: "off" },
    catalog,
    nativeControls
  });
  assert.ok(!request.nativeArgs.includes("--always-approve"));
  assert.ok(!request.nativeArgs.includes("--yolo"));
  assert.ok(!request.nativeArgs.includes("--sandbox"));
  assert.equal(request.tools, "read_file,grep,list_dir");
});
