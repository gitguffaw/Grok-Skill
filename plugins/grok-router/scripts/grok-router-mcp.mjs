#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { discoverGrokControls, schemaForLiveControl } from "./lib/live-controls.mjs";
import { readGrokHelp } from "./lib/grok.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const COMPANION = path.join(ROOT, "scripts", "grok-companion.mjs");

const MANAGED = [
  { name: "grok_router_setup", command: "setup", description: "Check grok binary, auth, and review-gate configuration." },
  { name: "grok_router_models", command: "models", description: "Live grok models catalog." },
  { name: "grok_router_surface", command: "surface", description: "Installed grok help and router coverage." },
  { name: "grok_router_help", command: "help", description: "Router help or grok <path> --help." },
  { name: "grok_router_analyze", command: "analyze", description: "Read-only Grok analysis." },
  { name: "grok_router_exec", command: "exec", description: "Write-capable Grok implementation." },
  { name: "grok_router_review", command: "review", description: "Findings-only Grok review of a git diff." },
  { name: "grok_router_adversarial_review", command: "adversarial-review", description: "Steerable challenge review." },
  { name: "grok_router_rescue", command: "rescue", description: "Tracked investigate/fix with session resume." },
  { name: "grok_router_status", command: "status", description: "List or inspect jobs." },
  { name: "grok_router_result", command: "result", description: "Stored job output." },
  { name: "grok_router_cancel", command: "cancel", description: "Cancel an active job." },
  { name: "grok_router_cli", command: "cli", description: "Raw grok argv passthrough." }
];

function staticProperties() {
  return {
    prompt: { type: "string", description: "Task text after flags." },
    model: { type: "string", description: "Live grok model id or unique alias." },
    effort: { type: "string", description: "Opaque --reasoning-effort value." },
    best: { type: "boolean", description: "Select the live default model." },
    background: { type: "boolean" },
    lean: { type: "boolean", description: "Router-owned context diet. Opt-in. Not a grok flag." },
    full: { type: "boolean", description: "Disable --lean and restore 0.1.0 ambient behavior." },
    search: { type: "boolean" },
    docs: { type: "boolean" },
    parallel: { type: "boolean" },
    tool: { type: "string" },
    base: { type: "string", description: "Git base ref for review." },
    json: { type: "boolean" },
    cwd: { type: "string" }
  };
}

function listTools() {
  const help = readGrokHelp(process.cwd());
  const live = help.ok ? discoverGrokControls(help.text).filter((control) => !control.policy && !control.routerOwned) : [];
  return MANAGED.map((tool) => {
    const properties = { ...staticProperties() };
    for (const control of live) {
      properties[control.option.replaceAll("-", "_")] = schemaForLiveControl(control);
    }
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: { type: "object", properties, additionalProperties: true }
    };
  });
}

function toArgv(input = {}) {
  const args = [];
  const skip = new Set(["prompt"]);
  for (const [key, value] of Object.entries(input)) {
    if (skip.has(key) || value === undefined || value === null || value === false) {
      continue;
    }
    const flag = `--${key.replaceAll("_", "-")}`;
    if (value === true) {
      args.push(flag);
      continue;
    }
    args.push(flag, String(value));
  }
  if (input.prompt) {
    args.push(String(input.prompt));
  }
  return args;
}

function runCompanion(command, input) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [COMPANION, command, ...toArgv(input)], {
      cwd: input.cwd || process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => {
      resolve({ status: status ?? 1, stdout, stderr });
    });
  });
}

function send(message) {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function fail(id, message) {
  send({ jsonrpc: "2.0", id, error: { code: -32000, message } });
}

async function handle(message) {
  if (!message || message.jsonrpc !== "2.0") {
    return;
  }
  const { id, method, params } = message;
  if (method === "initialize") {
    reply(id, {
      protocolVersion: params?.protocolVersion ?? "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "grok-router", version: "0.1.0" }
    });
    return;
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return;
  }
  if (method === "tools/list") {
    reply(id, { tools: listTools() });
    return;
  }
  if (method === "tools/call") {
    const name = params?.name;
    const tool = MANAGED.find((entry) => entry.name === name);
    if (!tool) {
      fail(id, `Unknown tool ${name}`);
      return;
    }
    const result = await runCompanion(tool.command, params?.arguments ?? {});
    const text = (result.stdout || result.stderr || `exit ${result.status}`).trim();
    reply(id, {
      content: [{ type: "text", text }],
      isError: result.status !== 0
    });
    return;
  }
  if (id !== undefined) {
    fail(id, `Unknown method ${method}`);
  }
}

process.stdin.setEncoding("utf8");
let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  while (true) {
    if (buffer.startsWith("{")) {
      const newline = buffer.indexOf("\n");
      if (newline === -1) {
        return;
      }
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        handle(JSON.parse(line)).catch((error) => {
          process.stderr.write(`${error.message}\n`);
        });
      }
      continue;
    }
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }
    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }
    const length = Number(match[1]);
    const start = headerEnd + 4;
    if (buffer.length < start + length) {
      return;
    }
    const body = buffer.slice(start, start + length);
    buffer = buffer.slice(start + length);
    handle(JSON.parse(body)).catch((error) => {
      process.stderr.write(`${error.message}\n`);
    });
  }
});
