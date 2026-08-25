import { ArrowRight } from "lucide-react";

import { formatDate, formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DateRangeProps {
  /** ISO start date */
  start: string;
  /** ISO end date */
  end: string;
  /** Show the year (dd/MM/yyyy) instead of just day/month */
  withYear?: boolean;
  /** Extra classes, merged after the defaults */
  className?: string;
}

/**
 * SHARED PATTERN: every date range in the UI renders as "03/08 →(icon) 08/08" — an icon arrow for
 * visual balance rather than "->", plus the word "đến" for screen readers, which cannot read the icon.
 * @param start - ISO start date
 * @param end - ISO end date
 * @param withYear - Show the year when years must be told apart
 * @param className - Extra classes
 * @returns The formatted date range
 */
export function DateRange({
  start,
  end,
  withYear = false,
  className,
}: DateRangeProps) {
  const format = withYear ? formatDate : formatDayMonth;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {format(start)}
      <ArrowRight className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      <span className="sr-only">đến</span>
      {format(end)}
    </span>
  );
}
