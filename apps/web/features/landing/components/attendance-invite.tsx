import { GuildSeal } from "@/components/shared/guild-seal";
import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { Card } from "@/components/ui/card";

import { AttendanceCta } from "./attendance-cta";

/** Ties the section to its heading, so the region carries a name. */
const INVITE_HEADING_ID = "moi-diem-danh-tieu-de";

interface AttendanceInviteProps {
  /** Whether the visitor already has a session */
  isSignedIn: boolean;
}

/**
 * The page's closing ask, and the one place that spells out the Discord requirement. The hero makes
 * the same ask with the same words but no explanation: an opening has room for a button, not for a
 * footnote.
 *
 * Set on the header's ink-navy (`dark` scope, in both themes) so the page ends framed by the same
 * ink it began with. A phone centres it; from `md` the text sits left and the button right.
 * @param isSignedIn - Whether the visitor already has a session
 * @returns The closing block
 */
export function AttendanceInvite({ isSignedIn }: AttendanceInviteProps) {
  return (
    <section aria-labelledby={INVITE_HEADING_ID}>
      <Card
        variant="raised"
        className="dark items-center gap-6 px-6 py-14 text-center text-foreground md:flex-row md:justify-between md:gap-10 md:px-12 md:text-left"
      >
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-center md:gap-8">
          <GuildSeal size="xl" />
          <div className="flex flex-col items-center gap-4 md:items-start">
            <h2
              id={INVITE_HEADING_ID}
              className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            >
              Tuần này bang đánh, bạn có đi không
            </h2>
            <OrnamentDivider align="center" className="w-40 md:hidden" />
            <p className="max-w-md text-sm text-pretty text-muted-foreground">
              Trang điểm danh cần đăng nhập bằng Discord, và chỉ tài khoản đã được ban
              chỉ huy gắn vào một nhân vật mới vào được.
            </p>
          </div>
        </div>
        <AttendanceCta isSignedIn={isSignedIn} />
      </Card>
    </section>
  );
}
