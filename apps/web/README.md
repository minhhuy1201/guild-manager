# Web — Guild Manager

Next.js frontend for the guild attendance app. All user-facing copy is in **Vietnamese**.

Stack, the `app/` vs `features/` layering, the data-flow rules and the session model are in
[`docs/architecture.md`](../../docs/architecture.md) §4. This file is how you run it.

## Running dev

```bash
cp .env.example .env.local   # fill in AUTH_SECRET, matching the value in apps/api
pnpm install                 # run from the monorepo root
pnpm dev                     # http://localhost:3000
```

Requires `apps/api` to already be running at `http://localhost:3001/api` (see [`apps/api/README.md`](../api/README.md)).

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | Verifies JWTs signed by the API (HMAC-SHA256) — **must match** the API's value |
| `NEXT_PUBLIC_API_URL` | Backend base URL, defaults to `http://localhost:3001/api` |

The web app never connects to the database and holds no admin accounts — those live in the backend
(`ADMIN_USERNAMES` / `ADMIN_PASSWORD`); the web app only verifies the token it receives.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / run the build |
| `pnpm lint` | ESLint (`eslint-config-next`) |
| `pnpm test` / `pnpm test:watch` | Vitest |
| `pnpm dlx shadcn@latest add <component>` | Add a shadcn component to `components/ui/` |

## Documentation

- [`../../docs/architecture.md`](../../docs/architecture.md) — layering, data-flow rules, session model, where new behavior goes
- [`docs/frontend.md`](./docs/frontend.md) — folder structure, data-flow rules, components, UI conventions
- [`../../docs/development.md`](../../docs/development.md) — monorepo-wide setup
- [`../../docs/production.md`](../../docs/production.md) — build and deploy
