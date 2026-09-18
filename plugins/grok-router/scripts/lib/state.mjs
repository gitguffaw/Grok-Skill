import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveWorkspaceRoot } from "./workspace.mjs";

const STATE_VERSION = 1;
const LOCK_TIMEOUT_MS = 5000;

function nowIso() {
  return new Date().toISOString();
}

function defaultState() {
  return { version: STATE_VERSION, config: {}, jobs: [] };
}

export function resolveStateDir(cwd, env = process.env) {
  const workspaceRoot = resolveWorkspaceRoot(cwd);
  let canonical = workspaceRoot;
  try {
    canonical = fs.realpathSync.native(workspaceRoot);
  } catch {
    canonical = workspaceRoot;
  }
  const slug = (path.basename(workspaceRoot) || "workspace").replace(/[^a-zA-Z0-9._-]+/g, "-") || "workspace";
  const hash = createHash("sha256").update(canonical).digest("hex").slice(0, 16);
  const base = env.GROK_ROUTER_DATA || path.join(os.homedir(), ".grok-router");
  return path.join(base, "state", `${slug}-${hash}`);
}

export function resolveJobsDir(cwd, env = process.env) {
  return path.join(resolveStateDir(cwd, env), "jobs");
}

export function resolveStateFile(cwd, env = process.env) {
  return path.join(resolveStateDir(cwd, env), "state.json");
}

export function resolveJobFile(cwd, jobId, env = process.env) {
  return path.join(resolveJobsDir(cwd, env), `${jobId}.json`);
}

export function resolveJobLogFile(cwd, jobId, env = process.env) {
  return path.join(resolveJobsDir(cwd, env), `${jobId}.log`);
}

export function ensureStateDir(cwd, env = process.env) {
  fs.mkdirSync(resolveJobsDir(cwd, env), { recursive: true, mode: 0o700 });
}

function lockDir(cwd, env) {
  return path.join(resolveStateDir(cwd, env), "state.lock");
}

function withLock(cwd, env, fn) {
  ensureStateDir(cwd, env);
  const dir = lockDir(cwd, env);
  const start = Date.now();
  while (true) {
    try {
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "pid"), `${process.pid}\n`, { encoding: "utf8", mode: 0o600 });
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
      if (Date.now() - start > LOCK_TIMEOUT_MS) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch {
          // continue
        }
        if (Date.now() - start > LOCK_TIMEOUT_MS * 2) {
          throw new Error("Timed out waiting for Grok Router state lock.");
        }
      }
      const until = Date.now() + 15;
      while (Date.now() < until) {
        // lock retry
      }
    }
  }
  try {
    return fn();
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

function loadStateUnlocked(cwd, env) {
  const file = resolveStateFile(cwd, env);
  if (!fs.existsSync(file)) {
    return defaultState();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return { ...defaultState(), ...parsed, config: parsed.config ?? {}, jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [] };
  } catch {
    return defaultState();
  }
}

function saveStateUnlocked(cwd, env, state) {
  ensureStateDir(cwd, env);
  const file = resolveStateFile(cwd, env);
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, file);
}

export function getConfig(cwd, env = process.env) {
  return loadStateUnlocked(cwd, env).config ?? {};
}

export function setConfig(cwd, patch, env = process.env) {
  return withLock(cwd, env, () => {
    const state = loadStateUnlocked(cwd, env);
    state.config = { ...state.config, ...patch };
    saveStateUnlocked(cwd, env, state);
    return state.config;
  });
}

export function generateJobId(prefix = "job") {
  const stamp = Date.now().toString(36);
  const rand = randomBytes(3).toString("hex");
  return `${prefix}-${stamp}${rand}`;
}

export function readJobFile(cwd, jobId, env = process.env) {
  const file = resolveJobFile(cwd, jobId, env);
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJobFile(cwd, job, env) {
  const file = resolveJobFile(cwd, job.id, env);
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(job, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, file);
}

export function listJobs(cwd, env = process.env) {
  const state = loadStateUnlocked(cwd, env);
  return state.jobs.map((entry) => readJobFile(cwd, entry.id, env) ?? entry).filter(Boolean);
}

export function saveJob(cwd, job, env = process.env) {
  return withLock(cwd, env, () => {
    const state = loadStateUnlocked(cwd, env);
    const record = { ...job, updatedAt: nowIso(), createdAt: job.createdAt ?? nowIso() };
    writeJobFile(cwd, record, env);
    const index = state.jobs.findIndex((entry) => entry.id === job.id);
    const entry = { id: record.id, status: record.status, updatedAt: record.updatedAt };
    if (index === -1) {
      state.jobs.push(entry);
    } else {
      state.jobs[index] = entry;
    }
    saveStateUnlocked(cwd, env, state);
    return record;
  });
}

export function transitionJob(cwd, jobId, updater, env = process.env) {
  return withLock(cwd, env, () => {
    const current = readJobFile(cwd, jobId, env);
    const result = updater(current);
    if (!result?.apply) {
      return { applied: false, reason: result?.reason ?? "skip", job: result?.job ?? current };
    }
    const next = { ...result.job, updatedAt: nowIso() };
    writeJobFile(cwd, next, env);
    const state = loadStateUnlocked(cwd, env);
    const index = state.jobs.findIndex((entry) => entry.id === jobId);
    const entry = { id: next.id, status: next.status, updatedAt: next.updatedAt };
    if (index === -1) {
      state.jobs.push(entry);
    } else {
      state.jobs[index] = entry;
    }
    saveStateUnlocked(cwd, env, state);
    return { applied: true, reason: result.reason ?? "apply", job: next };
  });
}
