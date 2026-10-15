# Guild Manager

pnpm workspace monorepo: `apps/api` (NestJS) + `apps/web` (Next.js) + `packages/shared` (the Zod
schemas and enums both sides share). Every command runs as `pnpm --filter <api|web|@guild/shared> …`.

The root `package.json` is a **marker, not a package**: `private`, no dependencies, no scripts. It
exists so Dependabot's npm updater has a manifest to anchor `pnpm-lock.yaml` to — without it every
security update failed with `/package.json not found`. Nothing is installed or run from the root, and
nothing new belongs there: a dependency goes in the app or package that uses it.

## Workflow (superpowers plugin)

- **Implement simple tasks directly.** Brainstorming, spec review and written plans are for large or
  explicitly requested work; when a plan is warranted, keep it short.
- **Execute plans inline.** Spawn subagents only for a large task, on request, or for the final
  review below.
- **Final review by a separate agent**, never the session that wrote the code - run `pr-review`
  there. The user reviews all generated code.

## Read before writing code

| When you… | Read |
|---|---|
| add an endpoint, page, feature, column or env variable | [`docs/architecture.md`](docs/architecture.md) §7 (**binding**) |
| touch the data model | `docs/architecture.md` §5 |
| touch week or deadline logic | `docs/architecture.md` §6 |
| set up, seed, or edit the env tables | [`docs/development.md`](docs/development.md) |
| deploy, or touch Supabase or the Vercel build | [`docs/production.md`](docs/production.md) |
| touch CI triage | [`docs/ci-triage.md`](docs/ci-triage.md) |

Convention by area lives in [`.claude/rules/`](.claude/rules/) and loads when you open a matching
file: `web/` (`data-flow`, `routing`, `components`, `display`, `interaction`, `tests`) for
`apps/web`; `api/` (`module`, `discord`, `config`) for `apps/api`; `shared.md` for `packages/shared`;
`prisma.md` for `apps/api/prisma`. Per-app stack and naming: [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md),
[`apps/web/CLAUDE.md`](apps/web/CLAUDE.md).

`docs/archive/` holds finished plans and specs. It is history, not a source of truth: when it
disagrees with the code or a living doc, the code and the living doc win.

## Secrets and `.env`

**Never commit credentials.** `.gitignore` catches `.env.*` (except `.env.example`); real values live
only in local env files and in the hosting provider's environment. A leaked secret gets rotated
before anything else happens.

- `AUTH_SECRET` (≥32 chars) **must be identical in `apps/api` and `apps/web`** — the API signs the
  JWT, the web app verifies it, and a mismatch logs everyone out.
- **`apps/api/.env` is always local; never point it at Supabase** — `pnpm dev`, `prisma:migrate` and
  `db:seed` all read it by default. Production values live in `apps/api/.env.production`, selected
  per command with `PRISMA_ENV_FILE`; [`docs/production.md`](docs/production.md) owns that policy.
- A new API variable touches several files; see [`.claude/rules/api/config.md`](.claude/rules/api/config.md).
- `seed-data.json` is real guild data and git-ignored; `seed-data-example.json` is the committed
  sample.

## Shipping

- **`main` is protected by a repository ruleset**, not the older branch protection UI. No direct
  push, no force-push, no deletion; every change is a PR that **nine** CI checks must pass, on a
  branch that is up to date with `main`. Commits must be signed and history stays linear, so
  `squash` and `rebase` are the only merge methods offered. The branch is deleted on merge.
  [`docs/production.md`](docs/production.md) §6 owns the full list and the reasoning.
- **A merged PR touching `apps/api` migrates the production database, then deploys** — that order is
  the point, so new code never meets the old schema. Migrations are created locally with
  `prisma:migrate` and committed; CI applies them. Never run `migrate deploy` against production by
  hand.
- Migration rules (destructive changes, enum sync): [`.claude/rules/prisma.md`](.claude/rules/prisma.md).
- The PR body follows [`.github/pull_request_template.md`](.github/pull_request_template.md).

## Conventions

- **`packages/shared` owns every shape that crosses the network** — one Zod schema, wrapped as a DTO
  on the API and used to type fetch functions on the web. Never re-declare a shape, an enum or a
  validation rule per app. Build and watch rules: [`.claude/rules/shared.md`](.claude/rules/shared.md).
- **Validate at boundaries, trust TypeScript inside.** Zod belongs where untrusted data enters — HTTP
  bodies, env variables, JSON out of the database, third-party responses. Inside the process the type
  signature is the guarantee: no defensive re-checks, no `?? fallback` for a value that cannot be
  missing.
- **Misconfiguration fails loud** — at startup when the value is knowable then (the env schema),
  otherwise at the earliest point it can be resolved. Never silently skip a missing referent.
- **Switch on discriminant tags**, ending in `assertNever` so a new variant becomes a compile error.
- **Defaults are explicit**: resolved in one obvious place, not scattered as `?? default` deep inside
  the code that consumes the value.
- **An empty `catch` names what it swallows** and why nothing else can reach it; keep the `try` around
  the one statement that can throw.
- **Comments explain why.** The code already says what.
- **Prefer symmetry for parallel values** — unexplained asymmetry between things that should look
  alike usually means a missed extraction.
- **Tests describe behavior.** When behavior changes on purpose, its tests change in the same commit
  and the message says why.
- **Comment, code and file names are English**; the content of `docs/superpowers`,
  `docs/custom-plan`, `docs/custom-spec` and `docs/archive` is Vietnamese.
- **Never mutate:** return a new object. Nest at most 4 levels, using early returns. Name a
  threshold or limit instead of a magic number.
- **Prefer a maintained dependency** when it genuinely removes code we would otherwise own and test.
- Ask before a large architectural change. Keep explanations short, and end a task with a summary
  of what changed.
