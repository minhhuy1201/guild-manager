#!/usr/bin/env bash
# Stop hook: before Claude finishes a turn, run lint, typecheck and the drift specs for every
# workspace with changed files, so a broken convention surfaces now instead of in CI after a push.
#
# Wiring: registered as a Stop hook in .claude/settings.json.
# "Changed" means different from the merge-base with origin/main - committed, staged, unstaged or
# untracked. Full test suites stay with CI: too slow to run on every stop.
#
# Cooperative, like pre-push-review-gate.sh: only Claude Code sessions reach it.
#
# Exit 0 -> let Claude stop.  Exit 2 -> block the stop; stderr goes back to Claude.
set -uo pipefail

# Lines kept from each failing command: enough for the first errors, short enough that a wall of
# lint output does not flood Claude's context.
readonly MAX_LINES_PER_FAILURE=60

input="$(cat)"

# After one block Claude continues with `stop_hook_active: true`. Letting that stop through keeps a
# failure Claude cannot fix from looping forever.
stop_hook_active="$(HOOK_INPUT="$input" node -e \
  'process.stdout.write(String(JSON.parse(process.env.HOOK_INPUT).stop_hook_active === true))')"
[ "$stop_hook_active" = "true" ] && exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 1

# Without origin/main (a fresh clone, another remote name) only uncommitted changes count.
base="$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD)"
changed="$({ git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u)"

# Fingerprint of the code as git sees it: the base, every change against it, and the name and
# content of every untracked file. A turn that changed nothing (Claude only answered a question)
# matches the last passing run and skips the 12-25 s of checks.
marker=".claude/.stop-check-passed"
fingerprint="$({
  echo "$base"
  git diff "$base"
  git ls-files --others --exclude-standard
  git ls-files --others --exclude-standard -z | xargs -0 -r git hash-object --
} | git hash-object --stdin)"
[ -f "$marker" ] && [ "$(cat "$marker")" = "$fingerprint" ] && exit 0

run_api=0
run_web=0
run_triage=0
unmapped=()
while IFS= read -r path; do
  case "$path" in
    # env-example.spec.ts reads the env tables in these two docs.
    apps/api/* | docs/development.md | docs/production.md) run_api=1 ;;
    apps/web/*) run_web=1 ;;
    # Both apps compile against the shared package, so both re-check.
    packages/shared/*) run_api=1; run_web=1 ;;
    packages/ci-triage/*) run_triage=1 ;;
    apps/* | packages/*) unmapped+=("$path") ;;
  esac
done <<< "$changed"

failures=""

# Run one command; on failure, append its exit code and the tail of its output to $failures.
check() {
  local output status
  output="$("$@" 2>&1)"
  status=$?
  [ "$status" -eq 0 ] && return
  failures+=$'\n'"== $* (exit $status) =="$'\n'
  failures+="$(printf '%s\n' "$output" | tail -n "$MAX_LINES_PER_FAILURE")"$'\n'
}

if [ "$run_api" = 1 ]; then
  check pnpm --filter api lint
  check pnpm --filter api typecheck
  check pnpm --filter api test env-example prisma-enum-sync
fi
if [ "$run_web" = 1 ]; then
  check pnpm --filter web lint
  check pnpm --filter web typecheck
  check pnpm --filter web test alias-sync
fi
if [ "$run_triage" = 1 ]; then
  check pnpm --filter @guild/ci-triage lint
  check pnpm --filter @guild/ci-triage typecheck
fi
for path in "${unmapped[@]}"; do
  failures+=$'\n'"== $path: no workspace mapped; add one to .claude/hooks/check-on-stop.sh =="$'\n'
done

if [ -z "$failures" ]; then
  # Only a passing run is remembered, so a failure is reported again on the next stop.
  printf '%s\n' "$fingerprint" > "$marker"
  exit 0
fi

printf 'Convention check failed. Fix these before finishing:\n%s' "$failures" >&2
exit 2
