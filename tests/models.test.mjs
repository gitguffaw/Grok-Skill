import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { catalogAliases, parseGrokModels, resolveModelSelector } from "../plugins/grok-router/scripts/lib/models.mjs";
import { FIXTURES } from "./helpers.mjs";

test("parseGrokModels reads live catalog text", () => {
  const catalog = parseGrokModels(fs.readFileSync(path.join(FIXTURES, "grok-models.txt"), "utf8"));
  assert.equal(catalog.loggedIn, true);
  assert.equal(catalog.defaultModel, "grok-4.6");
  assert.deepEqual(catalog.models.map((model) => model.id), ["grok-4.6", "grok-4.5"]);
  assert.equal(catalogAliases(catalog.models).get("4.6"), "grok-4.6");
  assert.equal(resolveModelSelector(catalog, "4.5"), "grok-4.5");
  assert.equal(resolveModelSelector(catalog, null, { best: true }), "grok-4.6");
});

test("new model ids resolve without a Router release", () => {
  const catalog = parseGrokModels(`Default model: grok-5.0

Available models:
  * grok-5.0 (default)
  - grok-4.6
`);
  assert.equal(catalog.defaultModel, "grok-5.0");
  assert.equal(resolveModelSelector(catalog, "grok-5.0"), "grok-5.0");
  assert.equal(resolveModelSelector(catalog, null, { best: true }), "grok-5.0");
  assert.throws(() => resolveModelSelector(catalog, "missing-model"), /Unknown Grok model/);
});
