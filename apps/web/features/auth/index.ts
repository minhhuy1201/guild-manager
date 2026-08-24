/**
 * Cửa vào phía **client** của feature auth — an toàn cho cả Server lẫn Client Component.
 *
 * Phần chạm cookie (`getSession`, `getAccessToken`, `createSession`, `fetchMe`) nằm ở
 * `./server` chứ không phải đây: chúng kéo theo `next/headers`, mà một Client Component
 * import trúng barrel này là cả build vỡ với "You're importing a module that depends on
 * next/headers". Trước khi tách, `members-panel.tsx` chỉ cần `useSession` cũng đủ làm chết app.
 */
export { DiscordLoginButton } from "./components/discord-login-button";
export { UserMenu } from "./components/user-menu";
export { useSession, sessionKeys } from "./hooks/use-session";
export { loginErrorMessage } from "./lib/login-error";
