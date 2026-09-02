# Guild Manager

Attendance and roster tool for a guild: a few matches every week, members mark themselves
"Yes/No" before the deadline, admins review history and build the team for each match.

A pnpm workspace monorepo: `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (Next.js), and
`packages/shared` (enums and Zod schemas used by both). Every command runs through
`pnpm --filter <app>` or from inside the app directory — the root `package.json` declares no
dependencies and no scripts.

How the pieces fit together, and where new code belongs: [`docs/architecture.md`](docs/architecture.md).

## Requirements

| | Version |
|---|---|
| Node.js | 24 (pinned in `.nvmrc`) |
| pnpm | 12 (pinned in `package.json` → `packageManager`; `corepack enable pnpm` picks up that exact version) |
| Docker | to run PostgreSQL locally |
| A Discord application | sign-in is Discord OAuth2 only — there are no passwords, and the same application backs the bot |

## Running locally

```bash
# 1. Install dependencies (the apps/api postinstall runs `prisma generate` automatically)
pnpm install

# 2. Create the env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Generate AUTH_SECRET and put it in BOTH files (the values must match)
openssl rand -hex 32

# 4. Fill in the Discord credentials in apps/api/.env — see "Signing in" below

# 5. Start the database, create the tables, load the roster
pnpm --filter api db:up
pnpm --filter api prisma:migrate
cp seed-data-example.json seed-data.json   # 14 sample characters; the real roster is git-ignored
pnpm --filter api db:seed

# 6. Run — open two terminals
pnpm --filter api dev     # http://localhost:3001/api  (Swagger: /docs)
pnpm --filter web dev     # http://localhost:3000
```

Quick check: `curl http://localhost:3001/api/health` must return `"db": "up"`.

## Signing in

Identity comes from **Discord OAuth2**, and the API owns the whole flow — no password is stored
anywhere. Create an application at <https://discord.com/developers/applications>, add
`http://localhost:3001/api/auth/discord/callback` under OAuth2 → Redirects, then fill
`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` and `DISCORD_REDIRECT_URI` in `apps/api/.env`.

Four more variables belong to the bot rather than to sign-in, and the API still **refuses to boot**
without any of them — since it is also the web app's backend, a missing value takes the whole site
down: `DISCORD_PUBLIC_KEY` (General Information → Public Key), `DISCORD_BOT_TOKEN` (Bot → Reset
Token), `DISCORD_GUILD_ROLE_ID` (the role `/thong-bao` mentions) and `CRON_SECRET` (any 32+
characters locally — cron never fires outside production).

A login resolves against `Character.discordId`, a column an admin fills in by hand, so a fresh
database lets nobody in. Put your own Discord ID in `DISCORD_ADMIN_IDS` — those ids always sign in as
`ADMIN`, matching character or not, and are the way in before anyone has been linked.

**Every page needs a session**; `/dang-nhap` is the only public route. There are two roles: an
`ADMIN` administers the guild and marks attendance for anyone, past the deadline included, while a
`MEMBER` sees the whole guild's week read-only and marks only their own character, only while the
deadline is open.

More detail (environment variables, common commands, troubleshooting): [`docs/development.md`](docs/development.md).

## Screens

| Route | Purpose | Access |
|---|---|---|
| `/dang-nhap` | Sign in with Discord | Public — the only page reachable without a session |
| `/` | Mark attendance for the current week | Signed in — a member marks their own character, an admin edits the whole grid |
| `/lich-su-diem-danh` | Attendance history | Signed in |
| `/xep-team` | Build the roster for each match | Admin only |
| `/thiet-lap` | Two tabs: "Match setup" (the week's schedule) and "Member management" (add/edit/delete members, including each one's Discord ID and role) | Admin only |

## Discord bot

The same Discord application also runs a bot, served by `apps/api` itself rather than a separate
process: Discord `POST`s each interaction — a slash command or a button press — to
`/api/discord/interactions`, the API verifies the Ed25519 signature and answers in the same response.

| Command | Does |
|---|---|
| `/ping` | Health check |
| `/diem-danh` | Mark your own attendance |
| `/diem-danh-ho @someone` | Mark attendance for someone else (admin) |
| `/thong-bao` | Post the week's schedule (admin) |
| `/cau-hinh-kenh` | Choose the channel announcements go to (admin) |
| `/nhac-diem-danh` | Run the attendance reminder by hand (admin) |

Both attendance commands reply with a private message whose buttons record attendance through the
same service the website writes through. An absence reason can still only be typed on the website.
A Vercel Cron job posts the same reminder every morning for deadlines falling the next day.

Adding a command is one file in `apps/api/src/modules/discord-bot/commands/` plus one line in
`commands/index.ts`, then `pnpm --filter api discord:register` to tell Discord about it.
[`apps/api/README.md`](apps/api/README.md) covers running it against a local tunnel.

## Contributing

`main` is protected: no direct pushes, no force-pushes. Every change goes through a pull request that
the six CI checks must pass, and the branch is deleted on merge.

```bash
git checkout -b <type>/<kebab-case-description>   # feat, fix, refactor, chore, docs, test, ci…
gh pr create                                       # fills in .github/pull_request_template.md
```

Commits and PRs are written in English as Conventional Commits: `<type>(<scope>): <description>`.
Merging a PR that touches `apps/api` migrates the production database and then deploys — see
[`docs/production.md`](docs/production.md) §4.

**Self-review before pushing.** `.claude/settings.json` registers a hook that blocks `git push`
made through Claude Code until the `pr-review` skill has approved the exact commit being pushed —
run `/pr-review`, and on an Approve verdict it records `.claude/.pr-review-passed` (git-ignored,
per-developer). It is a cooperative guardrail, not a security boundary: a push from a plain
terminal never reaches it, and branch protection on `main` remains the real enforcement.

## Documentation

| File | Contents |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | How the system is built, the rules that hold it together, where new behavior goes |
| [`docs/development.md`](docs/development.md) | Local setup, environment variables, commands, workflow |
| [`docs/production.md`](docs/production.md) | Build, deploy, migrating the real database, operations |
| [`apps/api/README.md`](apps/api/README.md) | Backend: running it, commands, the database |
| [`apps/web/README.md`](apps/web/README.md) | Frontend: running it, commands, env |
| [`CLAUDE.md`](CLAUDE.md) | Code conventions for humans and AI agents; [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) and [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) add the per-app rules |
| [`apps/api/docs/backend.md`](apps/api/docs/backend.md) | Backend structure: layers, dependency rules, conventions |
| [`apps/web/docs/frontend.md`](apps/web/docs/frontend.md) | Frontend structure: data-flow rules, components, UI conventions |
| `docs/superpowers/specs/` | Design specs per feature |
