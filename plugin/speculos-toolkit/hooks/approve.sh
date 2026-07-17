#!/usr/bin/env bash
# PreToolUse(Bash) gate. Fast-path: if the command isn't a speculos-toolkit (or
# legacy speculos-deploy) call, exit immediately (defer to normal permission flow).
# Otherwise hand the hook input to the Node decision script, which strictly
# validates and may auto-approve.
input="$(cat)"
case "$input" in
  *speculos-toolkit*|*speculos-deploy*) ;;  # possibly ours — validate in node
  *) exit 0 ;;                              # not ours — defer (no output), no node startup
esac
printf '%s' "$input" | node "${CLAUDE_PLUGIN_ROOT}/scripts/approve-deploy.cjs"
exit 0
