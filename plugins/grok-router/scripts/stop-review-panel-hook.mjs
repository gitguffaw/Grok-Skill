#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isActiveJobStatus, listJobs } from "./lib/jobs.mjs";
import { readGitStatus } from "./lib/workspace.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const COMPANION = path.join(SCRIPT_DIR, "grok-companion.mjs");
const HOOK_TIMEOUT_MS = 14 * 60 * 1000;
const LEAF_TIMEOUT_MS = 180000;
const SKIP_PREFIX = "[grok-router] stop hook:";

function readHookInput() {
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function note(message) {
  process.stderr.write(`${SKIP_PREFIX} ${message}\n`);
}

function resolveCwd(input) {
  return input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

function shouldSkip(cwd, env) {
  if (env.GROK_ROUTER_STOP_PANEL === "1") {
    return "already inside the stop panel hook";
  }
  if (env.GROK_ROUTER_NESTING === "1") {
    return "nested grok-router job";
  }
  const git = readGitStatus(cwd);
  if (!git.available) {
    return "not a git repo";
  }
  if (!git.dirty) {
    return "clean tree, skip review panel";
  }
  const activePanel = listJobs(cwd, env).find((job) => (
    isActiveJobStatus(job.status) && (job.jobClass === "grok-panel" || job.kindLabel?.includes("panel"))
  ));
  if (activePanel) {
    return `panel ${activePanel.id} already running`;
  }
  return null;
}

function main() {
  const input = readHookInput();
  const cwd = resolveCwd(input);
  const skip = shouldSkip(cwd, process.env);
  if (skip) {
    note(skip);
    return;
  }

  const result = spawnSync(
    process.execPath,
    [COMPANION, "review", "--panel", "--timeout-ms", String(LEAF_TIMEOUT_MS)],
    {
      cwd,
      env: { ...process.env, GROK_ROUTER_STOP_PANEL: "1" },
      encoding: "utf8",
      timeout: HOOK_TIMEOUT_MS
    }
  );

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.stdout) {
    process.stderr.write(result.stdout);
  }
  if (result.error?.code === "ETIMEDOUT") {
    note("review panel timed out after 14 minutes");
    return;
  }
  if (result.status !== 0) {
    note(`review panel exited ${result.status ?? "unknown"}`);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
}
