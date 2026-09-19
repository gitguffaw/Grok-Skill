import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { FROZEN_LANES, mergeLaneFindings, parseLanes } from "../plugins/grok-router/scripts/lib/panel.mjs";
import { COMPANION, makeTempDir, testEnv } from "./helpers.mjs";

test("parseLanes uses frozen review template for --panel", () => {
  assert.deepEqual(parseLanes("review", { panel: true }), FROZEN_LANES.review);
  assert.deepEqual(parseLanes("review", { lanes: "a, b" }), ["a", "b"]);
  assert.deepEqual(parseLanes("exec", { lanes: "login,logout" }), ["login", "logout"]);
  assert.equal(parseLanes("analyze", {}), null);
  assert.throws(() => parseLanes("exec", { panel: true }), /requires explicit --lanes/);
});

test("mergeLaneFindings dedupes and caps", () => {
  const merged = mergeLaneFindings([
    {
      id: "j1",
      label: "a",
      status: "completed",
      structuredOutput: { findings: [{ severity: "high", title: "dup", path: "x.ts" }] }
    },
    {
      id: "j2",
      label: "b",
      status: "completed",
      structuredOutput: { findings: [{ severity: "low", title: "dup", path: "x.ts" }, { severity: "high", title: "other", path: "y.ts" }] }
    }
  ]);
  assert.equal(merged.findings.length, 2);
  assert.equal(merged.dropped, 1);
  assert.equal(merged.lanes.length, 2);
});

function runCompanion(args, tempDir) {
  return spawnSync(process.execPath, [COMPANION, ...args], {
    cwd: tempDir,
    env: testEnv(tempDir),
    encoding: "utf8"
  });
}

test("review --panel launches frozen lanes and prints bounded synthesis", () => {
  const tempDir = makeTempDir();
  spawnSync("git", ["init"], { cwd: tempDir, encoding: "utf8" });
  fs.writeFileSync(path.join(tempDir, "README.md"), "hello\n");
  spawnSync("git", ["add", "README.md"], { cwd: tempDir, encoding: "utf8" });
  spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-m", "init"], { cwd: tempDir, encoding: "utf8" });
  fs.writeFileSync(path.join(tempDir, "README.md"), "hello world\n");
  const result = runCompanion(["review", "--panel"], tempDir);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stderr, /# Grok review panel Started/);
  assert.match(result.stderr, /Job ID:\s+\S+/);
  assert.match(result.stderr, /Lane correctness bugs:/);
  const synthesis = JSON.parse(result.stdout);
  assert.equal(synthesis.lanes.length, 3);
  assert.ok(Array.isArray(synthesis.findings));
  const jobsDir = fs.readdirSync(path.join(tempDir, "data", "state")).flatMap((slug) => {
    const jobs = path.join(tempDir, "data", "state", slug, "jobs");
    return fs.existsSync(jobs) ? fs.readdirSync(jobs).filter((name) => name.endsWith(".json")) : [];
  });
  assert.ok(jobsDir.length >= 4, `expected parent+3 leaves, got ${jobsDir.length}`);
});

test("exec --lanes launches one write grok per named slice", () => {
  const tempDir = makeTempDir();
  const result = runCompanion(["exec", "--lanes", "login,logout", "add auth"], tempDir);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stderr, /# Grok exec panel Started/);
  assert.match(result.stderr, /Lane login:/);
  assert.match(result.stderr, /Lane logout:/);
  assert.match(result.stdout, /2 exec lanes completed/);
  assert.match(result.stdout, /- login:/);
  assert.match(result.stdout, /- logout:/);
  const recorded = JSON.parse(fs.readFileSync(path.join(tempDir, "argv.json"), "utf8"));
  assert.ok(recorded.argv.includes("--always-approve"));
  assert.ok(recorded.argv.includes("--no-subagents"));
});

test("nested companion fan-out is refused", () => {
  const tempDir = makeTempDir();
  const result = spawnSync(process.execPath, [COMPANION, "review", "--panel"], {
    cwd: tempDir,
    env: { ...testEnv(tempDir), GROK_ROUTER_NESTING: "1" },
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Nested grok-router fan-out/);
});
