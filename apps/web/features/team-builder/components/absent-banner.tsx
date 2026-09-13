"use client";

import { UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AbsentBannerProps {
  /** How many placed members of the open match have since said they are not coming */
  count: number;
  /** Send them all back to the pool, as an unsaved draft edit */
  onRemove: () => void;
}

/**
 * Say how many people still stand in the formation after reporting absent, and offer to take them
 * out in one press. The red edge on each card is easy to miss across sixty slots; this line is not.
 * Removing them is a draft edit like any drag, so nothing reaches the server until Save.
 *
 * Framed like `PrefillBanner`, the other note about the draft that sits above the grid.
 * @param count - Placed members who dropped out
 * @param onRemove - Send them back to the pool
 * @returns The banner, or nothing when nobody dropped out
 */
export function AbsentBanner({ count, onRemove }: AbsentBannerProps) {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-destructive/50 bg-destructive/5 px-3 py-2">
      <p className="text-sm">
        {`${count} người đã báo nghỉ còn trong đội hình.`}
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
        <UserMinus />
        Gỡ ra
      </Button>
    </div>
  );
}
