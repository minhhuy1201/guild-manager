# AGENTS.md

## Super-power Workflow (for plugin superpower)

### Planning

- Prefer direct implementation for simple tasks.
- Keep plans concise.
- Skip specification review unless explicitly requested.
- Skip brainstorming for straightforward changes.

### Execution

- Prefer Executing-Plans over Subagent-Driven-Development.
- Do not spawn subagents unless the task is large or explicitly requested.
- Avoid multiple review agents.

### Reviews

- Do not perform redundant self-reviews.
- Perform one final review before finishing.
- Assume the user will review all generated code.

---

## Architecture

Stack, layering, module and feature boundaries, the data model, the time rules, and **where new
behavior goes** are all in [`docs/architecture.md`](docs/architecture.md). Read it before writing
code in either app; the rules there are binding, not suggestions.

Two things it does not repeat:

- All user-facing text **must be Vietnamese** (commit messages and file names stay English).
- Avoid `forwardRef()` in NestJS — refactor the dependency instead.

Setup and commands: [`docs/development.md`](docs/development.md).
Deploy and operations: [`docs/production.md`](docs/production.md).

---

## Conventions

- Minimize token usage: skip unnecessary analysis and long explanations, and focus on completing the
  requested task efficiently.
- Keep code simple and maintainable — don't over-engineer.
- Keep files and abstractions minimal; don't add folders, stores, or abstractions that aren't needed.
- Follow the existing project structure.
- Reuse existing types/schemas from `packages/shared` instead of duplicating them.
- Ask before making large architectural changes.
- **Validate at boundaries, trust TypeScript inside.** Zod validation belongs where untrusted data
  enters — HTTP request bodies, env vars, JSON from the database, third-party responses. Don't add
  runtime checks or fallbacks for values the type signature already guarantees within the process.
- **Misconfiguration fails loud**, at startup when the value is knowable then (env schema),
  otherwise at the earliest point it can be resolved. Never silently skip a missing referent.
- **Switch on discriminant tags.** A switch over a closed union ends in an exhaustiveness check
  (`assertNever`) so a new variant becomes a compile error.
- **Defaults are explicit.** Resolve them in one obvious place instead of scattering `?? default`
  deep inside the logic that consumes the value.
- **An empty `catch` names what it swallows** and why nothing else can reach it; keep the `try` to
  the one statement that can throw.
- **Don't comment on facts obvious from the code.** Comments explain why, not what.
- **Prefer symmetry for parallel values.** Unexplained asymmetry between things that should look
  alike usually means an extraction was missed.
- **Tests describe behavior, not correctness.** When behavior changes on purpose, change its tests
  in the same commit and say why.
- **Prefer a maintained dependency over hand-rolling** when it genuinely removes code we would
  otherwise own and test.
