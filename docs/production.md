# Production

How to build, ship and operate Guild Manager in the real environment.

> **Current status (2026-08-03):** the database already runs for real on Supabase (region
> `ap-northeast-1`, free tier). `apps/api` and `apps/web` **have no host chosen yet** — there is no
> `Dockerfile`, `vercel.json` or CI pipeline in the repo. The "Deploying the apps" section below
> describes the requirements and the options, not a process that has already been run.

## 1. Deployment architecture

The diagram and the three constraints that govern everything (the web app never touches the
database, both apps share `AUTH_SECRET`, the API is a long-lived process holding a pg pool) live in
[`architecture.md`](architecture.md), section 1. The third constraint is why the session pooler is
chosen in section 5.

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
  `packages/shared` is imported as TypeScript source and has no separate build step.
- Building `apps/web` requires `NEXT_PUBLIC_API_URL`, because `NEXT_PUBLIC_*` variables are inlined
  into the bundle at build time and are not read again at runtime.

## 3. Production environment variables

The real values live in `apps/api/.env.production`, a file that is **not committed** (`.gitignore`
catches `.env.*`). It is not the file the runtime reads; it holds the values needed to run Prisma
commands against the real database from a local machine, and serves as the copy you paste into the
hosting provider's environment variables when deploying.

`apps/api/.env` is always **local** (the Postgres container, see [`development.md`](development.md)).
Do not point it at Supabase: `pnpm dev`, `pnpm prisma:migrate` and especially `pnpm db:seed` all read
that file, and the seed overwrites sample data onto whatever database it touches.

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
| `APP_TIMEZONE` | `Asia/Ho_Chi_Minh` |

The `POSTGRES_*` variables are for `docker-compose.yml` in development only; production does not need
them.

### `apps/web`

| Variable | Production value |
|---|---|
| `AUTH_SECRET` | Exactly the API's value |
| `NEXT_PUBLIC_API_URL` | `https://<api-domain>/api` |

### Secrets to rotate before opening this up to outsiders

- [ ] A fresh `AUTH_SECRET` (both apps)
- [ ] A fresh `ADMIN_PASSWORD`
- [ ] A Supabase database password not reused anywhere else

## 4. Deploying the apps

No provider has been settled on. The constraints that drive the choice:

| | Requirement |
|---|---|
| `apps/web` | Next.js 16 App Router with `proxy.ts` (middleware) and server actions. Vercel is the path of least friction; anywhere else needs a Node runtime — static export is not an option. |
| `apps/api` | **A long-lived Node process.** Going serverless would reverse the pooler decision in section 5 and break the pg pool. Suitable: a VPS, Render, Railway, Fly.io — anything that keeps running `node dist/main`. |

What has to happen on the first deploy, whichever host is picked:

1. Set every environment variable from section 3.
2. Install from the repo root (`pnpm install --frozen-lockfile`) and build the app being deployed.
3. Run the migrations against the real database (section 5) **before** starting the new build.
4. Point `WEB_ORIGIN` and `NEXT_PUBLIC_API_URL` at each other's real domains.
5. Confirm that `GET /api/health` returns `db: "up"`.

There is no CI yet: building and deploying are manual for now.

## 5. Production database (Supabase)

Supabase here is just **a hosted Postgres**: no `@supabase/supabase-js`, no PostgREST, no Supabase
Auth/Storage/Realtime. The full reasoning, including the wrong turns taken during design, is in the
[database hosting spec](superpowers/specs/2026-08-02-supabase-hosting-design.md).

### Choosing the connection type

| | Chosen | Why |
|---|---|---|
| Direct (`db.<ref>…:5432`) | ❌ | IPv6 only unless you pay for the IPv4 add-on |
| Transaction pooler (`:6543`) | ❌ | Meant for short-lived clients; loses prepared statements and advisory locks |
| **Session pooler (`:5432`)** | ✅ | The API is a long-lived process holding an open pool |

Switch to the transaction pooler **only if** `apps/api` moves to serverless.

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
`.env`. Commands without the `:prod` suffix (`pnpm prisma:status`, `pnpm prisma:migrate`,
`pnpm db:seed`) always target local — read the datasource printed at the top of the output to be sure
you are hitting the right one:

```
Datasource "db": … at "localhost:5432"                          ← local
Datasource "db": … at "aws-0-….pooler.supabase.com:5432"        ← production
```

The mechanism is in `prisma.config.ts`: it loads exactly one env file, named by `PRISMA_ENV_FILE`,
with `override: true`. The override is required because the Prisma CLI injects `.env` before the
config runs — without it the local variables win and the `:prod` commands quietly target local. This
is also why we do not write `DATABASE_URL=$DIRECT_DATABASE_URL prisma …` (see the warning above).

`migrate deploy` only applies migrations that already exist in the repo; it never generates one and
never prompts. New migrations are always created locally with `prisma:migrate` and committed — never
generated directly against the real database.

Seeding (`pnpm db:seed`) upserts by id and is safely re-runnable — but it writes **sample data**, so
do not run it against a database holding real data.

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
curl https://<api-domain>/api/health
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

- **Code:** redeploy the previous commit.
- **Migrations:** Prisma does not generate down-migrations. To go back, write a new migration that
  reverses the change. That is why destructive migrations (dropping a column, changing a type) need
  careful review before merging.
- **Data:** the free tier has its own backup limits; no restore procedure has been tested.

### Not in place yet

Recorded so nobody assumes otherwise: CI/CD, a staging environment, verified backups,
monitoring/alerting, application-level rate limiting.

## See also

- [`architecture.md`](architecture.md) — system architecture
- [`development.md`](development.md) — running locally
- [`apps/api/README.md`](../apps/api/README.md) — backend details
- [database hosting spec](superpowers/specs/2026-08-02-supabase-hosting-design.md) — why it is set up this way
