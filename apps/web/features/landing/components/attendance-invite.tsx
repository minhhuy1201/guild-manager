import { OrnamentDivider } from "@/components/shared/ornament-divider";

import { AttendanceCta } from "./attendance-cta";

interface AttendanceInviteProps {
  /** Whether the visitor already has a session */
  isSignedIn: boolean;
}

/**
 * The page's closing ask, and the one place that spells out the Discord requirement. The hero makes
 * the same ask with the same words but no explanation: an opening has room for a button, not for a
 * footnote.
 * @param isSignedIn - Whether the visitor already has a session
 * @returns The closing block
 */
export function AttendanceInvite({ isSignedIn }: AttendanceInviteProps) {
  return (
    <section className="flex flex-col items-center gap-5 rounded-2xl border bg-card px-6 py-12 text-center sm:px-10">
      <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance">
        Tuần này bang đánh, bạn có đi không
      </h2>
      <OrnamentDivider tone="gold" align="center" className="w-40" />
      <p className="max-w-md text-sm text-pretty text-muted-foreground">
        Trang điểm danh cần đăng nhập bằng Discord, và chỉ tài khoản đã được ban
        chỉ huy gắn vào một nhân vật mới vào được.
      </p>
      <AttendanceCta isSignedIn={isSignedIn} />
    </section>
  );
}
