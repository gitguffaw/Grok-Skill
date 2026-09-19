import fs from "node:fs";
import { collectPanelChildren, parentStatusFromLanes, synthesizePanelFromChildren } from "./panel.mjs";
import { currentProcessRecord, terminateProcessTree, verifyProcessRecord } from "./process.mjs";
import { listJobs, readJobFile, resolveJobLogFile, saveJob, transitionJob } from "./state.mjs";

export { listJobs };

export const ACTIVE_JOB_STATUSES = new Set(["queued", "running"]);
export const TERMINAL_JOB_STATUSES = new Set([
  "completed",
  "completed-with-warnings",
  "blocked",
  "failed",
  "interrupted",
  "cancelled"
]);

export function nowIso() {
  return new Date().toISOString();
}

export function isActiveJobStatus(status) {
  return ACTIVE_JOB_STATUSES.has(status);
}

export function createJobLogFile(cwd, jobId, title, env = process.env) {
  const logFile = resolveJobLogFile(cwd, jobId, env);
  try {
    fs.writeFileSync(logFile, "", { encoding: "utf8", mode: 0o600 });
    if (title) {
      appendLogLine(logFile, `Starting ${title}.`);
    }
  } catch {
    // keep the intended path
  }
  return logFile;
}

export function appendLogLine(logFile, message) {
  const text = String(message ?? "").trim();
  if (!logFile || !text) {
    return;
  }
  try {
    fs.appendFileSync(logFile, `[${nowIso()}] ${text}\n`, "utf8");
  } catch {
    // best-effort
  }
}

export function readLogPreview(logFile, limit = 6) {
  if (!logFile || !fs.existsSync(logFile)) {
    return [];
  }
  return fs.readFileSync(logFile, "utf8").trim().split(/\r?\n/).slice(-limit);
}

export function sortJobsNewestFirst(jobs) {
  return [...jobs].sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")));
}

export function resolveJob(cwd, reference = "", env = process.env) {
  const jobs = sortJobsNewestFirst(listJobs(cwd, env));
  if (!jobs.length) {
    throw new Error("No Grok Router jobs found.");
  }
  if (!reference) {
    return jobs[0];
  }
  const job = jobs.find((candidate) => candidate.id === reference || candidate.id.startsWith(reference));
  if (!job) {
    throw new Error(`No Grok Router job found for "${reference}".`);
  }
  return job;
}

export function readFullJob(cwd, reference = "", env = process.env) {
  const job = resolveJob(cwd, reference, env);
  return readJobFile(cwd, job.id, env) ?? job;
}

export async function runTrackedJob(job, runner, options = {}) {
  const env = options.env ?? process.env;
  const processRecord = currentProcessRecord({ processGroup: Boolean(options.processGroup) });
  const started = saveJob(job.workspaceRoot, {
    ...job,
    status: "running",
    phase: job.phase === "background" ? "background" : "running",
    startedAt: nowIso(),
    companionPid: processRecord.pid,
    companionProcessStartTime: processRecord.processStartTime
  }, env);

  const updateProcess = (childRecord) => {
    const transition = transitionJob(job.workspaceRoot, job.id, (current) => {
      if (!current || TERMINAL_JOB_STATUSES.has(current.status)) {
        return { apply: false, reason: "terminal", job: current };
      }
      return {
        apply: true,
        reason: "track-child",
        job: {
          ...current,
          pid: childRecord.pid ?? null,
          processStartTime: childRecord.processStartTime ?? null,
          processGroup: Boolean(childRecord.processGroup)
        }
      };
    }, env);
    if (!transition.applied && TERMINAL_JOB_STATUSES.has(transition.job?.status)) {
      const error = new Error(`Job ${job.id} is not accepting process tracking.`);
      error.job = transition.job;
      throw error;
    }
    return transition.job ?? started;
  };

  try {
    const execution = await runner({ updateProcess });
    return transitionJob(job.workspaceRoot, job.id, (current) => {
      if (!current) {
        return { apply: false, reason: "missing" };
      }
      if (current.status === "cancelled") {
        return { apply: false, reason: "cancelled", job: current };
      }
      const status = execution.jobStatus ?? (execution.exitStatus === 0 ? "completed" : "failed");
      return {
        apply: true,
        reason: "runner-terminal",
        job: {
          ...current,
          status,
          phase: execution.phase ?? (status === "completed" ? "done" : status),
          result: execution.payload,
          rendered: execution.rendered,
          grokSessionId: execution.grokSessionId ?? null,
          pid: null,
          completedAt: nowIso()
        }
      };
    }, env).job;
  } catch (error) {
    appendLogLine(job.logFile, error instanceof Error ? error.stack || error.message : String(error));
    return transitionJob(job.workspaceRoot, job.id, (current) => ({
      apply: true,
      reason: "failed",
      job: {
        ...(current ?? job),
        status: "failed",
        phase: "failed",
        result: { error: error instanceof Error ? error.message : String(error) },
        rendered: `# Grok Job Failed\n\n${error instanceof Error ? error.message : String(error)}\n`,
        pid: null,
        completedAt: nowIso()
      }
    }), env).job;
  }
}

function processGone(record, envPlatform = process.platform) {
  if (!Number.isFinite(record?.pid)) {
    return true;
  }
  const verification = verifyProcessRecord(
    { pid: record.pid, processStartTime: record.processStartTime ?? record.companionProcessStartTime ?? null },
    { allowUnverified: envPlatform === "win32" }
  );
  return !(verification.matches || verification.reason === "unverifiable");
}

export function reconcilePanelJob(cwd, job, env = process.env) {
  if (job.jobClass !== "grok-panel" || !isActiveJobStatus(job.status)) {
    return job;
  }
  const children = collectPanelChildren(listJobs(cwd, env), job);
  const snapshot = synthesizePanelFromChildren(job, children);
  const outcome = parentStatusFromLanes(snapshot.leafResults);
  const controllerGone = processGone({
    pid: job.companionPid,
    processStartTime: job.companionProcessStartTime
  });
  let status = job.status;
  let phase = job.phase;
  if (controllerGone) {
    status = outcome.status === "running" ? "failed" : outcome.status;
    phase = outcome.status === "running" ? "stale-process" : outcome.phase;
  } else if (outcome.status !== "running") {
    status = outcome.status;
    phase = outcome.phase;
  }
  const terminal = !isActiveJobStatus(status);
  return transitionJob(cwd, job.id, (current) => {
    if (!current || !isActiveJobStatus(current.status)) {
      return { apply: false, reason: "skip", job: current };
    }
    return {
      apply: true,
      reason: terminal ? "panel-reconcile-terminal" : "panel-progress",
      job: {
        ...current,
        status,
        phase,
        lanes: snapshot.synthesis.lanes,
        childIds: children.map((child) => child.id),
        synthesis: snapshot.synthesis,
        rendered: snapshot.rendered,
        summary: snapshot.synthesis.summary,
        pid: null,
        completedAt: terminal ? nowIso() : current.completedAt ?? null
      }
    };
  }, env).job ?? job;
}

export function reconcileStaleJob(cwd, job, env = process.env) {
  if (!isActiveJobStatus(job.status)) {
    return job;
  }
  if (job.jobClass === "grok-panel") {
    return reconcilePanelJob(cwd, job, env);
  }
  if (Number.isFinite(job.pid)) {
    const verification = verifyProcessRecord(
      { pid: job.pid, processStartTime: job.processStartTime ?? null },
      { allowUnverified: process.platform === "win32" }
    );
    if (verification.matches || verification.reason === "unverifiable") {
      return job;
    }
    if (Number.isFinite(job.companionPid) && !processGone({
      pid: job.companionPid,
      processStartTime: job.companionProcessStartTime
    })) {
      return job;
    }
    return transitionJob(cwd, job.id, (current) => {
      if (!current || !isActiveJobStatus(current.status)) {
        return { apply: false, reason: "skip", job: current };
      }
      return {
        apply: true,
        reason: "stale",
        job: {
          ...current,
          status: "failed",
          phase: "stale-process",
          pid: null,
          completedAt: nowIso(),
          result: { error: `Recorded process is stale: ${verification.reason}` }
        }
      };
    }, env).job ?? job;
  }
  if (Number.isFinite(job.companionPid) && processGone({
    pid: job.companionPid,
    processStartTime: job.companionProcessStartTime
  })) {
    return transitionJob(cwd, job.id, (current) => {
      if (!current || !isActiveJobStatus(current.status)) {
        return { apply: false, reason: "skip", job: current };
      }
      return {
        apply: true,
        reason: "stale-companion",
        job: {
          ...current,
          status: "failed",
          phase: "stale-process",
          pid: null,
          completedAt: nowIso(),
          result: { error: "Recorded companion process is stale: not-running" }
        }
      };
    }, env).job ?? job;
  }
  return job;
}

export function refreshStaleJobs(cwd, env = process.env) {
  const jobs = listJobs(cwd, env);
  for (const job of jobs.filter((item) => item.jobClass !== "grok-panel")) {
    reconcileStaleJob(cwd, job, env);
  }
  for (const job of listJobs(cwd, env).filter((item) => item.jobClass === "grok-panel")) {
    reconcilePanelJob(cwd, job, env);
  }
}

export async function cancelJob(cwd, reference, env = process.env) {
  const job = readFullJob(cwd, reference, env);
  if (!isActiveJobStatus(job.status)) {
    throw new Error(`Job ${job.id} is not active (status: ${job.status}).`);
  }
  const marked = transitionJob(cwd, job.id, (current) => ({
    apply: true,
    reason: "cancelling",
    job: { ...current, phase: "cancelling", cancelRequestedAt: nowIso() }
  }), env).job;
  if (Number.isFinite(marked.pid)) {
    await terminateProcessTree(
      { pid: marked.pid, processStartTime: marked.processStartTime, processGroup: marked.processGroup },
      { allowUnverified: true }
    );
  }
  if (Number.isFinite(marked.companionPid) && marked.companionPid !== marked.pid) {
    await terminateProcessTree(
      { pid: marked.companionPid, processStartTime: marked.companionProcessStartTime, processGroup: true },
      { allowUnverified: true }
    );
  }
  return transitionJob(cwd, job.id, (current) => ({
    apply: true,
    reason: "cancelled",
    job: {
      ...current,
      status: "cancelled",
      phase: "cancelled",
      pid: null,
      completedAt: nowIso(),
      rendered: current.rendered ?? `# Grok Job Cancelled\n\nJob ${current.id} was cancelled.\n`
    }
  }), env).job;
}

export async function waitForJob(cwd, reference, options = {}) {
  const env = options.env ?? process.env;
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 30 * 60 * 1000;
  const pollIntervalMs = Math.max(100, Number(options.pollIntervalMs) || 250);
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const job = reconcileStaleJob(cwd, readFullJob(cwd, reference, env), env);
    if (!isActiveJobStatus(job.status)) {
      return { ...job, waitTimedOut: false };
    }
    if (Date.now() >= deadline) {
      return { ...job, waitTimedOut: true };
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, deadline - Date.now())));
  }
}
