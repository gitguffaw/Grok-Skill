import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { makeTempDir, readArgv, REPO_ROOT, testEnv } from "./helpers.mjs";

const HOOK = path.join(REPO_ROOT, "plugins", "grok-router", "scripts", "stop-review-panel-hook.mjs");

function gitInit(tempDir, { dirty = false } = {}) {
  spawnSync("git", ["init"], { cwd: tempDir, encoding: "utf8" });
  fs.writeFileSync(path.join(tempDir, "README.md"), "hello\n");
  spawnSync("git", ["add", "README.md"], { cwd: tempDir, encoding: "utf8" });
  spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-m", "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  if (dirty) {
    fs.writeFileSync(path.join(tempDir, "README.md"), "hello world\n");
  }
}

function runHook(tempDir, extras = {}) {
  return spawnSync(process.execPath, [HOOK], {
    cwd: tempDir,
    env: testEnv(tempDir, extras),
    encoding: "utf8",
    input: JSON.stringify({ cwd: tempDir }),
    timeout: 20000
  });
}

test("Stop hook ships and points at the review panel script", () => {
  const hooks = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "plugins", "grok-router", "hooks", "hooks.json"), "utf8")
  );
  assert.match(hooks.hooks.Stop[0].hooks[0].command, /stop-review-panel-hook\.mjs/);
  assert.equal(fs.existsSync(HOOK), true);
});

test("Stop hook skips a clean git tree", () => {
  const tempDir = makeTempDir();
  gitInit(tempDir, { dirty: false });
  const result = runHook(tempDir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /clean tree, skip review panel/);
  assert.equal(readArgv(tempDir), null);
});

test("Stop hook runs review --panel on a dirty tree", () => {
  const tempDir = makeTempDir();
  gitInit(tempDir, { dirty: true });
  const result = runHook(tempDir);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const recorded = readArgv(tempDir);
  assert.ok(recorded.argv.includes("--panel") || recorded.argv.includes("--no-subagents"));
  assert.match(result.stderr, /panel|finding|Job ID/i);
  assert.equal(result.stdout.trim(), "");
});

test("Stop hook does not re-enter", () => {
  const tempDir = makeTempDir();
  gitInit(tempDir, { dirty: true });
  const result = runHook(tempDir, { GROK_ROUTER_STOP_PANEL: "1" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /already inside the stop panel hook/);
  assert.equal(readArgv(tempDir), null);
});
