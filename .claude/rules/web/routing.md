---
paths:
  - "apps/web/app/**"
  - "apps/web/proxy.ts"
  - "apps/web/config/**"
  - "apps/web/features/auth/**"
---

# Web routing and session

- **Keep `app/` to routing and composition.** A page renders one feature component. Logic lives in `features/<feature>/`.
- **Take route paths from `ROUTES` in `config/routes.ts`.** Never a string literal. Routes are Vietnamese (`/xep-team`, `/thiet-lap`) because they are user-visible.
- **A new admin route needs all three:** the prefix in `ADMIN_PATH_PREFIXES` (`features/auth/core/access.ts`, applied by `proxy.ts`), a `getSession()` check in the page's server component, and the guard on the API. Hiding the nav link is cosmetic.
- **Make `proxy.ts` import `@/features/auth/core` and nothing deeper.** It runs at the Edge.
- **Renew tokens only in `proxy.ts`.** It is the only place that can write cookies for an arbitrary request. Write the new pair to both the request and the response.
- **Keep the session in httpOnly cookies.** The access token lives 1 day, the refresh token 1 week.

Why: [`frontend.md` §4, "The session"](../../../apps/web/docs/frontend.md#the-session).
