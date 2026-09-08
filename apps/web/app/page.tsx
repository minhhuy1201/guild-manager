import { redirect } from "next/navigation";

import { ErrorNotice } from "@/components/shared/error-notice";
import { ROUTES } from "@/config/routes";
import { AttendanceScreen } from "@/features/attendance";
import { loginErrorMessage } from "@/features/auth";
import { getSession } from "@/features/auth/server";

/**
 * Root route "/" — composes the attendance feature's screen.
 * Reads the role on the server to decide whether this person sees the whole guild or only their own character.
 * @param props.searchParams - `error`, set when another page redirected here rather than render
 * @returns The attendance screen
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();

  // proxy.ts already blocked visitors; this branch only tells TypeScript `session` is not null.
  if (!session) redirect(ROUTES.login);

  const { error } = await searchParams;
  const message = loginErrorMessage(error);

  return (
    <>
      {message && <ErrorNotice message={message} />}
      <AttendanceScreen role={session.role} />
    </>
  );
}
