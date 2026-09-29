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
   tests before reading the code so you understand the intent. For a self-review
   before the PR exists, diff the branch against its base: `git diff origin/main...HEAD` (PRs target `main`).
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

6. **Emit the PR self-review block.** Right after step 5, print the block below with
   the same SHA (`git rev-parse HEAD`, full 40 characters) and the real counts, and
   tell the user to paste it under the `## Self-review` heading of the PR description.
   The HTML comment is machine-read by the `PR Self-review` workflow
   (`.github/workflows/pr-self-review.yml`), which fails the PR when the block is
   missing or the SHA no longer matches the PR head. After any new push, re-run the
   review and replace the block. When opening the PR, fill every section of
   `.github/pull_request_template.md` - `gh pr create --body` replaces the template
   rather than applying it.

   ```
   <!-- pr-review: sha=<full HEAD sha> -->
   - 🔴 Blockers: <n> (fixed: <n>)
   - 🟡 Nits: <n>
   - Checklist: [x] Context [x] Correctness [x] Tests [x] Security [x] Performance [x] Quality [x] Architecture [x] Docs

   ### Findings
   1. 🔴 [file:line] <description> → <how it was fixed>
   2. 🟡 [file:line] <description>
   ```

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
