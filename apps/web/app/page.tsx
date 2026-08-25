import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AttendanceScreen } from "@/features/attendance";
import { getSession } from "@/features/auth/server";

/**
 * Root route "/" — composes the attendance feature's screen.
 * Reads the role on the server to decide whether this person sees the whole guild or only their own character.
 * @returns The attendance screen
 */
export default async function Home() {
  const session = await getSession();

  // proxy.ts already blocked visitors; this branch only tells TypeScript `session` is not null.
  if (!session) redirect(ROUTES.login);

  return <AttendanceScreen role={session.role} />;
}
