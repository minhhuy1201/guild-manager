/**
 * The **client** entry point of the auth feature — safe for both Server and Client Components.
 *
 * Everything touching cookies (`getSession`, `getAccessToken`, `createSession`, `fetchMe`) lives in
 * `./server`, not here: those pull in `next/headers`, and a Client Component importing this barrel
 * would break the whole build with "You're importing a module that depends on next/headers". Before
 * the split, `members-panel.tsx` needing only `useSession` was enough to kill the app.
 */
export { DiscordLoginButton } from "./components/discord-login-button";
export { UserMenu } from "./components/user-menu";
export { useSession, sessionKeys } from "./hooks/use-session";
export { loginErrorMessage } from "./lib/login-error";
