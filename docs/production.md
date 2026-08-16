# Production

How to build, ship and operate Guild Manager in the real environment.

> **Current status (2026-08-16):** everything is live. The database runs on Supabase (region
> `ap-northeast-1`, free tier); both apps run on Vercel in **production**:
>
> - `apps/api` → `https://guild-manager-api.vercel.app`
> - `apps/web` → `https://guild-manager-web.vercel.app`
>
> `guild-manager-api` is connected to the GitHub repo, so pushing to `main` deploys it.
> `guild-manager-web` is not connected yet and still needs a manual `vercel deploy`. See section 4.

## 1. Deployment architecture

The diagram and the three constraints that govern everything (the web app never touches the
database, both apps share `AUTH_SECRET`, the API holds a pg pool it reuses across requests) live in
[`architecture.md`](architecture.md), section 1. The third constraint is why the session pooler is
chosen in section 5 — and it survives the move to Vercel Functions, because Vercel's Fluid compute
keeps the instance (and therefore the pool) alive between invocations.

## 2. Build

```bash
pnpm install --frozen-lockfile

pnpm --filter api build     # webpack → apps/api/dist/main.js
pnpm --filter web build     # → apps/web/.next
```

Run the build:

```bash
pnpm --filter api start:prod   # node dist/main
pnpm --filter web start        # next start
```

Things to watch for when building on CI/hosting:

- The `postinstall` of `apps/api` runs `prisma generate`, which needs `DATABASE_URL` to **exist and
  be a well-formed URL** (it does not need to be reachable).
- This is a pnpm workspace: the host must install from the repo root, not inside `apps/*`.
- `packages/shared` **is compiled to JavaScript** (`packages/shared/dist`). Its `prepare` script runs
  `tsc`, so `pnpm install` alone produces the output — no separate build step to remember. The
  `exports` map points `types` at the `.ts` sources and everything else at `dist/*.js`; the runtime
  side cannot point at `.ts`, see section 4.
- Building `apps/web` requires `NEXT_PUBLIC_API_URL`, because `NEXT_PUBLIC_*` variables are inlined
  into the bundle at build time and are not read again at runtime.

## 3. Production environment variables

The real values live in `apps/api/.env.production`, a file that is **not committed** (`.gitignore`
catches `.env.*`). It is not the file the runtime reads; it holds the values needed to run Prisma
commands against the real database from a local machine, and serves as the copy you paste into the
hosting provider's environment variables when deploying.

`apps/api/.env` is always **local** (the Postgres container, see [`development.md`](development.md)).
Do not point it at Supabase: `pnpm dev`, `pnpm prisma:migrate` and `pnpm db:seed` all read that file
by default, and each writes to whatever database it names.

### `apps/api`

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` — disables Swagger |
| `PORT` | Whatever the provider requires (usually a `PORT` they inject) |
| `DATABASE_URL` | Supabase session pooler, port `5432` |
| `DIRECT_DATABASE_URL` | Same value, **plus `?connect_timeout=30`** — read by the Prisma CLI only |
| `AUTH_SECRET` | `openssl rand -hex 32`, completely different from the dev key, identical to the web one |
| `ADMIN_USERNAMES` | The real admin accounts |
| `ADMIN_PASSWORD` | The real password, **not** `testne` |
| `WEB_ORIGIN` | The web app's real origin (`https://…`) — CORS matches this value exactly |
| `WEB_PREVIEW_PROJECT` | The web app's Vercel project name (`guild-manager-web`) — makes CORS also accept that project's preview domains. Optional; omit it and only `WEB_ORIGIN` is allowed |
| `APP_TIMEZONE` | `Asia/Ho_Chi_Minh` |

The `POSTGRES_*` variables are for `docker-compose.yml` in development only; production does not need
them.

### `apps/web`

| Variable | Production value |
|---|---|
| `AUTH_SECRET` | Exactly the API's value |
| `NEXT_PUBLIC_API_URL` | `https://<api-domain>/api` — note the `/api` suffix, which is `API_PREFIX` |

> **Never mark a `NEXT_PUBLIC_*` variable as "Sensitive" on Vercel.** A sensitive value is withheld
> from the build, and Next.js then inlines the literal string `[SENSITIVE]` in its place. The bundle
> ships `fetch(\`[SENSITIVE]${path}\`)`, which resolves relative to the web app's own origin, and
> **every API call returns 404 from the web host** — a failure that looks like a broken backend while
> the API is perfectly healthy. This happened on 2026-08-16. These variables are compiled into public
> client JavaScript by definition, so there is nothing to protect. Sensitive is correct for the
> server-side ones (`AUTH_SECRET`, `DATABASE_URL`, …).

### Secrets to rotate before opening this up to outsiders

- [ ] A fresh `AUTH_SECRET` (both apps)
- [ ] A fresh `ADMIN_PASSWORD`
- [ ] A Supabase database password not reused anywhere else

## 4. Deploying the apps

Both apps run on **Vercel**, as two separate projects on the same repo, distinguished by their Root
Directory. The full reasoning is in the
[Vercel deployment spec](superpowers/specs/2026-08-16-vercel-deployment-design.md).

| Project | Root Directory | Domain |
|---|---|---|
| `guild-manager-web` | `apps/web` | `https://guild-manager-web.vercel.app` |
| `guild-manager-api` | `apps/api` | `https://guild-manager-api.vercel.app` |

`apps/api` runs as a Vercel Function, **not** as a long-lived process — an earlier version of this
document said it needed one. Two things make that work: Vercel's zero-config NestJS detection (it
builds `src/main.ts` as-is, no build config and no serverless handler to write — `vercel.json` only
turns preview deploys off), and Fluid compute,
which keeps the instance alive between invocations so the pg pool is reused. That is why the pooler
choice in section 5 does not change.

### Deploying

`guild-manager-api` is connected to the GitHub repo (`vercel git connect`), so it deploys itself:

| Git event | What Vercel builds |
|---|---|
| Push to `main` | Production deploy of `guild-manager-api` |
| Open/update a pull request | Nothing — the build is skipped |

The GitHub Actions workflow in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs
**alongside** the Vercel build, not before it — a red test does not stop a deploy. Gating would mean
deploying from Actions with a `VERCEL_TOKEN` instead.

Preview deploys of the API are switched off by `ignoreCommand` in
[`apps/api/vercel.json`](../apps/api/vercel.json), which exits 0 (= skip) for every `VERCEL_ENV`
other than `production`. The reason is environment variables: the API's are scoped to Production
only, and `validateEnv` fails fast at boot, so a preview would build and then crash. Giving previews
their own values means either pointing them at the real database or standing up a second one —
neither is worth it while `WEB_PREVIEW_PROJECT` (section 3) already exists so that **web** previews
call the production API.

`guild-manager-web` is **not connected yet**, so it still deploys by hand:

```bash
# from the repo root, not from apps/*
vercel deploy --prod --yes --project guild-manager-web --scope <team>
```

Two ordering rules:

- Run any pending migrations (section 5) **before** the new build takes traffic.
- `NEXT_PUBLIC_API_URL` is inlined at build time, so changing it requires a **redeploy of the web
  app**, not a restart.

The web/api domain dependency is circular — web needs the API domain to build, the API needs the web
domain for CORS. Break it by hand: deploy one, read its domain, fill it in for the other, redeploy.

### Two constraints Vercel's NestJS build imposes on `apps/api`

Both were discovered the hard way on 2026-08-16, and both are permanent: Vercel compiles the
TypeScript itself, per file, next to the sources, then traces the emitted `require` calls. It does
not use our webpack `dist/main.js`, and a `"main"` field in `package.json` is ignored.

- **No `paths` aliases.** Vercel does not rewrite `tsconfig` path mappings, so an alias like `@/…`
  survives into the emitted JavaScript and fails at runtime with `Cannot find module '@/config'`.
  `apps/api` therefore uses **relative imports only** — do not reintroduce the alias.
- **No raw TypeScript across package boundaries.** Vercel deletes the `.ts` files after compiling,
  so an `exports` map pointing a runtime condition at a `.ts` file resolves to a file that no longer
  exists. This is why `packages/shared` is built to `dist` (section 2).

### Verifying a deploy

1. `GET /api/health` returns `db: "up"`.
2. CORS actually works from the real web origin:
   ```bash
   curl -si -H "Origin: https://guild-manager-web.vercel.app" \
     https://guild-manager-api.vercel.app/api/battle-sessions/weeks | grep -i allow-origin
   ```
3. The deployed bundle really carries the API URL — this is what catches the `[SENSITIVE]` trap from
   section 3:
   ```bash
   curl -s https://guild-manager-web.vercel.app/ \
     | grep -o '/_next/static/chunks/[a-zA-Z0-9_./-]*\.js' | sort -u \
     | while read c; do curl -s "https://guild-manager-web.vercel.app$c"; done \
     | grep -o 'await fetch(`[^`]*`'
   ```
   Expected: ``await fetch(`https://guild-manager-api.vercel.app/api${e}` ``.
4. Log in from the real web domain and open an admin route (`/thiet-lap`) — not being bounced to the
   home page proves `AUTH_SECRET` matches on both sides.

## 5. Production database (Supabase)

Supabase here is just **a hosted Postgres**: no `@supabase/supabase-js`, no PostgREST, no Supabase
Auth/Storage/Realtime. The full reasoning, including the wrong turns taken during design, is in the
[database hosting spec](superpowers/specs/2026-08-02-supabase-hosting-design.md).

### Choosing the connection type

| | Chosen | Why |
|---|---|---|
| Direct (`db.<ref>…:5432`) | ❌ | IPv6 only unless you pay for the IPv4 add-on |
| Transaction pooler (`:6543`) | ❌ | Meant for short-lived clients; loses prepared statements and advisory locks |
| **Session pooler (`:5432`)** | ✅ | The API keeps an open pool and reuses it across requests |

This held when `apps/api` was a long-lived process, and it still holds on Vercel. Transaction pooling
exists for **many short-lived clients** — one process per request, no pool to reuse. Fluid compute
breaks exactly that premise: the instance is not torn down, so the pool survives. The cost of the
transaction pooler, meanwhile, is unchanged.

Switch to the transaction pooler (with `?pgbouncer=true`) **only if** the connection count actually
climbs — measured, not guessed.

> **Known risk, not yet hit:** Supabase discussion #40671 reports client connections creeping up on
> Supavisor when Vercel Fluid is combined with `attachDatabasePool`. If connections climb, look here
> first.

### Two variables, two roles

Prisma 7 dropped `directUrl`, but the split still works because `prisma.config.ts` is **read by the
CLI only**, while `PrismaService` reads `DATABASE_URL` through `ConfigService`:

- `DATABASE_URL` → runtime.
- `DIRECT_DATABASE_URL` → `pnpm migrate:prod` and `db:seed`. Currently the same value as
  `DATABASE_URL`.

`DIRECT_DATABASE_URL` must carry `?connect_timeout=30`: the Prisma CLI gives up after 5 seconds by
default, while a cold connection from Vietnam to the Tokyo region measured 3.7–9.5 seconds. Without
it, `prisma migrate status` intermittently fails with `P1001`. The runtime is unaffected because
`@prisma/adapter-pg` does not use such a short timeout.

> **Do not** write scripts like `DATABASE_URL=$DIRECT_DATABASE_URL prisma migrate deploy`: the shell
> expands the variable before `dotenv` runs, and `dotenv` will not overwrite an existing variable
> even when it is empty — so the migration runs against an empty connection string.

### Running migrations

```bash
cd apps/api
pnpm migrate:prod:status   # how many migrations production is behind
pnpm migrate:prod          # prisma migrate deploy against the real database
```

Both commands set `PRISMA_ENV_FILE=.env.production`, so they read `.env.production` **instead of**
`.env`. Any Prisma command accepts the same variable, including the seed:

```bash
PRISMA_ENV_FILE=.env.production pnpm db:seed   # roster → production
```

Without it, commands target local. Read the datasource printed at the top of the output to be sure
you are hitting the right one:

```
Datasource "db": … at "localhost:5432"                          ← local
Datasource "db": … at "aws-0-….pooler.supabase.com:5432"        ← production
```

The mechanism is `loadPrismaEnv()` in `prisma/load-env.ts`: it loads exactly one env file, named by
`PRISMA_ENV_FILE`, with `override: true`. The override is required because the Prisma CLI injects
`.env` before the config runs — without it the local variables win and the `:prod` commands quietly
target local. This is also why we do not write `DATABASE_URL=$DIRECT_DATABASE_URL prisma …` (see the
warning above).

Both `prisma.config.ts` and `prisma/seed.ts` call it. The seed needs its own call because the CLI
runs it in a **child process**, which does not inherit what the config loaded — that is why the seed
prints which env file it wrote to.

`migrate deploy` only applies migrations that already exist in the repo; it never generates one and
never prompts. New migrations are always created locally with `prisma:migrate` and committed — never
generated directly against the real database.

Seeding is safely re-runnable and is the intended way to load the roster into production. It matches
on name, so existing characters keep their ids (and their attendance records), and it never deletes
anyone — see [`development.md`](development.md) for the file it reads.

### The Data API is blocked

Supabase exposes the `public` schema through the Data API and grants `anon`/`authenticated` full
access by default — the anon key is public by design, which means full read/write access bypassing
`JwtAuthGuard`. Worse, default privileges re-grant that access to **every table created later**, so a
one-off `REVOKE` does not hold.

Migration `20260802185500_chan_data_api_truy_cap_bang` enables RLS (no policies = deny everything),
revokes the existing grants and sets `ALTER DEFAULT PRIVILEGES` for future tables. The app is
unaffected because the `postgres` role has `rolbypassrls`.

After adding any new table, re-check:

```sql
select grantee, table_name from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated');
```

An empty result is correct. **Still open:** turn the Data API off entirely in the dashboard
(Settings → API) — RLS already blocks it, but disabling what you do not use is better.

### Free-tier limits

- **500 MB of database.** The guild's real data (keeping four weeks) is estimated under 150 KB —
  storage is not a concern, so do not use it to justify any design decision.
- **The project is paused after ~7 days without a query.** If the guild goes quiet for a while, the
  next visit will fail to connect until someone restores it manually in the dashboard. This is known,
  **accepted** behaviour, not a broken app.

## 6. Operations

### Health check

```bash
curl https://guild-manager-api.vercel.app/api/health
```

```json
{ "status": "ok", "uptime": 1234, "db": "up", "timestamp": "..." }
```

`status` stays `ok` even when the database is down — only `db` flips to `"down"`. Any monitoring
should read the `db` field, not just the HTTP status.

### Logs

Every response carries an `x-request-id` header, and `LoggingInterceptor` writes that same id into
the logs. If a user reports a problem with the id, the exact request can be traced.

Response format: success is `{ data }`; errors are
`{ statusCode, message, errors?, path, requestId, timestamp }`, with `message` already in Vietnamese
and safe to show directly in the UI.

### Rollback

There is no automatic rollback. In practice:

- **Code:** promote an earlier deployment from the Vercel dashboard (Deployments → ⋯ → Promote to
  Production), or check out the previous commit and run the `vercel deploy --prod` from section 4.
- **Migrations:** Prisma does not generate down-migrations. To go back, write a new migration that
  reverses the change. That is why destructive migrations (dropping a column, changing a type) need
  careful review before merging.
- **Data:** the free tier has its own backup limits; no restore procedure has been tested.

### Not in place yet

Recorded so nobody assumes otherwise: CD for `apps/web` (that project is still deployed by hand), a
staging environment, verified backups, monitoring/alerting, application-level rate limiting.

## See also

- [`architecture.md`](architecture.md) — system architecture
- [`development.md`](development.md) — running locally
- [`apps/api/README.md`](../apps/api/README.md) — backend details
- [database hosting spec](superpowers/specs/2026-08-02-supabase-hosting-design.md) — why the database is set up this way
- [Vercel deployment spec](superpowers/specs/2026-08-16-vercel-deployment-design.md) — why both apps run on Vercel
