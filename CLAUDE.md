# Guild Manager

pnpm workspace monorepo, no root `package.json`: `apps/api` (NestJS) + `apps/web` (Next.js) +
`packages/shared` (the Zod schemas and enums both sides share). Every command runs as
`pnpm --filter <api|web|@guild/shared> …`.

## Workflow (superpowers plugin)

- **Implement simple tasks directly.** Brainstorming, spec review and written plans are for large or
  explicitly requested work; when a plan is warranted, keep it short.
- **Execute plans inline.** Spawn subagents only for a large task or on request.
- **One review at the end**, by one agent. The user reviews all generated code.

## Read before writing code

- [`docs/architecture.md`](docs/architecture.md) — **binding**, not advisory. Layering, module and
  feature boundaries, the endpoint table, the data model, the week/deadline rules, and §7 **where new
  behavior goes**. Read it before adding an endpoint, a page, a feature, a database column, or an env
  variable.
- [`docs/development.md`](docs/development.md) — local setup, the env variable tables, commands, the
  local database, seeding.
- [`docs/production.md`](docs/production.md) — deploy, Supabase, the Vercel build, operations.
- Per-app rules: [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md),
  [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md).

Two rules architecture.md does not repeat:

- Comment and code, file name will be English, but the content in docs/superpowers, docs/custom-plan and docs/custom-spec will be Vietnamese
- **No `forwardRef()` in NestJS.** A cycle means the logic belongs in a third module.

## Secrets and `.env`

**Never commit credentials.** `.gitignore` catches `.env.*` (except `.env.example`); real values live
only in local env files and in the hosting provider's environment. A leaked secret gets rotated
before anything else happens.

- `AUTH_SECRET` (≥32 chars) **must be identical in `apps/api` and `apps/web`** — the API signs the
  JWT, the web app verifies it, and a mismatch logs everyone out.
- **`apps/api/.env` is always local; never point it at Supabase** — `pnpm dev`, `prisma:migrate` and
  `db:seed` all read it by default. Production values live in `apps/api/.env.production`, selected
  per command with `PRISMA_ENV_FILE`; [`docs/production.md`](docs/production.md) owns that policy.
- A new API variable means **both** `src/config/env.validation.ts` and `.env.example`, then the tables
  in development.md §3 and production.md §3.
- `seed-data.json` is real guild data and git-ignored; `seed-data-example.json` is the committed
  sample.

## Conventions

- **`packages/shared` owns every shape that crosses the network** — one Zod schema, wrapped as a DTO
  on the API and used to type fetch functions on the web. Never re-declare a shape, an enum or a
  validation rule per app. Both apps import it by real package name and run off its `dist`, so after
  editing it run `pnpm --filter @guild/shared build` before either picks the change up at runtime;
  types update immediately. Each app's `test` script rebuilds it first.
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
- **Prefer a maintained dependency** when it genuinely removes code we would otherwise own and test.
- Ask before a large architectural change. Keep explanations short — do the task, skip the commentary.
