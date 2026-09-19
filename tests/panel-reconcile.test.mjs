import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { refreshStaleJobs, readFullJob } from "../plugins/grok-router/scripts/lib/jobs.mjs";
import { saveJob } from "../plugins/grok-router/scripts/lib/state.mjs";
import { COMPANION, makeTempDir, testEnv } from "./helpers.mjs";

test("status reconciles a dead panel from child terminals and marks later lanes not-started", () => {
  const tempDir = makeTempDir();
  const env = testEnv(tempDir);
  const createdAt = "2026-09-19T05:01:06.565Z";
  saveJob(tempDir, {
    id: "exec-panel-orphan",
    jobClass: "grok-panel",
    kindLabel: "exec panel",
    mode: "exec",
    status: "running",
    phase: "panel",
    plannedLanes: ["a", "b", "c"],
    lanes: ["a", "b", "c"],
    workspaceRoot: tempDir,
    companionPid: 999999999,
    companionProcessStartTime: "never",
    createdAt
  }, env);
  saveJob(tempDir, {
    id: "exec-lane-a",
    jobClass: "grok-lane",
    parentId: "exec-panel-orphan",
    lane: "a",
    mode: "exec",
    status: "failed",
    phase: "timed-out",
    rendered: "lane a timed out",
    createdAt
  }, env);
  saveJob(tempDir, {
    id: "exec-lane-b",
    jobClass: "grok-lane",
    parentId: "exec-panel-orphan",
    lane: "b",
    mode: "exec",
    status: "failed",
    phase: "stale-process",
    rendered: "lane b lost",
    createdAt
  }, env);
  refreshStaleJobs(tempDir, env);
  const parent = readFullJob(tempDir, "exec-panel-orphan", env);
  assert.equal(parent.status, "failed");
  assert.equal(parent.phase, "interrupted");
  assert.equal(parent.lanes[0].status, "failed");
  assert.equal(parent.lanes[0].id, "exec-lane-a");
  assert.equal(parent.lanes[1].status, "failed");
  assert.equal(parent.lanes[2].status, "not-started");
  assert.equal(parent.lanes[2].id, null);
  assert.match(parent.rendered, /not-started|not started/);
  assert.notEqual(parent.updatedAt, createdAt);
});

test("legacy panel without parentId still reconciles children created after it", () => {
  const tempDir = makeTempDir();
  const env = testEnv(tempDir);
  saveJob(tempDir, {
    id: "exec-panel-legacy",
    jobClass: "grok-panel",
    kindLabel: "exec panel",
    mode: "exec",
    status: "running",
    phase: "panel",
    lanes: ["clocks", "lifetime", "coverage"],
    workspaceRoot: tempDir,
    createdAt: "2026-09-19T05:01:06.565Z"
  }, env);
  saveJob(tempDir, {
    id: "exec-lane-clocks",
    jobClass: "grok-lane",
    lane: "clocks",
    mode: "exec",
    status: "failed",
    phase: "timed-out",
    createdAt: "2026-09-19T05:01:06.723Z"
  }, env);
  saveJob(tempDir, {
    id: "exec-lane-lifetime",
    jobClass: "grok-lane",
    lane: "lifetime",
    mode: "exec",
    status: "failed",
    phase: "stale-process",
    createdAt: "2026-09-19T05:31:07.274Z"
  }, env);
  refreshStaleJobs(tempDir, env);
  const parent = readFullJob(tempDir, "exec-panel-legacy", env);
  assert.equal(parent.status, "failed");
  assert.equal(parent.lanes.find((lane) => lane.label === "coverage").status, "not-started");
});

test("status command reconciles an orphaned panel", () => {
  const tempDir = makeTempDir();
  const env = testEnv(tempDir);
  saveJob(tempDir, {
    id: "exec-panel-cli",
    jobClass: "grok-panel",
    kindLabel: "exec panel",
    mode: "exec",
    status: "running",
    phase: "panel",
    plannedLanes: ["one", "two"],
    lanes: ["one", "two"],
    workspaceRoot: tempDir,
    companionPid: 1,
    companionProcessStartTime: "not-this-boot",
    createdAt: new Date().toISOString()
  }, env);
  const status = spawnSync(process.execPath, [COMPANION, "status", "--json", "exec-panel-cli"], {
    cwd: tempDir,
    env,
    encoding: "utf8",
    timeout: 15000
  });
  assert.equal(status.status, 0, status.stderr + status.stdout);
  const report = JSON.parse(status.stdout);
  assert.equal(report.status, "failed");
  assert.equal(report.phase, "interrupted");
  assert.equal(report.lanes[0].status, "not-started");
  assert.equal(report.lanes[1].status, "not-started");
});
