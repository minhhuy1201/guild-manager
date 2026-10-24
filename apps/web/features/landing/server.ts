import "server-only";

/**
 * The **server** entry point of the landing feature: the request the public page makes while it
 * renders. Split from `./index.ts` so a Client Component can never pull the fetch into its bundle.
 */
export { loadFeaturedRaces } from "./api/featured-races-api";
