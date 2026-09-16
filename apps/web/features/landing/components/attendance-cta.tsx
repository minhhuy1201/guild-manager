import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { DiscordLoginButton } from "@/features/auth";

/**
 * One label for one intent. The landing page asks twice (under the hero, and again at the end) and
 * both times it is asking for the same thing, so both times it says the same words - only the route
 * behind them changes.
 */
const CTA_LABEL = "Điểm danh ngay";

interface AttendanceCtaProps {
  /** Whether the visitor already has a session */
  isSignedIn: boolean;
}

/**
 * The landing page's one call to action: go and mark attendance.
 *
 * Signed in, it is a plain link to the attendance page. Signed out, it starts the Discord OAuth flow
 * with `redirect` already pointing at the attendance page, rather than dropping the visitor on the
 * login screen to press a second button.
 * @param isSignedIn - Whether the visitor already has a session
 * @returns The button, in whichever of its two forms the session calls for
 */
export function AttendanceCta({ isSignedIn }: AttendanceCtaProps) {
  if (!isSignedIn) {
    return (
      <DiscordLoginButton redirect={ROUTES.attendance} label={CTA_LABEL} />
    );
  }

  return (
    <Button
      size="lg"
      nativeButton={false}
      render={<Link href={ROUTES.attendance} />}
    >
      <ClipboardCheck />
      {CTA_LABEL}
    </Button>
  );
}
