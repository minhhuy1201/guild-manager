# Production

How to build, ship and operate Guild Manager in the real environment.

> **Current status (2026-08-16):** everything is live. The database runs on Supabase (region
> `ap-northeast-1`, free tier); both apps run on Vercel in **production**:
>
> - `apps/api` → `https://guild-manager-api.vercel.app`
> - `apps/web` → `https://mmgh-nth.vercel.app`
>
> Pushing to `main` deploys both, but only after the tests pass — GitHub Actions drives the deploy.
> See section 4.

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

- **Node 24 everywhere.** `.nvmrc` pins it for local shells and CI (`node-version-file`), and every
  package declares `engines.node: 24.x` — which is also what Vercel reads to pick the build and
  function runtime. `engineStrict: true` in `pnpm-workspace.yaml` turns a mismatch into a failed
  install instead of a surprise at runtime.
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
| `DISCORD_CLIENT_ID` | Client id of the production Discord Application |
| `DISCORD_CLIENT_SECRET` | Its client secret — mark Sensitive |
| `DISCORD_REDIRECT_URI` | `https://<api-domain>/api/auth/discord/callback`, declared character for character under OAuth2 → Redirects in the Developer Portal |
| `DISCORD_ADMIN_IDS` | The guild admin's Discord ID. **Forget this and nobody can sign in**, because no `Character` has a `discordId` yet |
| `WEB_ORIGIN` | The web app's real origin (`https://…`) — CORS matches this value exactly |
| `WEB_PREVIEW_PROJECT` | The web app's Vercel project name (`mmgh-nth`) — makes CORS also accept that project's preview domains. Optional; omit it and only `WEB_ORIGIN` is allowed |
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
- [ ] A `DISCORD_CLIENT_SECRET` from a Discord Application used only by production
- [ ] A Supabase database password not reused anywhere else

## 4. Deploying the apps

Both apps run on **Vercel**, as two separate projects on the same repo, distinguished by their Root
Directory. The full reasoning is in the
[Vercel deployment spec](superpowers/specs/2026-08-16-vercel-deployment-design.md).

| Project | Root Directory | Domain |
|---|---|---|
| `mmgh-nth` | `apps/web` | `https://mmgh-nth.vercel.app` |
| `guild-manager-api` | `apps/api` | `https://guild-manager-api.vercel.app` |

`apps/api` runs as a Vercel Function, **not** as a long-lived process — an earlier version of this
document said it needed one. Two things make that work: Vercel's zero-config NestJS detection (it
builds `src/main.ts` as-is, no build config and no serverless handler to write — the `vercel.json`
there only turns Vercel's own git deploys off), and Fluid compute,
which keeps the instance alive between invocations so the pg pool is reused. That is why the pooler
choice in section 5 does not change.

### Deploying

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) owns the whole pipeline. Vercel's own git
integration is switched off, so **this workflow is the only path to production**:

```
         ┌ backend-test, quality-api, build-api ┐
changes ─┤                                      ├─→ migrate ─→ deploy-api ─→ deploy-web
         └ frontend-test, quality-web, build-web ┘
```

`changes` runs `dorny/paths-filter` first and decides which half of the pipeline is relevant to the
commit. `apps/api/**` marks the API affected, `apps/web/**` marks the web app affected, and
`packages/shared/**`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc` and `.github/**` mark both —
shared code and workspace-wide config can break either app. A commit matching none of them (docs, for
instance) skips every job, including the deploys.

| Git event | What happens |
|---|---|
| Push to `main` touching `apps/api` | API test, lint, build, then the database migration, then API deploy only |
| Push to `main` touching `apps/web` | Web test, lint, build, then web deploy only |
| Push to `main` touching shared code or workspace config | The whole pipeline, both deploys |
| Push to `main` touching only docs | Nothing runs; production is untouched |
| Open/update a pull request | Tests only — the deploy jobs are gated on `github.ref` |
| Any test job fails | The migration and both deploy jobs are skipped; production keeps the previous build **and its schema** |

Three things make the gate real:

- **`needs` plus an explicit result check is the gate.** Path filtering means a dependency can be
  skipped legitimately, and a skipped dependency would cascade into skipping the deploy. So both
  deploy jobs run with `always()` and assert `!contains(needs.*.result, 'failure')` and the same for
  `'cancelled'` — they still refuse to run when any test job is red, but tolerate ones that never
  needed to run.
- **API before web** is a `needs` edge, not a coincidence: web calls the API, so the API contract has
  to be live first. When only the web app changed, `deploy-api` is skipped and web deploys alone —
  the edge orders the two deploys, it does not require both.
- **`vercel deploy` blocks until the build finishes** and exits non-zero if it fails, so a broken API
  build also stops the web deploy.

The workflow deploys with `npx vercel deploy --prod`, uploading the source and letting Vercel build
it — deliberately **not** `vercel build --prebuilt`. Variables marked Sensitive cannot be read back
by `vercel pull`, so building inside Actions would bake empty values into the bundle. Building on
Vercel is also exactly what the git integration used to do, which keeps the two paths identical.

Authentication is `secrets.VERCEL_TOKEN`. The org and project IDs sit in plain `env:` at the top of
the workflow: they are identifiers, not credentials, and they are useless without the token.

Deploying by hand still works and is the way to ship without a commit — or when Actions is down:

```bash
# from the repo root, not from apps/*
vercel deploy --prod --yes --project guild-manager-api --scope <team>
vercel deploy --prod --yes --project mmgh-nth --scope <team>
```

Note that a hand deploy **bypasses the tests**. It is a break-glass tool, not the normal path.

### The Deployments tab, and why it was empty

`vercel deploy` authenticates with `VERCEL_TOKEN` and talks only to Vercel — it has no GitHub context
and creates no deployment record. So when the git integration was switched off on 2026-08-16, GitHub's
**Deployments** tab froze at the last entry `vercel[bot]` had written, and stayed two weeks stale while
production kept shipping normally. The tab was misleading, not broken.

Both deploy jobs therefore declare an `environment`, which is GitHub's own way of recording a
deployment — no extra API call, no third-party action:

```yaml
deploy-api:
  environment:
    name: production-api
    url: https://guild-manager-api.vercel.app
```

Each run now writes an entry against the real commit, and the environment page carries the deploy
history and the live URL.

**This is visibility, not a safety gate.** An environment only becomes a gate once protection rules are
configured on it (required reviewers, a wait timer, branch restrictions) in Settings → Environments.
None are set, so deploys still run unattended. Turning on required reviewers would make every push to
`main` wait for a human — a deliberate choice, not a default.

### Why pushes to `main` do not cancel each other

The `concurrency` block cancels superseded runs on every ref **except** `main`. Runs on `main` share
the group but are not cancelled, so they queue and deploy in commit order. Cancelling one mid-deploy
would abandon a Vercel build that keeps running with nobody watching its result.

### `apps/web` installs only what it needs

`apps/web/vercel.json` overrides the install command:

```
pnpm install --frozen-lockfile --filter web --filter @guild/shared
```

Without it, Vercel installs all three workspace projects, which runs the `postinstall` of `apps/api`
— `prisma generate` — inside the **web** build, where `DATABASE_URL` does not exist. That failed the
build during setup.

`@guild/shared` is named explicitly because the filter is `--filter web`, not `--filter web...` —
the dependency is declared (`"@guild/shared": "workspace:*"`), but that plain filter does not follow
it. Its `prepare` script runs `tsc`, so this install is also what produces the `dist` the `exports`
map points at. `zod` resolves out of `packages/shared/node_modules`.

### Why there are no preview deployments

Both apps carry a `vercel.json` setting `git.deploymentEnabled` to `{"**": false}` — no branch, not
even `main`, deploys on a git event. That is what hands the trigger to GitHub Actions; leaving `main`
enabled would deploy twice per push, once ungated by the tests.

`deploymentEnabled` governs git events only. CLI deploys — from the workflow or by hand — are
unaffected, which is why the pipeline still works with everything set to `false`.

> Do not switch this to `ignoreCommand`. An attempt with `[ "$VERCEL_ENV" != "production" ]`
> **cancelled the production deploy too**, so pushing to `main` shipped nothing. `deploymentEnabled`
> is declarative, and its failure mode is a branch deploying when it should not — rather than `main`
> silently never deploying.

Beyond the double-deploy problem, previews are off because neither app can build outside Production:

- `apps/api` — its variables are scoped to Production, and `validateEnv` fails fast at boot, so a
  preview would build and then crash. Fixing that means pointing previews at the real database or
  standing up a second one.
- `apps/web` — `next build` needs `AUTH_SECRET`, also Production-only. Giving previews a copy would
  spread the JWT signing key into another environment scope.

`WEB_PREVIEW_PROJECT` (section 3) stays in the CORS config regardless: it costs nothing and it is
what makes web previews work the day one of these decisions is revisited.

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
   curl -si -H "Origin: https://mmgh-nth.vercel.app" \
     https://guild-manager-api.vercel.app/api/battle-sessions/weeks | grep -i allow-origin
   ```
3. The deployed bundle really carries the API URL — this is what catches the `[SENSITIVE]` trap from
   section 3:
   ```bash
   curl -s https://mmgh-nth.vercel.app/ \
     | grep -o '/_next/static/chunks/[a-zA-Z0-9_./-]*\.js' | sort -u \
     | while read c; do curl -s "https://mmgh-nth.vercel.app$c"; done \
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
PRISMA_ENV_FILE=.env.production pnpm db:seed             # roster → production
PRISMA_ENV_FILE=.env.production pnpm db:fix-deadlines    # one-off deadline cap migration
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

**CI applies migrations, not you.** The `migrate` job in [`ci.yml`](../.github/workflows/ci.yml) runs
`pnpm migrate:prod` after every test job is green and **before** `deploy-api`, so new code always meets
the new schema and never the other way round. The commands above stay the way to inspect production or
to recover when Actions is down.

Running it by hand used to be the only option, and it sat outside the pipeline's safety net: a deploy
that failed *after* a manual migration left production on the new schema with the old code still
serving. Ordering it inside the workflow is what closes that window.

The job needs `secrets.DIRECT_DATABASE_URL` — the same value as the variable in section 3, including
`?connect_timeout=30`. It writes that secret to `apps/api/.env.production` on the runner rather than
exporting it as a job variable, because `setup-workspace` copies `.env.example` to `.env` and
`loadPrismaEnv()` loads the chosen file with `override: true`: a file always beats an environment
variable here. `migrate:prod` then names that file through `PRISMA_ENV_FILE`, exactly as it does
locally. With no migration pending the job is a no-op, so it is safe on every commit touching
`apps/api`.

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

`ALTER DEFAULT PRIVILEGES` carries the **revoke** to later tables, but it does not enable RLS on them
— that stays per-table and must be done by hand. `20260825071500_bat_rls_cho_bang_moi` catches up the
three tables created since (`AuthExchange`, `FormationMatch`, `FormationSlot`); `AuthExchange` is the
one that matters most, because it holds live single-use login codes and reading one inside its 60s
TTL is enough to take over a session. **Every new table needs its own `ENABLE ROW LEVEL SECURITY`
line in the migration that creates it.**

After adding any new table, re-check both layers:

```sql
-- Layer 1: no grants. An empty result is correct.
select grantee, table_name from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated');

-- Layer 2: RLS on. Every row must read `t` except `_prisma_migrations`.
select relname, relrowsecurity from pg_class
where relkind = 'r' and relnamespace = 'public'::regnamespace order by relname;
``` **Still open:** turn the Data API off entirely in the dashboard
(Settings → API) — RLS already blocks it, but disabling what you do not use is better.

### Free-tier limits

- **500 MB of database.** The guild's real data (keeping four weeks) is estimated under 150 KB —
  storage is not a concern, so do not use it to justify any design decision.
- **The project is paused after ~7 days without a query.** If the guild goes quiet for a while, the
  next visit will fail to connect until someone restores it manually in the dashboard. This is known,
  **accepted** behaviour, not a broken app.

## 6. Operations

### Automated dependency and security checks

Four things run on their own; none of them can deploy, so the worst any of them does is open a PR or
raise an alert.

| What | Where it lives | What it does |
|---|---|---|
| Dependabot version updates | [`.github/dependabot.yml`](../.github/dependabot.yml) | Weekly PRs for `apps/api`, `apps/web`, `packages/shared` and the GitHub Actions the workflows use. Minor and patch bumps are grouped into one PR per package; majors come one at a time, because those are the ones worth reading. |
| Dependabot security updates | Repository setting | Out-of-band PRs for advisories, ignoring the weekly schedule. Enabled together with vulnerability alerts. |
| CodeQL | [`.github/workflows/codeql.yml`](../.github/workflows/codeql.yml) | Static analysis on every PR and push to `main`, plus weekly. Follows data across the repo, which is a different question from `pnpm lint` — ESLint reads one file at a time. Findings land in the Security tab. |
| Secret scanning + push protection | Repository setting | Blocks a push that carries a recognised credential, instead of reporting it after the fact. This is the automated half of the rule in the root `CLAUDE.md`: never commit credentials. |

All four are free because the repository is **public**. Making it private would take CodeQL and secret
scanning with it unless GitHub Advanced Security is bought.

A Dependabot PR is an ordinary PR: `main` is protected, so the same six checks must pass before it can
be merged. Nothing reaches production without going through the pipeline in section 4.

**Why there is a root `package.json`.** Security updates do not read the `directories` list in
`dependabot.yml` — they target the manifest path recorded on the alert, which for a pnpm workspace is
always the root `pnpm-lock.yaml`. With no manifest beside that lockfile every security job failed with
`dependency_file_not_found: /package.json not found`, so none of the 30 open advisories could ever
produce a PR. The root manifest is `private`, carries no dependencies and no scripts, and adds one
empty importer (`.: {}`) to the lockfile. It is a marker for the updater, not a package.

**A dependency update that touches `apps/api` runs the migration job on merge.** That job is a no-op
when nothing is pending, so this is safe — but it is the reason a lockfile bump is not "just" a
lockfile bump.

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

Recorded so nobody assumes otherwise: preview deployments (both projects build on `main` only), a
staging environment, verified backups, monitoring/alerting, application-level rate limiting.

Migrations are still run by hand (section 5) — the pipeline deploys code, never schema. A deploy
whose code expects a column that nobody migrated will fail at runtime, not in CI.

## See also

- [`architecture.md`](architecture.md) — system architecture
- [`development.md`](development.md) — running locally
- [`apps/api/README.md`](../apps/api/README.md) — backend details
- [database hosting spec](superpowers/specs/2026-08-02-supabase-hosting-design.md) — why the database is set up this way
- [Vercel deployment spec](superpowers/specs/2026-08-16-vercel-deployment-design.md) — why both apps run on Vercel
