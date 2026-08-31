## What & Why

<!-- The problem this solves, and why now. Link the spec or plan if there is one:
     docs/custom-spec/<date>-<name>-design.md, docs/custom-plan/<date>-<name>.md -->

## What changes

<!-- The change itself, per area (packages/shared, apps/api, apps/web, docs). Call out anything
     that crosses the network contract, touches the database schema, or changes an env variable —
     those are the parts a reviewer cannot infer from the diff. -->

## Tests

<!-- What you ran and what it said. Name the commands, not "tests pass":
     pnpm --filter <api|web> test / typecheck / lint
     Add the manual checks a reviewer cannot reproduce from CI (a role, a screen, a deploy). -->

## Note

<!-- Anything the reviewer should know before merging, or delete this section:
     breaking changes and the deploy order they force, a migration that must run first,
     follow-up work deliberately left out, a decision that went against the plan. -->

## Self-review

<!--
Run `/pr-review` in Claude Code after your last commit, then paste its Review Summary
below. The verdict must be Approve with 0 unresolved 🔴 Blockers before you request review.
Answer any 💬 Question the skill raised, and note any 🟡 Nit you consciously skipped.
-->

- [ ] `/pr-review` passed on the commit being pushed
- [ ] Tests added/updated for the new behaviour
- [ ] No secrets, `.env`, or debug output in the diff

---

<!-- Write the whole PR in English, including the title, in Conventional Commit form:
     <type>(<scope>): <description> — lowercase, imperative, no trailing period. -->
