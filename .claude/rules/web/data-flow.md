---
paths:
  - "apps/web/features/**"
  - "apps/web/hooks/**"
  - "apps/web/lib/**"
  - "apps/web/components/providers.tsx"
---

# Web data flow

- **Server data goes through TanStack Query**, in `features/<feature>/hooks/`. Never put an API response in a Zustand store.
- **UI state goes in Zustand**, in `features/<feature>/store/` (filters, dialogs, drag state). Nothing from the network.
- **Never let two hooks write the same store slice.** One hook owns it; the others hand it a value through that hook's handler.
- **`lib/api-client.ts` is the only place that calls `fetch` against the backend.** Feature request functions wrap `apiFetch` in `features/<feature>/api/`. Components never fetch and never call `useQuery`; they call the feature's hook. Both are lint errors (`eslint.config.mjs`).
- **Import another feature only through its entry point:** `index.ts` (client-safe), `server.ts` (server-only), `core/index.ts` (Edge). Never an internal file. `eslint-plugin-boundaries` enforces it; `__tests__/lint-rules.test.ts` keeps it from going silent.
- **Split a feature's entry when it holds server-only code.** `index.ts` stays client-safe. `server.ts` starts with `import "server-only"` and carries everything touching `next/headers` or cookies (`features/auth` is the example). Never re-export a `next/headers` module from the client-safe barrel.
- **Keep the one barrel exception:** `lib/cache-graph.ts` imports `features/<feature>/api/*-keys.ts` directly, never the barrel. A `*-keys.ts` file imports nothing.
- **Never list another feature's query keys at a write site.** Call `useInvalidate("<topic>")`. A new topic is a line in `CACHE_TOPICS`.
- **Put a query key factory in its own `*-keys.ts` file**, named `<feature>Keys` (a `"use server"` module may only export async functions).
- **Keep a write pending until its refetch lands.** `useInvalidate` returns a promise and a mutation returns it from `onSuccess`. Never fire-and-forget it; only `useDeadlineRefresh` may drop the promise.
- **Create `store/` and `lib/` only when the feature needs them.** No empty folders to match the template.
- **Render `ApiError.message` verbatim.** The backend writes the Vietnamese text. Never re-word it.
- **Use `PUBLIC_API_URL`, not `FETCH_API_URL`,** for a URL the browser follows by itself (the Discord login link).
- **Run admin calls in a `"use server"` module** in `features/<feature>/api/` that attaches `authHeader()` from `features/auth/server`. Client JavaScript cannot read the httpOnly token.
- **Never throw from a Server Action - return a rejection.** Wrap the API call in `toActionResult` (`lib/action-result.ts`) and adapt the action in its hook with `fromAction` / `unwrapAction`. A thrown error reaches the client as a bare digest in production, without the backend's message or status.
- **Hand every write failure to `recoverSession` before showing it** (`hooks/use-session-recovery.ts`). When it returns `true`, show no message of your own (`if (recoverSession(error)) return;`). A derived-error hook filters the 401 with `isSessionExpired` and calls `recoverSession` unconditionally (`use-formation-draft`).
- **Mirror `isAttendanceClosed` from the API; never recompute a week or deadline rule on the client.** The one local check is the deadline cap in `session-form-dialog`, through `isWithinDeadlineCap` and `deadlineCapFor` from `@guild/shared/lib`.
- **Import shared code by package name:** `@guild/shared/enums|schemas|lib`. The `exports` list is in [`shared.md`](../shared.md).

Why: [`frontend.md` §3-§4](../../../apps/web/docs/frontend.md#4-data-flow-rules).
