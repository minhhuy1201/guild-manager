"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { toastError } from "@/components/shared/toast";
import { isSessionExpired } from "@/lib/session-expired";

/** Shown once the refresh has been asked for, since the press that failed is not replayed. */
const RECOVERED =
  "Phiên đăng nhập vừa được làm mới. Bấm lại giúp mình một lần nữa.";

/**
 * Turn a 401 from a Server Action into a navigation, so the session actually comes back.
 *
 * `proxy.ts` is the only place that trades the refresh token for a new pair, and it only runs on a
 * navigation. A Server Action reads the cookie and calls the API directly, so an access token that
 * expired overnight fails there and keeps failing however many times the button is pressed - the
 * session is still valid underneath, and nothing on screen says a reload is all it takes.
 *
 * `router.refresh()` rather than a full reload: it goes through the proxy, so the refreshed cookies
 * land, and it keeps whatever the person had typed.
 *
 * @returns A handler taking the thrown value; true when it took charge of it
 */
export function useSessionRecovery(): (error: unknown) => boolean {
  const router = useRouter();

  return useCallback(
    (error: unknown) => {
      if (!isSessionExpired(error)) return false;

      router.refresh();
      toastError(RECOVERED);

      return true;
    },
    [router]
  );
}
