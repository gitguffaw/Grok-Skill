import { runCommand } from "./process.mjs";

const GIT_TIMEOUT_MS = 8000;
const GIT_ENV = { ...process.env, GIT_OPTIONAL_LOCKS: "0" };

function git(args, cwd) {
  return runCommand("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", ...args], {
    cwd,
    env: GIT_ENV,
    timeoutMs: GIT_TIMEOUT_MS
  });
}

export function resolveWorkspaceRoot(cwd) {
  const result = git(["rev-parse", "--show-toplevel"], cwd);
  if (!result.error && result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  return cwd;
}

export function readGitStatus(cwd) {
  const result = git(["status", "--short"], cwd);
  if (result.error?.code === "ETIMEDOUT" || result.signal === "SIGTERM") {
    return { available: true, short: "(git status timed out)", dirty: true, timedOut: true };
  }
  if (result.error || result.status !== 0) {
    return { available: false, short: "", dirty: false };
  }
  const short = result.stdout.trim();
  return { available: true, short, dirty: Boolean(short) };
}

export function readGitDiff(cwd, { base = null, staged = false } = {}) {
  const args = ["diff"];
  if (staged) {
    args.push("--staged");
  } else if (base) {
    args.push(`${base}...`);
  }
  const result = git(args, cwd);
  if (result.error || result.status !== 0) {
    return { available: false, text: result.error?.code === "ETIMEDOUT" ? "(git diff timed out)" : "", command: `git ${args.join(" ")}` };
  }
  return { available: true, text: result.stdout, command: `git ${args.join(" ")}` };
}
