# API — Guild Manager

NestJS backend for the guild attendance app.

Stack, layering, modules, the endpoint list and the response contract are in
[`docs/architecture.md`](../../docs/architecture.md) §3. This file is how you run and operate it.

## Running dev

```bash
cp .env.example .env      # fill in AUTH_SECRET (openssl rand -hex 32) and the DISCORD_* values
pnpm install              # postinstall runs `prisma generate` automatically
pnpm db:up                # start PostgreSQL with Docker (docker-compose.yml)
pnpm prisma:migrate       # create the tables
pnpm db:seed              # load the roster from seed-data.json at the repo root
pnpm dev                  # http://localhost:3001/api
```

`seed-data.json` is real guild data and git-ignored. Start from the committed example —
`cp ../../seed-data-example.json ../../seed-data.json` — which holds 14 sample characters.

- Health check: `GET /api/health`
- Swagger UI: `http://localhost:3001/docs` (JSON spec: `/docs-json`) — disabled when `NODE_ENV=production`

`AUTH_SECRET` must match the value in `apps/web`: this side signs the JWT, the web app verifies it,
and a mismatch logs everyone out.

Sign-in is Discord OAuth2 only — no password is stored anywhere. `DISCORD_CLIENT_ID`,
`DISCORD_CLIENT_SECRET` and `DISCORD_REDIRECT_URI` are required at boot, and `DISCORD_ADMIN_IDS` is
the rescue list that gets you in before any `Character` has a `discordId`.

`DISCORD_PUBLIC_KEY` is required at boot too — it verifies the signature on the bot's interaction
webhook. It has nothing to do with signing in, but a missing or malformed value kills the whole
process, which takes the web app's backend down with it, so treat it as mandatory even if you never
touch the bot.

Full list of environment variables and troubleshooting: [`docs/development.md`](../../docs/development.md).

## Common commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Run in watch mode |
| `pnpm build` / `pnpm start:prod` | Build (webpack, outputs `dist/main.js`) and run the build |
| `pnpm lint` | ESLint + Prettier, including the cross-layer import ban |
| `pnpm format:check` | Prettier in check mode — what CI runs |
| `pnpm typecheck` | `tsc --noEmit`, no build output |
| `pnpm test` | Unit tests (Jest) |
| `pnpm discord:register` | Push the slash-command list to Discord. Run by hand after adding or renaming a command, never from CI. Reads `DISCORD_CLIENT_ID`, `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` — the last two are script-only and absent from `env.validation.ts`. `DISCORD_ENV_FILE=.env.production` targets the production application |
| `pnpm prisma:generate` | Regenerate Prisma Client into `src/generated/prisma` (not committed) |
| `pnpm prisma:migrate` | Create a new migration from schema changes (`migrate dev`) |
| `pnpm prisma:studio` | Open Prisma Studio |
| `pnpm migrate:prod` | Apply migrations to the real database through `DIRECT_DATABASE_URL` |
| `pnpm prisma:status` / `pnpm migrate:prod:status` | How many migrations the local / real database is behind |
| `pnpm db:up` / `pnpm db:down` | Start/stop the PostgreSQL container |
| `pnpm db:reset` | Wipe the volume and recreate an empty DB (re-run `prisma:migrate` + `db:seed` afterwards) |
| `pnpm db:seed` | Load the roster from `seed-data.json` (upsert on **name**, safe to re-run) |

## Discord bot

The bot is a module inside this app (`src/modules/discord-bot/`), not a separate service. Discord
`POST`s every slash command to `/api/discord/interactions`, a guard verifies the Ed25519 signature
over the raw body, and the router answers in the same HTTP response — Discord allows **3 seconds**.

A command is one file in `src/modules/discord-bot/commands/` holding both its `definition` and its
`execute`, plus one line in `commands/index.ts`. After adding or renaming one, run
`pnpm discord:register`.

Trying it locally needs a public URL, because Discord calls you rather than the other way round:
run `pnpm dev`, expose it (`cloudflared tunnel --url http://localhost:3001`), then paste
`https://<tunnel>/api/discord/interactions` into the Developer Portal under General Information →
Interactions Endpoint URL. Discord sends a PING the moment you save, so a successful save means the
whole path works. The tunnel URL changes every time you start one — that is the free tier, not a bug.

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
