import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { parseGrokHelp } from "../plugins/grok-router/scripts/lib/help.mjs";
import { classifyControls, coverageForSurface } from "../plugins/grok-router/scripts/lib/live-controls.mjs";
import { FIXTURES, helpText } from "./helpers.mjs";

test("parseGrokHelp reads live clap help", () => {
  const parsed = parseGrokHelp(fs.readFileSync(path.join(FIXTURES, "grok-help.txt"), "utf8"));
  const longs = parsed.flags.map((flag) => flag.long);
  assert.ok(longs.includes("--model"));
  assert.ok(longs.includes("--always-approve"));
  assert.ok(longs.includes("--reasoning-effort"));
  assert.ok(longs.includes("--tools"));
  const model = parsed.flags.find((flag) => flag.long === "--model");
  assert.equal(model.short, "-m");
  assert.equal(model.requiresValue, true);
  const effort = parsed.flags.find((flag) => flag.long === "--reasoning-effort");
  assert.ok(effort.aliases.includes("--effort"));
  const permission = parsed.flags.find((flag) => flag.long === "--permission-mode");
  assert.ok(permission.possibleValues.includes("bypassPermissions"));
  const names = parsed.commands.map((command) => command.name);
  assert.ok(names.includes("models"));
  assert.ok(names.includes("clone"));
  assert.ok(names.includes("usage"));
  assert.ok(names.includes("cursor-worker"));
});

test("new flags and commands appear without a Router release", () => {
  const text = helpText({
    flags: `
      --brand-new-flag <VALUE>
          A flag added by a future Grok CLI
`,
    commands: `  brand-new-cmd  A command added by a future Grok CLI\n`
  });
  const classified = classifyControls(text);
  const coverage = coverageForSurface(text);
  assert.ok(classified.safeForward.some((control) => control.option === "brand-new-flag"));
  assert.ok(!classified.policy.some((control) => control.option === "brand-new-flag"));
  assert.equal(coverage.commands.find((command) => command.name === "brand-new-cmd")?.coverage, "cli-only");
  assert.equal(coverage.flags.find((flag) => flag.option === "always-approve")?.coverage, "policy-owned");
  assert.equal(coverage.flags.find((flag) => flag.option === "model")?.coverage, "safe-forward");
});
