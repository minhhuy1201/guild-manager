import { CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";

interface UnansweredIconProps {
  className?: string;
}

/**
 * The mark for "not answered yet", beside `AttendanceStatusIcon`'s marks for the two answers. Amber
 * is the palette's colour for it (frontend.md §6); a bare dash read as a minus sign.
 * @param className - Extra classes merged after the base size
 * @returns The mark, with its meaning for screen readers
 */
export function UnansweredIcon({ className }: UnansweredIconProps) {
  return (
    <span className="inline-flex items-center justify-center">
      <CircleDashed aria-hidden className={cn("size-5 text-amber-500", className)} />
      <span className="sr-only">Chưa điểm danh</span>
    </span>
  );
}
