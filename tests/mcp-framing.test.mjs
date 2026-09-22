import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { REPO_ROOT } from "./helpers.mjs";

test("mcp initialize replies with one JSON line", async () => {
  const script = path.join(REPO_ROOT, "plugins/grok-router/scripts/grok-router-mcp.mjs");
  const child = spawn(process.execPath, [script], { stdio: ["pipe", "pipe", "pipe"] });
  let out = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    out += chunk;
  });
  child.stdin.write(`${JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2024-11-05" }
  })}\n`);
  await new Promise((resolve) => {
    setTimeout(resolve, 400);
  });
  child.kill();
  const line = out.trim().split("\n")[0];
  const message = JSON.parse(line);
  assert.equal(message.id, 1);
  assert.equal(message.result.serverInfo.name, "grok-router");
});
