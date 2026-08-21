# Architecture

How Guild Manager is put together: the pieces, the rules that keep them apart, and — most
importantly — **where new behavior goes**.

This is the structural reference. It does not cover setup or operations:

- [`development.md`](development.md) — running locally, env vars, commands, troubleshooting
- [`production.md`](production.md) — build, deploy, the real database, operations
- `superpowers/specs/` — the design spec behind each feature (why a thing is shaped that way)

## 1. The system

A guild plays a few matches a week. Members mark themselves "Có/Không" for each match before its
deadline; admins set the schedule, manage members, and build the roster for each match.

```
browser ──► apps/web (Next.js)  ──HTTP──►  apps/api (NestJS)  ──►  PostgreSQL
                  │                              │
           verifies the JWT                 signs the JWT
           (AUTH_SECRET)                    (AUTH_SECRET)
```

Three properties everything else follows from:

- **The web app never touches the database.** It only calls the API through `NEXT_PUBLIC_API_URL`.
  Connection strings are a server-side secret; there are no `NEXT_PUBLIC_SUPABASE_*` variables.
- **Both apps share one `AUTH_SECRET`.** The API signs JWTs, the web app verifies them. If the
  values differ you can log in but every admin route bounces you back to the home page.
- **The API holds a pg pool and reuses it across requests.** That is why production uses a session
  pooler, not a transaction pooler — see [`production.md`](production.md) §5. In production it runs
  as a Vercel Function rather than a long-running process, and the constraint still holds because
  Fluid compute keeps the instance, and the pool, alive between invocations.

## 2. Repository layout

pnpm workspace monorepo, no root `package.json`. Every command runs as `pnpm --filter <app> …`
(filters: `api`, `web`, `@guild/shared`).

```
guild-manager/
├── apps/
│   ├── api/        # NestJS 11 + Prisma 7 + PostgreSQL → http://localhost:3001/api
│   └── web/        # Next.js 16 App Router + Tailwind 4 + shadcn/ui → http://localhost:3000
├── packages/
│   └── shared/     # Enums + Zod schemas shared by both apps (@guild/shared)
└── docs/           # This file, development, production, specs and plans
```

### `packages/shared` — the contract

Typed from **TypeScript source** but executed from compiled JavaScript: the `exports` map points
`types` at the `.ts` files and the runtime condition at `dist/*.js`. The `prepare` script runs `tsc`,
so `pnpm install` produces `dist` and there is no build step to remember — but after editing the
package you do need to rebuild it (`pnpm --filter @guild/shared build`) before **either app** picks
the change up at runtime; types update immediately. Runtime cannot point at `.ts`, because Vercel deletes
the sources after compiling — see [`production.md`](production.md) §4.

| Import | Contents |
|---|---|
| `@guild/shared/enums` | `GuildClass`, `AttendanceStatus` |
| `@guild/shared/schemas` | Zod schemas for attendance, auth, battle sessions, characters, formations |
| `@guild/shared/lib` | The Vietnam clock (`vnWeekday`, `vnParts`, `shiftVnDate`, `atVnTime`) and the deadline-cap rules both sides share |

The package is intentionally **not** `"type": "module"`: `apps/api` is CommonJS under `nodenext`,
which would force `.js` suffixes on relative imports, and Turbopack in `apps/web` cannot resolve
those.

The Zod schemas are the single definition of every request/response shape. The backend turns them
into DTOs (`createZodDto`), the frontend types its API functions from them. **A payload shape that
crosses the network belongs here, never duplicated on one side.**

Prisma's `GuildClass` / `AttendanceStatus` enums must keep the same values as the shared enums.
`prisma/seed.ts` imports the shared enums directly, so drift is a compile error rather than a
runtime bug.

## 3. Backend (`apps/api`)

### 3.1 Stack

NestJS 11 on Express · Prisma 7 + PostgreSQL through the `@prisma/adapter-pg` driver adapter ·
Zod + `nestjs-zod` for env and DTO validation · `@nestjs/jwt` (access token 1 day, refresh token
1 week) · Swagger at `/docs`, disabled when `NODE_ENV=production`.

### 3.2 Layers

```
src/
├── common/           # cross-cutting only, no business logic
│   ├── constants/    # REQUEST_ID_HEADER…
│   ├── decorators/   # current-user.decorator.ts
│   ├── filters/      # all-exceptions.filter.ts — one error shape for everything
│   ├── guards/       # jwt-auth.guard.ts, optional-jwt-auth.guard.ts
│   └── interceptors/ # logging (request id) + transform ({ data })
├── config/           # env.validation.ts (Zod, fail-fast at boot), app.config.ts
├── infrastructure/
│   └── prisma/       # PrismaService (@Global PrismaModule) + isHealthy()
├── modules/          # the business domain, one mini-app per folder
├── app.module.ts
└── main.ts           # global pipe/filter/interceptor, CORS, Swagger, shutdown hooks
```

Allowed direction of imports:

```
modules/  ──►  infrastructure/  ──►  config/
    │                 │
    └─────────────────┴──►  common/
```

- `common/` and `config/` never import from `modules/` or `infrastructure/` — enforced by ESLint.
- A module exposes its code through one `<domain>.public.ts` file; another module imports that, or
  the `*.module` file for DI registration, never anything else inside — enforced by ESLint.
- Request flow is **Controller → Service → (Repository) → Prisma**. Controllers never touch Prisma.
- Services hold the business logic. DTOs only validate input. Never return a Prisma model from a
  controller — map it to the response shape from `@guild/shared/schemas`.
- Don't create `guards/`, `decorators/` or a repository speculatively. Add them when a second caller
  actually appears.

`apps/api` has **no path aliases at all**: internal imports are relative (`../../config`). The `@/…`
alias it used to have was removed on 2026-08-16 because Vercel does not rewrite `tsconfig` `paths`
and the alias survived into the emitted JavaScript — see [`production.md`](production.md) §4. Do not
reintroduce it. Shared code is imported by real package name (`@guild/shared/*`).

That removal has a maintenance cost worth knowing about: the two ESLint rules above now match
**relative** import strings, so each is locked to one directory depth. Adding a directory level under
`src/` requires adding a matching block in `eslint.config.mjs`, or imports at that depth go
unchecked — see [`apps/api/docs/backend.md`](../apps/api/docs/backend.md) §4.

### 3.3 Modules

Each is `<domain>.module.ts` + `<domain>.controller.ts` + `<domain>.service.ts`, with `dto/` and
`__tests__/` beside it. Response shapes are not declared here — they come from
`@guild/shared/schemas`, and the object a service builds ends in `satisfies <Shape>`.

| Module | Owns | Access |
|---|---|---|
| `health` | Liveness + a database ping | Public |
| `auth` | Admin login, refresh, `me` | Public except `me` |
| `characters` | Member CRUD | Admin (`JwtAuthGuard` on the controller) |
| `battle-sessions` | The week's schedule, deadlines, the Guild War session, time rules | Read public, writes admin |
| `attendance` | Marking attendance and reading records | Public, admin bypasses the deadline |
| `team-builder` | Per-match formations | Admin |

Endpoints, all behind the `/api` prefix:

| Method | Path | Purpose | Access |
|---|---|---|---|
| `GET` | `/health` | API + database status | Public |
| `POST` | `/auth/login` | Admin login | Public |
| `POST` | `/auth/refresh` | Exchange a refresh token for a new pair | Public |
| `GET` | `/auth/me` | Account behind the current access token | Bearer |
| `GET` | `/characters` | Member list | Bearer |
| `POST` | `/characters` | Create a member | Bearer |
| `PATCH` | `/characters/:id` | Update a member | Bearer |
| `DELETE` | `/characters/:id` | Delete a member | Bearer |
| `GET` | `/battle-sessions/weeks` | Weeks an admin may edit | Bearer |
| `GET` | `/battle-sessions` | Matches of a week with their deadlines | Public |
| `POST` | `/battle-sessions` | Add a scrim | Bearer |
| `PATCH` | `/battle-sessions/:id` | Edit a match | Bearer |
| `DELETE` | `/battle-sessions/:id` | Delete a scrim (Guild War cannot be deleted) | Bearer |
| `GET` | `/attendance/characters` | Characters for the attendance board | Public |
| `GET` | `/attendance/records` | Attendance entries of the open week | Public |
| `POST` | `/attendance` | Mark one character for one match | Public (Bearer bypasses the deadline) |
| `GET` | `/team-builder/weeks` | Weeks that still have roster data | Bearer |
| `GET` | `/team-builder/formations?weekStart=` | Match rosters of a week | Bearer |
| `PUT` | `/team-builder/formations/:sessionId` | Overwrite one match's roster | Bearer |

### 3.4 Cross-cutting contracts

- **Response shape.** Success is `{ data }` (transform interceptor); errors are
  `{ statusCode, message, errors?, path, requestId, timestamp }` (exception filter). `message` is
  already Vietnamese and is meant to be shown to the user verbatim.
- **Request id.** Every response carries an `x-request-id` header and the logging interceptor writes
  the same id into the log line, so a user-reported error maps to one request.
- **Env.** Validated by a Zod schema at boot; anything missing or malformed kills the process with a
  Vietnamese message instead of failing halfway through. `DIRECT_DATABASE_URL` is deliberately absent
  from the schema — only the Prisma CLI may read it, never the runtime.
- **Auth.** `JwtAuthGuard` for admin-only routes, `OptionalJwtAuthGuard` where a token merely grants
  extra rights (marking attendance past the deadline). Passwords are never stored in plaintext.

### 3.5 Build notes

- **Webpack, not `tsc`** (`nest-cli.json` → `builder: "webpack"`), so `packages/shared` is bundled in
  and the output stays a single `dist/main.js`. The default `tsc` builder emits
  `dist/apps/api/src/main.js` because of files outside `rootDir`. Note that this build is **not** what
  production runs: Vercel compiles `src/main.ts` with its own `tsc` and ignores `dist/main.js` — see
  [`production.md`](production.md) §4.
- **Prisma Client is generated as CJS** (`moduleFormat = "cjs"`, `importFileExtension = ""`): the app
  runs CommonJS, ESM output breaks jest/ts-node via `import.meta`, and `.js`-suffixed imports break
  ts-node when it runs `prisma/seed.ts`.
- `src/generated/prisma` is generated (`postinstall` → `prisma generate`) and never committed.

## 4. Frontend (`apps/web`)

### 4.1 Stack

Next.js 16 App Router (React 19) · Tailwind CSS 4 + shadcn/ui on `@base-ui/react` · TanStack Query
for server state · Zustand for UI state · dnd-kit on the team builder · Vitest.

All user-facing copy is **Vietnamese**.

### 4.2 Layers

```
apps/web/
├── app/              # routing and layout ONLY — one thin page per route
├── proxy.ts          # session refresh + admin route guard, runs before every page request
├── features/         # all the logic, one folder per feature
│   └── <feature>/
│       ├── api/      # request functions (through apiFetch) + query key factory
│       ├── hooks/    # TanStack Query hooks
│       ├── store/    # Zustand, UI state only
│       ├── lib/      # pure feature logic (labels, derivations)
│       ├── types/    # feature-internal types
│       ├── components/
│       └── index.ts  # the feature's ONLY public surface
├── components/
│   ├── ui/           # generated by the shadcn CLI — never hand-edited
│   ├── shared/       # cross-feature wrappers and the app shell
│   └── providers.tsx # QueryClientProvider
├── hooks/            # cross-feature hooks (use-table-pagination)
├── config/           # routes.ts (ROUTES), api.ts (API_BASE_URL)
└── lib/              # api-client.ts (apiFetch + ApiError), format.ts, guild-class.ts, utils.ts
```

Features: `attendance`, `auth`, `members`, `settings`, `team-builder`.

Rules, in the order they get broken:

- `app/` is routing and composition only. Logic lives in `features/<feature>/`.
- Server data → **TanStack Query** in `features/<feature>/hooks`. **Never** put an API response in
  Zustand. UI state (filters, dialogs, drag state) → **Zustand** in `features/<feature>/store`.
- **`lib/api-client.ts` is the only place that calls `fetch` against the backend.** Feature request
  functions wrap `apiFetch` in `features/<feature>/api/`; components never fetch and never call
  `useQuery` directly — they call the feature's hook.
- Errors arrive as `ApiError` with the backend's Vietnamese `message`; render it as-is.
- Never import another feature's internal file — go through its `index.ts`.
- `components/ui/` is generated output. Need a variant? Wrap it in `components/shared/`. Everything
  there comes from the shadcn CLI in its Base UI flavour (`style: "base-nova"`); no Radix, no
  hand-written primitives.
- Prefer Server Components; `"use client"` only where interactivity requires it.
- Import with `@/`; shared code by real package name (`@guild/shared/*`), never a path into the
  package. Route paths come from `config/routes.ts`, never string literals.

Display conventions (icons vs. badges, action buttons, tables) live in
[`../apps/web/docs/frontend.md`](../apps/web/docs/frontend.md) §6, along with the reasoning behind
this layout.

### 4.3 The session

The API signs an access token (1 day) and a refresh token (1 week). The web app keeps both in
**httpOnly cookies**; nothing about the session is readable by client JavaScript.

`proxy.ts` runs before every page request and does two things: it renews the pair when the access
token has expired but the refresh token has not (the proxy is the only place in Next.js that can
write cookies for any request), and it redirects anonymous visitors away from admin routes
(`/xep-team`, `/thiet-lap`).

Hiding nav links is cosmetic. Real enforcement is the proxy plus a `getSession()` check inside each
admin page's server component — and, ultimately, the guards on the API.

## 5. Data model

Defined in `apps/api/prisma/schema.prisma`; that file is the source of truth and carries the
reasoning in comments.

```
Character ──< AttendanceRecord >── BattleSession ──< FormationMatch ──< FormationSlot >── Character
```

| Model | Notes |
|---|---|
| `Character` | Member. Id is a slug of the name plus a random suffix (`meo-beo-k7ma3x`), not a game id. |
| `BattleSession` | One match in a week. `weekStart` (Monday 00:00 VN) groups matches into weeks. Guild War uses the deterministic id `gw-<YYYY-MM-DD>` so it can be upserted idempotently; scrims get a `cuid()`. `deadline` is the admin's value for a scrim, capped at 10:00 on the match day; for Guild War it is system-owned (17:00 Thursday). |
| `AttendanceRecord` | One `(character, session)` pair, unique. `markedAt` updates whenever the answer flips. |
| `FormationSlot` | One cell of the roster grid: a person, a note, or both. A cell that is empty *and* unannotated has no row — that is how "slot 2 is empty" differs from "there is no slot 2". |

The label of a match ("Thứ 3 · 20:30") is **derived from `dateTime`**, never stored, so changing the
time changes the label everywhere.

## 6. Time and schedule rules

All instants are computed in **fixed UTC+7**, never the server's local time. The primitives — reading
a weekday or calendar parts in Vietnam time — live in `packages/shared/lib/vn-time.ts` and number
weekdays **ISO-style (1 = Monday … 7 = Sunday)**; the offset itself is not exported, because anyone who
needs it really needs one of those four functions. The week and deadline rules sit on top of them in
`apps/api/src/modules/battle-sessions/session-schedule.ts` and are the backend's business — the
frontend only mirrors `isDeadlinePassed` to grey out a column.

- An attendance week runs **Monday 00:00 → Saturday 23:59**.
- The next week opens at **22:00 Saturday** (`getActiveWeek`). Between the close of one week and that
  moment, the finished week is still shown, read-only.
- Guild War is fixed at **20:00 Saturday**, generated by the system, and cannot be deleted.
- Every other match is a scrim entered by an admin, who also sets its deadline — but **no later than
  10:00 VN on the match day**, and never after the match itself (`deadlineCapFor`). Admins can edit
  the open week and the next one (`getEditableWeeks`); past weeks are read-only.
- **Guild War's deadline is system-owned**: 17:00 Thursday of its week (`guildWarDeadline`). Sending
  `deadline` for a Guild War match is a 400, and `ensureGuildWar` rewrites the value on every read so
  a stale row corrects itself.
- Past a match's deadline the column locks. Until then answers may flip freely. A request with a
  valid admin token bypasses the deadline.

Until 2026-08 the deadlines were fixed in code (10:00 on the match day, everything closing at 17:00
Thursday). They are now entered by an admin at `/thiet-lap`. The cap is enforced by **rejecting the
request with a Vietnamese message**, never by silently clamping the value the admin just typed — the
one exception is `prisma/fix-deadlines.ts`, a one-off migration of rows written under the old rules.

## 7. Where new behavior goes

| What you're adding | Where it goes |
|---|---|
| **A new API endpoint on an existing domain** | Controller method → service method in that module. Payload shapes as Zod schemas in `packages/shared/schemas`, wrapped as DTOs with `createZodDto`. |
| **A new backend domain** | `src/modules/<domain>/` with `<domain>.module.ts`, `.controller.ts`, `.service.ts`, plus `dto/`. Register it in `app.module.ts`. Its request **and** response shapes go in `packages/shared/schemas/`. Add a `<domain>.repository.ts` only once the queries are complex or repeated; simple CRUD calls `PrismaService` from the service. |
| **A database column or table** | `prisma/schema.prisma` → `pnpm --filter api prisma:migrate` → commit the migration folder. Enums must stay in step with `packages/shared/enums`. Then check the Data API grants ([`production.md`](production.md) §5). |
| **A request/response shape, an enum, a validation rule** | `packages/shared` — never re-declared per app. |
| **A new page** | A thin `app/<route>/page.tsx` that renders one feature component, the path added to `config/routes.ts`. Admin-only? Add the prefix to `ADMIN_PATH_PREFIXES` in `proxy.ts` **and** re-check `getSession()` in the page. |
| **Frontend behavior for an existing feature** | Inside that `features/<feature>/`: request function in `api/`, hook in `hooks/`, UI state in `store/`, pure logic in `lib/`. Export it from `index.ts` only if another feature needs it. |
| **A new frontend feature** | A new `features/<feature>/` with the same folders and an `index.ts`. Do not reach into another feature's files. |
| **A component used by two or more features** | `components/shared/`. If it is a stock shadcn component, generate it into `components/ui/` with the CLI and wrap it. |
| **A cross-cutting backend concern** (logging, error shape, a header) | `src/common/` — interceptor, filter, guard or decorator. Never business logic. |
| **A new environment variable** | `env.validation.ts` (+ `.env.example`) on the API; `config/api.ts` on the web side. Then the tables in [`development.md`](development.md) §3 and [`production.md`](production.md) §3. |
| **A change to the week or deadline rules** | `session-schedule.ts` and its `__tests__` — nowhere else. The frontend must not re-derive a rule the backend owns. |
| **A display convention** (state icon, action button, table shell) | Follow, and extend, [`frontend.md`](../apps/web/docs/frontend.md) §6 with a wrapper in `components/shared/`. |
| **Anything with a non-obvious "why"** | A spec in `docs/superpowers/specs/`, then link it from the code comment. |

Tests sit next to what they cover: `__tests__/` beside the module or feature folder (Jest on the
API, Vitest on the web). There are no end-to-end tests; the `apps/api/test/` harness was removed on
2026-08-16 as unused.

## 8. What is deliberately absent

Recorded so nobody assumes otherwise: no preview deployments (both projects build on `main` only),
no staging environment, no verified backups, no monitoring or alerting, no application-level rate
limiting, and no automatic rollback. Migrations are still run by hand — the pipeline ships code,
never schema. Details and consequences are in [`production.md`](production.md) §6.

CI does exist: `.github/workflows/ci.yml` runs the test suite, lint, Prettier, typecheck and build on
every push and pull request against `main`, then deploys when `main` is green. The jobs are filtered
by changed path, so a commit touching only one app runs and deploys only that half, and a docs-only
commit runs nothing — see [`production.md`](production.md) §4.
