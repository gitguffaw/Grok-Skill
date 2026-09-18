let meta = #{
    name: "grok-router-review",
    description: "Host-owned review fan-out: one slash, bounded findings, no chat-agent spawn_subagent",
    when_to_use: "Type /workflow grok-router-review when already in Grok. Do not spawn_subagent from the chat agent.",
    phases: [
        #{ title: "Review", detail: "one leaf per frozen dimension" },
        #{ title: "Merge", detail: "bounded findings object" },
    ],
};

let findings_schema = #{
    "type": "object",
    "required": ["findings", "summary"],
    "properties": #{
        "summary": #{ "type": "string" },
        "findings": #{
            "type": "array",
            "maxItems": 8,
            "items": #{
                "type": "object",
                "required": ["severity", "title"],
                "properties": #{
                    "severity": #{ "type": "string" },
                    "path": #{ "type": "string" },
                    "title": #{ "type": "string" },
                    "risk": #{ "type": "string" },
                    "fix": #{ "type": "string" },
                },
            },
        },
    },
};

let target = if args == () { "the current uncommitted diff" } else if args.target != () { args.target } else { "the current uncommitted diff" };

phase("Review");
let dimensions = ["correctness bugs", "error handling gaps", "missing tests"];
let jobs = [];
for d in dimensions {
    let p = "Review " + target + " for " + d + ". Findings only; do not edit. Use read_file and grep; do not spawn subagents. Return at most 8 findings as {severity, path, title, risk, fix}.";
    jobs.push(#{
        prompt: p,
        label: "review:" + d,
        capability_mode: "read-only",
        output_schema: findings_schema,
    });
}
let results = parallel(jobs);

phase("Merge");
let findings = [];
let i = 0;
for r in results {
    if r != () && r.success && r.output.findings != () {
        for f in r.output.findings {
            findings.push(f);
        }
    }
    i += 1;
}
let kept = [];
let n = 0;
for f in findings {
    if n < 20 {
        kept.push(f);
        n += 1;
    }
}
complete(#{
    summary: kept.len().to_string() + " findings from " + dimensions.len().to_string() + " lanes",
    findings: kept,
    dropped: findings.len() - kept.len(),
});
