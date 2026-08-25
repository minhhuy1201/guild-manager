"use server";

import { clearSession } from "./session";

/**
 * Sign out: clear the access/refresh token cookies.
 * There is no login action here any more — the login flow is a redirect chain through Discord, ending
 * at the `/dang-nhap/discord` Route Handler.
 * @returns A promise resolving once the session is destroyed
 */
export async function logout(): Promise<void> {
  await clearSession();
}
