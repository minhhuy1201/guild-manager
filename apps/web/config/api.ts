/** Default local API when running dev without the environment variable. */
const FALLBACK_API_URL = "http://localhost:3001/api";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

// `NEXT_PUBLIC_*` is inlined into the bundle at build time and never re-read at runtime, so a missing
// value in production means the build is already broken: every request would quietly point at
// localhost. Throw here so `next build` fails at deploy instead of surfacing in production.
if (process.env.NODE_ENV === "production" && !configuredApiUrl) {
  throw new Error(
    "Thiếu biến môi trường NEXT_PUBLIC_API_URL — phải khai báo trước khi build production."
  );
}

/**
 * Base URL of the backend API.
 * Set through `NEXT_PUBLIC_API_URL`; defaults to the local API on port 3001.
 */
export const API_BASE_URL = configuredApiUrl ?? FALLBACK_API_URL;
