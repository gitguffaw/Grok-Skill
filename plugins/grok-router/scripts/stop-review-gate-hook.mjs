#!/usr/bin/env node

import process from "node:process";
import { getConfig } from "./lib/state.mjs";

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const config = getConfig(cwd);
if (!config.stopReviewGate) {
  process.exit(0);
}

process.stderr.write("Grok Router review gate is enabled. Run grok-router review before treating the turn as done.\n");
process.exit(0);
