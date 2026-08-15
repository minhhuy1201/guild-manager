# API — Guild Manager

NestJS backend for the guild attendance app.

Stack, layering, modules, the endpoint list and the response contract are in
[`docs/architecture.md`](../../docs/architecture.md) §3. This file is how you run and operate it.

## Running dev

```bash
cp .env.example .env      # fill in AUTH_SECRET (openssl rand -hex 32)
pnpm install              # postinstall runs `prisma generate` automatically
pnpm db:up                # start PostgreSQL with Docker (docker-compose.yml)
pnpm prisma:migrate       # create the tables
pnpm db:seed              # seed 25 sample characters
pnpm dev                  # http://localhost:3001/api
```

- Health check: `GET /api/health`
- Swagger UI: `http://localhost:3001/docs` (JSON spec: `/docs-json`) — disabled when `NODE_ENV=production`

`AUTH_SECRET` must match the value in `apps/web`, since both sides share the session cookie.

Full list of environment variables and troubleshooting: [`docs/development.md`](../../docs/development.md).

## Common commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Run in watch mode |
| `pnpm build` / `pnpm start:prod` | Build (webpack, outputs `dist/main.js`) and run the build |
| `pnpm lint` | ESLint + Prettier, including the cross-layer import ban |
| `pnpm test` / `pnpm test:e2e` | Unit tests / e2e tests |
| `pnpm prisma:generate` | Regenerate Prisma Client into `src/generated/prisma` (not committed) |
| `pnpm prisma:migrate` | Create a new migration from schema changes (`migrate dev`) |
| `pnpm prisma:studio` | Open Prisma Studio |
| `pnpm migrate:prod` | Apply migrations to the real database through `DIRECT_DATABASE_URL` |
| `pnpm db:up` / `pnpm db:down` | Start/stop the PostgreSQL container |
| `pnpm db:reset` | Wipe the volume and recreate an empty DB (re-run `prisma:migrate` + `db:seed` afterwards) |
| `pnpm db:seed` | Seed 25 sample characters (upsert, safe to re-run) |

## Dev database

`docker-compose.yml` starts `postgres:17-alpine` (container `guild-manager-db`); data lives in the
`guild-manager-db-data` volume, so stopping the container does not lose data — use `pnpm db:reset`
to wipe it for real.

Connection details are read from `.env` (`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` /
`POSTGRES_PORT`) and default to matching `DATABASE_URL` in `.env.example`. If you change the
user/password/port you **must update both places**.

> The `db:*` scripts call `docker compose`. On a machine using Podman instead of Docker, set
> `DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock` before `pnpm db:up` (or export it in your
> shell).

## Production database

Hosted on **Supabase's free tier** (region `ap-northeast-1`) and used as a plain Postgres. Everything
operational — connection type, `DATABASE_URL` vs `DIRECT_DATABASE_URL`, migrations, the Data API,
free-tier limits — is in [`docs/production.md`](../../docs/production.md). The three biggest time
sinks, repeated here:

- Use the **session pooler** (`…pooler.supabase.com:5432`), not the transaction pooler (`:6543`).
- `DIRECT_DATABASE_URL` must include `?connect_timeout=30`, otherwise `P1001` shows up at random.
- **The project is paused after ~7 days without queries** — you have to resume it manually in the
  dashboard. Check with `GET /api/health`: `db` returns `"down"`.

## Documentation

- [`../../docs/architecture.md`](../../docs/architecture.md) — layering, modules, endpoints, where new behavior goes
- [`docs/backend.md`](docs/backend.md) — the feature-based architecture theory this follows
- [`../../docs/development.md`](../../docs/development.md) — local setup, environment variables, commands
- [`../../docs/production.md`](../../docs/production.md) — build, deploy, operations
