#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)));
const fixtureDir = process.env.GROK_FAKE_FIXTURES || ROOT;
const recordPath = process.env.GROK_FAKE_ARGV || path.join(process.cwd(), "fake-grok-argv.json");

function readFixture(name) {
  return fs.readFileSync(path.join(fixtureDir, name), "utf8");
}

function record(argv) {
  const payload = { argv, cwd: process.cwd(), envModel: process.env.GROK_FAKE_TEXT || null };
  try {
    fs.writeFileSync(recordPath, `${JSON.stringify(payload, null, 2)}\n`);
  } catch {
    // ignore
  }
}

const argv = process.argv.slice(2);
record(argv);

if (argv.includes("--version") || argv[0] === "version") {
  process.stdout.write(readFixture("grok-version.txt").trimEnd() + "\n");
  process.exit(0);
}

if (argv[0] === "models") {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(readFixture("grok-models-help.txt"));
    process.exit(0);
  }
  process.stdout.write(readFixture("grok-models.txt"));
  process.exit(0);
}

if (argv[0] === "inspect") {
  process.stdout.write(readFixture("grok-inspect.json"));
  process.exit(0);
}

if (argv.includes("--help") || argv.includes("-h") || argv[0] === "help") {
  if (argv[0] === "help" && argv[1]) {
    process.stdout.write(`Help for ${argv[1]}\n`);
    process.exit(0);
  }
  if (argv[0] !== "--help" && argv[0] !== "-h" && argv[0] !== "help" && argv.includes("--help")) {
    process.stdout.write(`Help for ${argv[0]}\n`);
    process.exit(0);
  }
  process.stdout.write(readFixture("grok-help.txt"));
  process.exit(0);
}

const promptIndex = argv.indexOf("-p");
const promptFileIndex = argv.indexOf("--prompt-file");
if (promptIndex !== -1 || promptFileIndex !== -1) {
  const prompt = promptIndex !== -1
    ? argv[promptIndex + 1]
    : fs.readFileSync(argv[promptFileIndex + 1], "utf8");
  const fail = process.env.GROK_FAKE_FAIL === "1";
  const text = process.env.GROK_FAKE_TEXT || `fake grok response for: ${String(prompt).slice(0, 80)}`;
  const payload = {
    text,
    stopReason: "end_turn",
    sessionId: process.env.GROK_FAKE_SESSION || "11111111-1111-4111-8111-111111111111",
    requestId: "req-fake"
  };
  if (argv.includes("--json-schema")) {
    payload.structuredOutput = {
      summary: "fake lane",
      findings: [{ severity: "low", title: "fake finding", path: "README.md" }]
    };
    payload.text = JSON.stringify(payload.structuredOutput);
  }
  if (argv.includes("--output-format") && argv[argv.indexOf("--output-format") + 1] === "json") {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } else {
    process.stdout.write(`${text}\n`);
  }
  process.exit(fail ? 1 : 0);
}

process.stdout.write(`fake grok: unhandled argv ${JSON.stringify(argv)}\n`);
process.exit(0);
