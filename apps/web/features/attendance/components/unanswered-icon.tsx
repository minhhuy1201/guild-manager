import { CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";

interface UnansweredIconProps {
  className?: string;
}

/**
 * The mark for "not answered yet", beside `AttendanceStatusIcon`'s marks for the two answers. Amber
 * is the palette's colour for it (frontend.md §6); a bare dash read as a minus sign.
 * @param className - Extra classes merged onto the wrapper after its base size, as `StatusIcon` does
 * @returns The mark, with its meaning for screen readers
 */
export function UnansweredIcon({ className }: UnansweredIconProps) {
  return (
    <span
      className={cn("inline-flex size-5 items-center justify-center", className)}
    >
      <CircleDashed aria-hidden className="size-full text-amber-500" />
      <span className="sr-only">Chưa điểm danh</span>
    </span>
  );
}
