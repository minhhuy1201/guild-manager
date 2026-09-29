## What & Why

<!-- The problem this solves, and why now. Link the spec or plan if there is one:
     docs/custom-spec/<date>-<name>-design.md, docs/custom-plan/<date>-<name>.md -->

## Tests

<!-- What you ran and what it said. Name the commands, not "tests pass":
     pnpm --filter <api|web> test / typecheck / lint
     Add the manual checks a reviewer cannot reproduce from CI (a role, a screen, a deploy). -->

## Note

<!-- Anything the reviewer should know before merging, or delete this section:
     breaking changes and the deploy order they force, a migration that must run first,
     follow-up work deliberately left out, a decision that went against the plan. -->

## Self-review

<!-- REQUIRED. Run the pr-review skill on your branch (say "review my changes") and
     paste its "Self-review" block here, replacing this comment. The block carries a
     hidden "pr-review: sha=..." marker for the commit you reviewed. The "Self-review"
     check fails and blocks merge when the block is missing or the sha no longer
     matches the PR head, so re-run the review after every push. -->

- [ ] Tests added/updated for the new behaviour
- [ ] No secrets, `.env`, or debug output in the diff

---

<!-- Write the whole PR in English, including the title, in Conventional Commit form:
     <type>(<scope>): <description> — lowercase, imperative, no trailing period. -->
