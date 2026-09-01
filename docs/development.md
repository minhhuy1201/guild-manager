# Development

How to set up and work on Guild Manager locally. The short "just get it running" version lives in
the [root README](../README.md); this file adds the configuration details, the commands, and the
places people usually get stuck.

## 1. Requirements

| | Version | Notes |
|---|---|---|
| Node.js | 24 | pinned in `.nvmrc`; `engines.node` + `engineStrict` make a wrong version fail `pnpm install` |
| pnpm | 12 | pinned in the root `package.json` (`packageManager`); `corepack enable pnpm` picks up that exact version |
| Docker | any supported release | only used to run PostgreSQL (Podman works, see section 4) |
| `openssl` | | to generate `AUTH_SECRET` |

The root `package.json` declares no scripts, so there is nothing to run from the repo root. Run an
app's scripts in either of two ways:

```bash
pnpm --filter api dev        # from the repo root
cd apps/api && pnpm dev      # or from inside the app
```

The filter names are `api`, `web`, `@guild/shared`.

## 2. First-time setup

```bash
pnpm install
```

The `postinstall` script of `apps/api` runs `prisma generate`, which emits the Prisma Client into
`apps/api/src/generated/prisma` (that directory is **not committed**).

Create the two env files from their templates:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Generate a key and put it in **both** files:

```bash
openssl rand -hex 32
```

## 3. Environment variables

### `apps/api/.env`

Validated with Zod at boot (`src/config/env.validation.ts`) — if a variable is missing or malformed
the app dies immediately with a Vietnamese error message instead of half-running.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | | `development` | `development` \| `production` \| `test` |
| `PORT` | | `3001` | API port (3000 is reserved for Next.js) |
| `DATABASE_URL` | ✅ | — | Postgres connection string, used by the runtime **and** the Prisma CLI |
| `DIRECT_DATABASE_URL` | | empty | Read by the Prisma CLI only (`migrate:prod`, `db:seed`). Leave empty locally |
| `WEB_ORIGIN` | | `http://localhost:3000` | Origin allowed through CORS |
| `AUTH_SECRET` | ✅ | — | JWT signing key, at least 32 characters — **must match `apps/web`** |
| `DISCORD_CLIENT_ID` | ✅ | — | Discord Application client id (Developer Portal → OAuth2) |
| `DISCORD_CLIENT_SECRET` | ✅ | — | Discord Application client secret — API only, never the web app |
| `DISCORD_REDIRECT_URI` | ✅ | — | Must match a Redirect declared in the Developer Portal **character for character**; locally `http://localhost:3001/api/auth/discord/callback` |
| `DISCORD_ADMIN_IDS` | | empty | Rescue Discord IDs, comma-separated. They always sign in as `ADMIN`, even with no matching `Character` — the only way in before anyone has been linked |
| `DISCORD_PUBLIC_KEY` | ✅ | — | Application public key (Developer Portal → General Information), 64 hex characters. Verifies the Ed25519 signature on every interaction webhook — **the API refuses to boot without it** |
| `DISCORD_BOT_TOKEN` | script only | — | Developer Portal → Bot → Reset Token, shown exactly once. Read by `pnpm --filter api discord:register` and nothing else, which is why it is not in `env.validation.ts` |
| `DISCORD_GUILD_ID` | script only | — | Id of the guild's Discord server (Developer Mode → right-click the server → Copy Server ID). Read by `discord:register` only |
| `APP_TIMEZONE` | | `Asia/Ho_Chi_Minh` | Timezone used to compute attendance deadlines |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | | postgres/postgres/guild_manager/5432 | Read by `docker-compose.yml` only — **must match `DATABASE_URL`** |

`DIRECT_DATABASE_URL` is deliberately **absent** from `envSchema`: the runtime must never touch it.

### `apps/web/.env.local`

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | Verifies the JWT signed by the API (HMAC-SHA256) — must equal the API's value |
| `NEXT_PUBLIC_API_URL` | Backend base URL, defaults to `http://localhost:3001/api` |

The web app **never** connects to the database. There are no Supabase variables on the web side.

## 4. Local database

```bash
pnpm --filter api db:up          # start postgres:17-alpine (container guild-manager-db)
pnpm --filter api prisma:migrate # create the tables (prisma migrate dev)
pnpm --filter api db:seed        # the guild roster, re-runnable
```

Data lives in the `guild-manager-db-data` volume, so `db:down` does not lose it. To wipe everything:

```bash
pnpm --filter api db:reset       # down -v && up  → run migrate + seed again afterwards
```

The roster is read from `seed-data.json` at the repo root — real guild data, so it is **not
committed** (`.gitignore` catches it). Start from the committed example:

```bash
cp seed-data-example.json seed-data.json   # then edit it for your own guild
```

If you are working on this guild's instance, ask an admin for the current copy instead. Either way,
without the file `db:seed` fails with a message telling you this.

Format is an array of `{ id, name, guildClass }`:

- `id` — primary key, any unique string. The example follows the same `slug-suffix` scheme the API
  generates for characters added through the UI (`characters.lib.ts`), which keeps ids looking
  consistent whichever way they were created.
- `name` — display name, must be unique within the file.
- `guildClass` — one of the `GuildClass` enum values in `packages/shared/enums`.

The file is validated with Zod before anything is written, so a typo in `guildClass` is a clear
error rather than a bad row in the database.

`db:seed` matches on **name**, so re-running it keeps each existing character's id — and therefore
their attendance records and formation slots. It only inserts and updates; it never deletes anyone
dropped from the file. Remove those through the admin UI, where you can see what cascades.

> **Container runtime:** the `db:*` scripts call `docker compose`. On a machine using Podman instead
> of Docker, export `DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock` (the Podman socket must be
> running: `systemctl --user start podman.socket`), or switch those three scripts to `podman compose`
> in `apps/api/package.json` — `docker-compose.yml` is shared and needs no changes.
>
> If both are installed you must pick one: each runtime keeps its own containers and volumes, so
> `podman compose up` and `docker compose up` create two different databases and whichever starts
> second fails with `bind host port 0.0.0.0:5432: address already in use`.

## 5. Running in development

Two terminals:

```bash
pnpm --filter api dev    # http://localhost:3001/api — watch mode
pnpm --filter web dev    # http://localhost:3000
```

- Health check: `curl http://localhost:3001/api/health` → `{"status":"ok","db":"up",...}`
- Swagger UI: <http://localhost:3001/docs> (JSON spec at `/docs-json`) — disabled when `NODE_ENV=production`
- Sign in: <http://localhost:3000/dang-nhap> → **Đăng nhập bằng Discord**. Create an application at
  <https://discord.com/developers/applications>, add `http://localhost:3001/api/auth/discord/callback`
  under OAuth2 → Redirects, and put your own Discord ID in `DISCORD_ADMIN_IDS` so you can get in
  before any `Character` has a `discordId`

## 6. Common commands

### Backend (`pnpm --filter api …`)

| Command | Purpose |
|---|---|
| `dev` | Watch mode |
| `build` / `start:prod` | Webpack build to `dist/main.js` / run the build |
| `lint` | ESLint + Prettier, including the rule blocking cross-layer imports |
| `format:check` | Prettier in check mode — what CI runs |
| `typecheck` | `tsc --noEmit`, no build output |
| `test` | Unit tests (Jest) |
| `prisma:generate` | Regenerate the Prisma Client |
| `prisma:migrate` | `migrate dev` — create a new migration from schema changes |
| `prisma:studio` | Open Prisma Studio |
| `db:up` / `db:down` / `db:reset` | Postgres container lifecycle |
| `db:seed` | Load the roster from `seed-data.json` |
| `db:fix-deadlines` | One-off: bring the open and next week's deadlines back under the cap |

### Frontend (`pnpm --filter web …`)

| Command | Purpose |
|---|---|
| `dev` | Next.js dev server |
| `build` / `start` | Production build / run the build |
| `lint` | ESLint (`eslint-config-next`) |
| `typecheck` | `tsc --noEmit` |
| `test` / `test:watch` | Vitest |

Add a shadcn component (run inside `apps/web`):

```bash
pnpm dlx shadcn@latest add <component-name>
```

## 7. Workflows

### Changing the database schema

1. Edit `apps/api/prisma/schema.prisma`.
2. `pnpm --filter api prisma:migrate` → name the migration in unaccented Vietnamese, e.g.
   `character_id_la_game_id`.
3. Enums in the schema must **keep matching values** with `packages/shared/enums` — `seed.ts` imports
   the shared enums directly, so a mismatch is a compile error, not a runtime bug.
4. Commit the whole migration directory.

### Adding new code (backend module, frontend feature, shared type…)

Where new code belongs is documented in [`architecture.md`](architecture.md), section 7 "Where new
behavior goes". Editing `packages/shared` updates the **types** in both apps as soon as you save, but
the runtime loads `packages/shared/dist`, so rebuild it before expecting **either app** to behave
differently — a running `next dev` reads `dist` just as the API does:

```bash
pnpm --filter @guild/shared build
```

## 8. Before committing

```bash
pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test
```

That is the whole of what the six CI checks run, minus the two builds.

Never commit: `.env*` (except `.env.example`), `apps/api/src/generated/`, `dist/`, `.next/`.

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| API boot fails with `Biến môi trường không hợp lệ` | Read the list printed right below the message — usually a missing `AUTH_SECRET` or a key shorter than 32 characters |
| Login succeeds but `/xep-team` bounces back to the home page | The web `AUTH_SECRET` differs from the API's → the web app fails to verify the JWT |
| `P1001 Can't reach database server` | The container is not running (`db:up`), or `POSTGRES_PORT` disagrees with the port in `DATABASE_URL` |
| Prisma Client reports missing types after a schema change | Run `pnpm --filter api prisma:generate` |
| CORS blocks requests from the web app | `WEB_ORIGIN` must match the origin you are actually browsing (port included) |
| Port 3000/3001 already in use | Change `PORT` (api) and `NEXT_PUBLIC_API_URL` (web) to match |
| `db:up` fails with a socket error on Podman | `DOCKER_HOST` is missing — see section 4 |

## See also

- [`architecture.md`](architecture.md) — system architecture, layer boundaries, where new code goes
- [`production.md`](production.md) — build, deploy, the real database
- [`apps/api/README.md`](../apps/api/README.md) — backend details
- [`apps/web/README.md`](../apps/web/README.md) — frontend details
- `docs/superpowers/specs/` — design specs per feature
