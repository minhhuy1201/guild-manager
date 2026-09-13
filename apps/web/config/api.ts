/** Default local API when running dev without the environment variable. */
const FALLBACK_API_URL = "http://localhost:3001/api";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

// Server-side only override, set by the `dev` profile of docker-compose.yml: inside the web
// container the API answers on `http://api:3001/api`, while the browser must keep calling the
// published `localhost:3001`. Next inlines `NEXT_PUBLIC_*` into the client bundle and leaves every
// other `process.env` lookup there as undefined, so this one module resolves to the internal URL on
// the server and to the public one in the browser. Unset everywhere else, containers included in
// production, where server and browser share one origin.
const internalApiUrl = process.env.API_INTERNAL_URL;

// `NEXT_PUBLIC_*` is inlined into the bundle at build time and never re-read at runtime, so a missing
// value in production means the build is already broken: every request would quietly point at
// localhost. Throw here so `next build` fails at deploy instead of surfacing in production.
if (process.env.NODE_ENV === "production" && !configuredApiUrl) {
  throw new Error(
    "Thiếu biến môi trường NEXT_PUBLIC_API_URL — phải khai báo trước khi build production."
  );
}

/**
 * Base URL of the backend API as the browser reaches it, for every URL the app hands to the browser
 * to follow itself (the Discord login link). Set through `NEXT_PUBLIC_API_URL`; defaults to the
 * local API on port 3001.
 */
export const PUBLIC_API_URL = configuredApiUrl ?? FALLBACK_API_URL;

/**
 * Base URL for the requests this app makes itself (`apiFetch`). On the server it takes
 * `API_INTERNAL_URL` when set; in the browser that lookup is undefined, so it is `PUBLIC_API_URL`.
 * Never render it into markup: a Server Component would hand the browser a host only the containers
 * can resolve.
 */
export const API_BASE_URL = internalApiUrl ?? PUBLIC_API_URL;
