# Guild Manager

Attendance and roster tool for a guild: a few matches every week, members mark themselves
"Yes/No" before the deadline, admins review history and build the team for each match.

A pnpm workspace monorepo: `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (Next.js), and
`packages/shared` (enums and Zod schemas used by both). There is no root `package.json` — every
command runs through `pnpm --filter <app>` or from inside the app directory.

How the pieces fit together, and where new code belongs: [`docs/architecture.md`](docs/architecture.md).

## Requirements

| | Version |
|---|---|
| Node.js | 22+ (developed on 24) |
| pnpm | 10+ |
| Docker | to run PostgreSQL locally |

## Running locally

```bash
# 1. Install dependencies (the apps/api postinstall runs `prisma generate` automatically)
pnpm install

# 2. Create the env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Generate AUTH_SECRET and put it in BOTH files (the values must match)
openssl rand -hex 32

# 4. Start the database, create the tables, seed 25 sample characters
pnpm --filter api db:up
pnpm --filter api prisma:migrate
pnpm --filter api db:seed

# 5. Run — open two terminals
pnpm --filter api dev     # http://localhost:3001/api  (Swagger: /docs)
pnpm --filter web dev     # http://localhost:3000
```

Log in as an admin with an account from `ADMIN_USERNAMES` + `ADMIN_PASSWORD` in `apps/api/.env`
(defaults to `huy` / `testne`). The attendance screen needs no login: anyone can mark attendance for
any member, as long as the deadline has not passed.

Quick check: `curl http://localhost:3001/api/health` must return `"db": "up"`.

More detail (environment variables, common commands, troubleshooting): [`docs/development.md`](docs/development.md).

## Screens

| Route | Purpose | Access |
|---|---|---|
| `/` | Mark attendance for the current week | Everyone |
| `/lich-su-diem-danh` | Attendance history | Everyone |
| `/xep-team` | Build the roster for each match | Admin only |
| `/thiet-lap` | Two tabs: "Match setup" (the week's schedule) and "Member management" (add/edit/delete members) | Admin only |

## Documentation

| File | Contents |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | How the system is built, the rules that hold it together, where new behavior goes |
| [`docs/development.md`](docs/development.md) | Local setup, environment variables, commands, workflow |
| [`docs/production.md`](docs/production.md) | Build, deploy, migrating the real database, operations |
| [`apps/api/README.md`](apps/api/README.md) | Backend: running it, commands, the database |
| [`apps/web/README.md`](apps/web/README.md) | Frontend: running it, commands, env |
| [`AGENTS.md`](AGENTS.md) | Code conventions for humans and AI agents |
| [`apps/api/docs/backend.md`](apps/api/docs/backend.md) | Backend structure: layers, dependency rules, conventions |
| [`apps/web/docs/frontend.md`](apps/web/docs/frontend.md) | Frontend structure: data-flow rules, components, UI conventions |
| `docs/superpowers/specs/` | Design specs per feature |
