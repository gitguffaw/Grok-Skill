import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
export const FIXTURES = path.join(REPO_ROOT, "tests", "fixtures");
export const COMPANION = path.join(REPO_ROOT, "plugins", "grok-router", "scripts", "grok-companion.mjs");
export const FAKE_GROK = path.join(FIXTURES, "fake-grok.mjs");

export function makeTempDir(prefix = "grok-router-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function testEnv(tempDir, extras = {}) {
  return {
    ...process.env,
    GROK_ROUTER_GROK: FAKE_GROK,
    GROK_ROUTER_DATA: path.join(tempDir, "data"),
    GROK_FAKE_FIXTURES: FIXTURES,
    GROK_FAKE_ARGV: path.join(tempDir, "argv.json"),
    GROK_HOME: path.join(tempDir, "grok-home"),
    ...extras
  };
}

export function readArgv(tempDir) {
  const file = path.join(tempDir, "argv.json");
  if (!fs.existsSync(file)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function helpText({ flags = "", commands = "" } = {}) {
  let text = fs.readFileSync(path.join(FIXTURES, "grok-help.txt"), "utf8");
  if (flags) {
    text = text.replace(/^Commands:/m, `${flags.trimEnd()}\n\nCommands:`);
  }
  if (commands) {
    text = text.replace(/^Commands:\n/m, `Commands:\n${commands.trimEnd()}\n`);
  }
  return text;
}
