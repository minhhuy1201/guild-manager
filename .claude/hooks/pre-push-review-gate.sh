#!/usr/bin/env bash
# PreToolUse gate: block `git push` until the pr-review skill has recorded an
# approval marker matching the current HEAD commit.
#
# Wiring: registered as a PreToolUse hook (matcher "Bash") in .claude/settings.json.
# Approval marker: .claude/.pr-review-passed (one line: the reviewed HEAD SHA),
# written by the pr-review skill when the verdict is Approve.
#
# SCOPE — this is a *cooperative* guardrail, NOT a security boundary:
#   - It only intercepts pushes made through Claude Code's Bash tool. A manual
#     `git push` in a plain terminal is not seen by this hook.
#   - The marker is an ordinary file; anything that can write the repo can forge it.
#   For real enforcement (require review/approval before code lands), use GitHub
#   branch protection: require a PR + approvals + green checks on the default branch.
#
# Exit 0 -> allow the command.  Exit 2 -> block; stderr is shown to Claude.
set -uo pipefail

input="$(cat)"

# Decide whether this Bash tool call actually runs a `git ... push`.
# Tokenized detection handles: `git -C path push`, `/usr/bin/git push`, tabs /
# multiple spaces, and pushes chained behind &&, ||, ;, |, & or newlines.
# JSON is passed via env (not stdin) so it doesn't clash with the heredoc program.
#
# Fail-CLOSED on parser trouble: if python3 is missing or the program errors, we
# emit "ERR". Combined with the raw-substring prefilter below, a payload that
# looks at all push-like is then blocked rather than waved through.
verdict="$(HOOK_INPUT="$input" python3 - <<'PY' 2>/dev/null || echo ERR
import os, json, re, sys, shlex
try:
    data = json.loads(os.environ.get("HOOK_INPUT") or "{}")
except Exception:
    print("ERR"); sys.exit(0)
# Only gate the Bash tool (defensive: hook may be wired more broadly).
if data.get("tool_name") not in (None, "Bash"):
    print(""); sys.exit(0)
cmd = (data.get("tool_input") or {}).get("command") or ""
# git global options that consume the following token as their argument.
GLOBAL_OPTS_WITH_ARG = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"}
def tokenize(segment):
    # shlex respects quotes, so `echo "git push"` is one token, not two.
    try:
        return shlex.split(segment, posix=True)
    except ValueError:
        return segment.split()  # unbalanced quotes etc. -> coarse fallback
def is_git_push(segment):
    toks = tokenize(segment)
    gi = next((i for i, t in enumerate(toks) if t.rsplit("/", 1)[-1] == "git"), None)
    if gi is None:
        return False
    j = gi + 1
    while j < len(toks):
        t = toks[j]
        if t in GLOBAL_OPTS_WITH_ARG:
            j += 2; continue
        if t.startswith("-"):
            j += 1; continue
        return t == "push"  # first non-option token is the git subcommand
    return False
# Split on shell operators first so chained `... && git push` is caught.
segments = re.split(r"\|\||&&|;|\||\n|&", cmd)
print("PUSH" if any(is_git_push(s) for s in segments) else "")
PY
)"

# Raw prefilter: does the payload mention git and push at all? Used only to decide
# how to treat a parser failure (fail closed when it looks push-like).
looks_pushy=0
if printf '%s' "$input" | grep -Eq 'git[^"]*push|push[^"]*git'; then
  looks_pushy=1
fi

case "$verdict" in
  PUSH) ;;                                   # confidently a push -> gate it
  ERR)  [ "$looks_pushy" = "1" ] || exit 0 ;; # parser failed -> gate iff push-like
  *)    exit 0 ;;                            # confidently not a push -> allow
esac

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -z "$repo_root" ] && exit 0

marker="$repo_root/.claude/.pr-review-passed"
head_sha="$(git -C "$repo_root" rev-parse HEAD 2>/dev/null || true)"

if [ -f "$marker" ] && [ "$(cat "$marker" 2>/dev/null)" = "$head_sha" ]; then
  exit 0
fi

cat >&2 <<EOF
🔴 Push blocked: code review is required before pushing.

Run the "pr-review" skill on the current changes first (say: "review PR").
When the review verdict is Approve, the skill records approval for commit:
  ${head_sha:-<unknown>}
by writing .claude/.pr-review-passed — then the push is allowed.

To re-review: just run the skill again after your latest commit.
EOF
exit 2
