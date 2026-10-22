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
- **A new management route needs both:** a `getActor()` check in the page's server component (`can(actor, Capability.X)`, redirecting to the attendance page when it fails), and the guard on the API. `proxy.ts` no longer lists management routes: it only requires a session. Hiding the nav link is cosmetic.
- **Read the viewer's role and Grants with `getActor()`, not `getSession()`, in a page that checks a Capability.** The token's role can be a day old, so `getActor()` always takes them from `/auth/me` (one read per render, shared with the header through `getMe`). The proxy cannot judge them from the token, so the page is where the Capability is checked.
- **Make `proxy.ts` import `@/features/auth/core` and nothing deeper.** It runs at the Edge.
- **Renew tokens only in `proxy.ts`.** It is the only place that can write cookies for an arbitrary request. Write the new pair to both the request and the response.
- **Keep the session in httpOnly cookies.** The access token lives 1 day, the refresh token 1 week.

Why: [`frontend.md` §4, "The session"](../../../apps/web/docs/frontend.md#the-session).
