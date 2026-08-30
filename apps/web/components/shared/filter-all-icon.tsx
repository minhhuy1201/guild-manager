import { ListFilter } from "lucide-react";

import { cn } from "@/lib/utils";

interface FilterAllIconProps {
  /** Extra classes, merged after the defaults. */
  className?: string;
}

/**
 * SHARED PATTERN: the mark of the "Tất cả" row in a filter select whose other rows carry a mark of
 * their own (a class image, a status badge). It is deliberately neutral — "Tất cả" is not one of the
 * values being filtered — but it keeps every row of the list aligned on the same icon column.
 * @param className - Extra classes, merged after the defaults
 * @returns The neutral funnel icon
 */
export function FilterAllIcon({ className }: FilterAllIconProps) {
  return (
    <ListFilter className={cn("size-5 text-muted-foreground", className)} />
  );
}
