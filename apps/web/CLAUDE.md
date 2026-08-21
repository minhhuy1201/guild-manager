# apps/web — Next.js frontend

Guild Manager's frontend: Next.js 16 App Router, Tailwind 4 + shadcn/ui on Base UI, TanStack Query,
Zustand, Vitest. All user-facing copy is Vietnamese; identifiers and file names are English.

- [`docs/frontend.md`](docs/frontend.md) — the working reference for this app: folder layout, the
  feature template, the data-flow rules, the API boundary, server actions and the admin token, the
  session and the proxy, **display conventions (§6)**, naming, anti-patterns. Read it before creating
  or changing anything under `apps/web`, and extend §6 when you add a convention.
- [`../../docs/architecture.md`](../../docs/architecture.md) §4 describes the same app and **wins when
  the two disagree**; §7 says where new behavior goes.

The rules that get broken first, in the order they get broken:

- **`app/` is routing and composition only** — a page renders one feature component. Logic lives in
  `features/<feature>/`.
- **Server data → TanStack Query** hooks; **UI state → Zustand** (filters, dialogs, drag state). An
  API response never enters a store.
- **`lib/api-client.ts` is the only place that calls `fetch` against the backend.** Feature request
  functions wrap `apiFetch` in `features/<feature>/api/`; components call the feature's hook, never
  `useQuery` directly.
- **Cross-feature imports go through the feature's `index.ts`**, never an internal file.
- **`components/ui/` is shadcn CLI output.** Need a variant? Wrap it in `components/shared/`.
- **Render `ApiError.message` verbatim** — the backend already writes the Vietnamese text meant for
  the user.
- **Week and deadline rules belong to the backend.** Mirror the `isDeadlinePassed` the API sends;
  never recompute one on the client.
- **Server Component by default**; `"use client"` only where interactivity requires it. Route paths
  come from `ROUTES` in `config/routes.ts`, never string literals.
- **A new admin route needs all three**: the prefix in `ADMIN_PATH_PREFIXES` (`proxy.ts`), a
  `getSession()` check in the page, and the guard on the API. Hiding the nav link is cosmetic.
- **`@/*` is the app's only alias**; shared code comes in by real package name
  (`@guild/shared/enums|schemas|lib`), same as `apps/api`. The alias is declared **twice** —
  `tsconfig.json` and `vitest.config.ts` — so a new one missing from the second type-checks fine and
  fails in tests.
- **Tests run against `packages/shared/dist`**, not its sources — the `exports` map sends every
  runtime to `dist/*.js`. `pretest` rebuilds the package first, in both apps. It does **not** cover
  `test:watch` or `next dev` — keep `pnpm --filter @guild/shared build --watch` beside those.
