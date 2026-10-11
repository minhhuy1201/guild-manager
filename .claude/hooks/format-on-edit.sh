#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): run Prettier on the file Claude just wrote when its workspace's CI
# job runs `format:check` (apps/api, packages/ci-triage), so a formatting slip is fixed now rather
# than after a push.
#
# Wiring: registered as a PostToolUse hook (matcher "Edit|Write") in .claude/settings.json.
# Never blocks: always exits 0. The tool already ran, so there is nothing left to stop.
set -uo pipefail

input="$(cat)"
# Claude Code always sends an absolute path for file tools.
file_path="$(HOOK_INPUT="$input" node -e \
  'process.stdout.write(JSON.parse(process.env.HOOK_INPUT).tool_input?.file_path ?? "")')"

case "$file_path" in
  "$CLAUDE_PROJECT_DIR"/apps/api/src/*.ts) prettier="$CLAUDE_PROJECT_DIR/apps/api/node_modules/.bin/prettier" ;;
  "$CLAUDE_PROJECT_DIR"/packages/ci-triage/src/*.ts) prettier="$CLAUDE_PROJECT_DIR/packages/ci-triage/node_modules/.bin/prettier" ;;
  *) exit 0 ;;
esac

# The workspace binary is called directly: `pnpm --filter <ws> exec` re-runs install and
# `prisma generate` on every call, which is slow and races when edits land in parallel.
# Prettier fails on a file it cannot parse. That is swallowed on purpose: the lint run in
# check-on-stop.sh reports the same syntax error with a better message.
"$prettier" --write "$file_path" >/dev/null 2>&1 || true
exit 0
