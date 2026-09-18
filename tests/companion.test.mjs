import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { COMPANION, makeTempDir, readArgv, testEnv } from "./helpers.mjs";

function runCompanion(args, tempDir, extras = {}) {
  const env = testEnv(tempDir, extras);
  const result = spawnSync(process.execPath, [COMPANION, ...args], {
    cwd: extras.cwd || tempDir,
    env,
    encoding: "utf8"
  });
  return result;
}

test("models reports the live fake catalog", () => {
  const tempDir = makeTempDir();
  const result = runCompanion(["models", "--json"], tempDir);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.defaultModel, "grok-4.6");
  assert.ok(payload.models.some((model) => model.id === "grok-4.5"));
});

test("surface lists live commands including clone", () => {
  const tempDir = makeTempDir();
  const result = runCompanion(["surface", "--json"], tempDir);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  const clone = payload.coverage.commands.find((command) => command.name === "clone");
  assert.equal(clone.coverage, "cli-only");
  const model = payload.coverage.flags.find((flag) => flag.option === "model");
  assert.equal(model.coverage, "safe-forward");
  const always = payload.coverage.flags.find((flag) => flag.option === "always-approve");
  assert.equal(always.coverage, "policy-owned");
});

test("analyze launches grok -p with a read-only tool allowlist", () => {
  const tempDir = makeTempDir();
  fs.writeFileSync(path.join(tempDir, "README.md"), "hello\n");
  const result = runCompanion(["analyze", "map this repo"], tempDir);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const recorded = readArgv(tempDir);
  assert.ok(recorded.argv.includes("-p"));
  assert.ok(recorded.argv.includes("--tools"));
  assert.ok(recorded.argv.includes("read_file,grep,list_dir"));
  assert.ok(!recorded.argv.includes("--always-approve"));
  assert.match(result.stdout, /fake grok response/);
});

test("exec launches grok -p with --always-approve", () => {
  const tempDir = makeTempDir();
  const result = runCompanion(["exec", "add a comment"], tempDir);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const recorded = readArgv(tempDir);
  assert.ok(recorded.argv.includes("--always-approve"));
  assert.ok(!recorded.argv.includes("--tools"));
});

test("cli forwards unmodeled help", () => {
  const tempDir = makeTempDir();
  const result = runCompanion(["cli", "clone", "--help"], tempDir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Help for clone/);
});

test("review --lean writes a prompt file and does not forward --lean", () => {
  const tempDir = makeTempDir();
  spawnSync("git", ["init"], { cwd: tempDir, encoding: "utf8" });
  fs.writeFileSync(path.join(tempDir, "README.md"), "hello\n");
  spawnSync("git", ["add", "README.md"], { cwd: tempDir, encoding: "utf8" });
  spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-m", "init"], { cwd: tempDir, encoding: "utf8" });
  fs.writeFileSync(path.join(tempDir, "README.md"), "hello world\n");
  const result = runCompanion(["review", "--lean"], tempDir);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const recorded = readArgv(tempDir);
  assert.ok(recorded.argv.includes("--prompt-file"));
  assert.ok(recorded.argv.includes("--json-schema"));
  assert.ok(recorded.argv.includes("--disallowed-tools"));
  assert.ok(recorded.argv.includes("--disable-web-search"));
  assert.ok(recorded.argv.includes("--no-subagents"));
  assert.ok(recorded.argv.includes("--no-plan"));
  assert.ok(recorded.argv.includes("--system-prompt-override"));
  assert.ok(!recorded.argv.includes("--lean"));
  assert.ok(!recorded.argv.includes("--always-approve"));
});

test("setup is ready when fake grok is logged in", () => {
  const tempDir = makeTempDir();
  const result = runCompanion(["setup", "--json"], tempDir);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ready, true);
  assert.equal(payload.grok.available, true);
  const dest = path.join(tempDir, "grok-home", "workflows");
  assert.ok(fs.existsSync(path.join(dest, "grok-router-review.rhai")));
  assert.ok(fs.existsSync(path.join(dest, "grok-router-adversarial-review.rhai")));
});
