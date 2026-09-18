import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureStateDir, resolveStateDir } from "./state.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const POLICY_ROOT = path.join(ROOT, "policy", "Grok");
const POLICY_FILES = [
  "SKILL.md",
  "Workflows/Analyze.md",
  "Workflows/Exec.md",
  "Workflows/Review.md",
  "Workflows/Parallel.md",
  "Workflows/Session.md"
];

function readPolicyFiles() {
  return POLICY_FILES.map((relativePath) => {
    const file = path.join(POLICY_ROOT, relativePath);
    return { path: relativePath, content: fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "" };
  });
}

function hashFiles(files) {
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(file.content);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function packId(data) {
  return `ctx-${createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 16)}`;
}

export function createContextPack(workspaceRoot, request, extras = {}) {
  const policyFiles = readPolicyFiles();
  const policyHash = hashFiles(policyFiles);
  const data = {
    version: 1,
    createdAt: new Date().toISOString(),
    policyHash,
    grokVersion: extras.grokVersion ?? null,
    mode: request.mode,
    workflow: request.workflow,
    userRequest: request.userRequest,
    prompt: request.prompt,
    controls: request.controls ?? {},
    tools: request.tools ?? null,
    write: Boolean(request.write),
    nativeArgs: request.nativeArgs ?? [],
    nonGoals: request.nonGoals ?? [],
    constraints: request.constraints ?? [],
    gitBefore: request.gitBefore ?? null,
    policyFiles: policyFiles.map((file) => ({
      path: file.path,
      sha256: createHash("sha256").update(file.content).digest("hex")
    }))
  };
  const id = packId(data);
  ensureStateDir(workspaceRoot);
  const dir = path.join(resolveStateDir(workspaceRoot), "context-packs");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `${id}.json`);
  fs.writeFileSync(file, `${JSON.stringify({ id, ...data }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return { id, file, policyHash };
}
