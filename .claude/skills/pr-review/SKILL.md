---
name: pr-review
description: >-
  Shared PR review checklist and workflow for the team. Use when reviewing a
  Pull Request, inspecting changed code before merge, or when the user says
  "review PR", "review this code", "check this PR", or "review my changes".
domain: code-quality
role: reviewer
scope: review
triggers:
  - review PR
  - review pull request
  - code review
  - check PR
  - review my changes
---

# PR Review

A standard workflow and checklist for reviewing a Pull Request. Goal: catch bugs,
keep quality high, and give consistent feedback across the team.

See [references/checklist.md](references/checklist.md) for the full printable checklist.

## How to use

1. If a PR link/number is given, fetch the diff first. Read the PR description and
   tests before reading the code so you understand the intent.
2. Walk through every group in the checklist below.
3. For each issue, state its severity — 🔴 Blocker / 🟡 Nit / 💬 Question — with a
   `file:line` reference and a concrete fix suggestion.
4. End with a summary: number of Blockers, number of Nits, and a verdict
   (Approve / Request changes).
5. **Record approval (unlocks push).** Only if the verdict is **Approve** and there
   are zero unresolved 🔴 Blockers, record approval for the exact reviewed commit:

   ```bash
   git rev-parse HEAD > "$(git rev-parse --show-toplevel)/.claude/.pr-review-passed"
   ```

   This marker is what the pre-push gate (`.claude/hooks/pre-push-review-gate.sh`)
   checks. Do NOT write it on Request changes. Any new commit after this changes
   HEAD and invalidates the marker, so re-run the review before pushing again.

6. **Opening the PR — always use `@.github/pull_request_template.md`.** Read that file
   and fill in its sections (`## What & Why`, `## Tests`, `## Note`,
   `## Self-review`) rather
   than inventing a structure. `gh pr create` does NOT apply the template when `--body`
   is passed, so a hand-written body silently drops it and the reviewer loses the
   checklist they expect.

   Paste this review's Review Summary verbatim under `## Self-review`, answer every
   💬 Question it raised, and name any 🟡 Nit consciously skipped. Tick a checkbox only
   when it is actually true — an unticked box with one line saying why is useful; a
   ticked box that is false is worse than no PR body at all.

## Checklist

### 1. Context & scope
- PR description is clear: what, why, link to issue/ticket
- Scope is focused on one purpose; no unrelated changes mixed in
- Diff matches the description; no stray changes
- PR is small enough to review effectively

### 2. Correctness — top priority
- Logic actually solves the stated problem
- Edge cases handled: null/empty, boundary values, malformed input, race conditions
- Error handling is complete; no silently swallowed errors
- No regressions / backward compatibility preserved

### 3. Tests
- New code / bug fixes have tests
- Tests cover important branches and edge cases
- Tests assert behavior, not just run for coverage
- CI / pipeline is green

### 4. Security
- User input is validated
- No hardcoded secrets / API keys / passwords
- Guards against SQL injection, XSS, SSRF, path traversal
- Authentication / authorization enforced in the right places
- Sensitive data is not logged

### 5. Performance
- No N+1 queries, nested loops, or poor algorithms
- Database indexes present; pagination for large lists
- No memory leaks; resources (files, connections) are released

### 6. Quality & maintainability
- Clear naming; readable code
- No duplication (DRY); no dead code
- Follows the codebase conventions
- No leftover `console.log` / `print` / debug code / stray comments
- Magic numbers extracted into named constants

### 7. Architecture & design
- Code lives in the correct layer / module; concerns are separated
- No unnecessary tight coupling
- Right level of abstraction; not over-engineered

### 8. Docs & operations
- Docs / README / comments updated where needed
- DB migrations are safe (rollback available, no long table locks)
- Breaking changes are documented
- New environment variables / config are noted
- Feature flag used when a gradual rollout is needed

## Feedback conventions

Tag every comment:
- 🔴 **Blocker** — must be fixed before merge
- 🟡 **Nit** — minor suggestion, author decides
- 💬 **Question** — needs clarification

Principles:
- Comments are constructive and include a suggested fix.
- All GitHub comments are written in English.
- Ask yourself: "If this breaks in production at 2am, would I understand it?"

## Summary output template

```
## Review Summary
- 🔴 Blockers: <n>
- 🟡 Nits: <n>
- Verdict: Approve / Request changes

### Findings
1. 🔴 [file:line] <description> → <suggested fix>
2. 🟡 [file:line] <description>
```
