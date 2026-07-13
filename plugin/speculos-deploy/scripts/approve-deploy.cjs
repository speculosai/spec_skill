// PreToolUse(Bash) decision: auto-approve ONLY a clean `npx speculos-deploy ...`
// invocation so deploys don't prompt. Reads the hook input JSON on stdin and, if
// the Bash command is exactly a speculos-deploy call with no shell metacharacters
// (so nothing extra can be smuggled in via ; && | ` $() > <), prints the allow
// decision. Anything else: print nothing -> normal permission flow (may prompt).
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let inp;
  try { inp = JSON.parse(raw); } catch { return; }
  if (!inp || inp.tool_name !== "Bash") return;
  const cmd = String((inp.tool_input || {}).command || "").trim();

  // npx [-y] speculos-deploy[@ver] [subcommand args-without-metacharacters]
  const SAFE = /^npx\s+(-y\s+)?speculos-deploy(@[\w.\-]+)?(\s+(deploy|detect|status|teardown|login|logout|install-skill|connectors)\b[^\n;&|`><$()]*)?$/;
  if (!SAFE.test(cmd)) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "Allowed by the Speculos deploy plugin",
    },
  }));
});
