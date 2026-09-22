export const MAX_LANES = 8;
export const MAX_SYNTHESIS_FINDINGS = 20;
export const MAX_SYNTHESIS_CHARS = 8000;

export const FROZEN_LANES = {
  review: ["correctness bugs", "error handling gaps", "missing tests"],
  "adversarial-review": ["assumptions", "alternatives", "failure modes"]
};

export function parseLanes(mode, options = {}) {
  const raw = options.lanes;
  if (raw && raw !== true) {
    const lanes = String(raw)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!lanes.length) {
      throw new Error("--lanes requires a comma-separated list of lane names.");
    }
    if (lanes.length > MAX_LANES) {
      throw new Error(`--lanes accepts at most ${MAX_LANES} names.`);
    }
    return lanes;
  }
  if (options.panel || options.parallel) {
    const frozen = FROZEN_LANES[mode];
    if (!frozen) {
      throw new Error(`--panel/--parallel on ${mode} requires explicit --lanes <a,b,...>.`);
    }
    return frozen;
  }
  return null;
}

export function findingKey(finding) {
  return `${String(finding.path ?? "").toLowerCase()}::${String(finding.title ?? finding.issue ?? "").toLowerCase()}`;
}

export function mergeLaneFindings(lanes) {
  const seen = new Set();
  const findings = [];
  let dropped = 0;
  for (const lane of lanes) {
    const parsed = lane.structuredOutput ?? lane.parsedOutput ?? {};
    const list = Array.isArray(parsed.findings) ? parsed.findings : [];
    for (const item of list) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const key = findingKey(item);
      if (seen.has(key)) {
        dropped += 1;
        continue;
      }
      seen.add(key);
      findings.push({
        ...item,
        lane: lane.label,
        laneId: lane.id
      });
    }
  }
  const kept = findings.slice(0, MAX_SYNTHESIS_FINDINGS);
  dropped += Math.max(0, findings.length - kept.length);
  const failed = lanes.filter((lane) => lane.status && !["completed", "completed-with-warnings"].includes(lane.status));
  const summary = failed.length
    ? `${kept.length} findings from ${lanes.length} lanes (${failed.length} lane(s) failed).`
    : `${kept.length} findings from ${lanes.length} lanes.`;
  return {
    summary,
    findings: kept,
    dropped,
    lanes: lanes.map((lane) => ({
      id: lane.id,
      label: lane.label,
      status: lane.status ?? "unknown",
      result: `grok-router result ${lane.id}`
    }))
  };
}

export function renderSynthesis(synthesis) {
  const body = JSON.stringify(synthesis, null, 2);
  if (body.length <= MAX_SYNTHESIS_CHARS) {
    return `${body}\n`;
  }
  const truncated = {
    ...synthesis,
    findings: synthesis.findings.slice(0, 5),
    truncated: true,
    dropped: (synthesis.dropped ?? 0) + Math.max(0, synthesis.findings.length - 5)
  };
  return `${JSON.stringify(truncated, null, 2)}\n`;
}
