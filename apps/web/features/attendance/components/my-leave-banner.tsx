"use client";

import { Plane } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth";
import { useCancelLeaveWithToast } from "../hooks/use-cancel-leave-with-toast";
import { useLeaves } from "../hooks/use-leaves";
import { formatLeaveRange } from "../lib/leave-label";

/**
 * The viewer's own active or upcoming leaves, each with a cancel button. Renders nothing when there
 * is none, so a member who never takes leave never sees it.
 * @returns The banner, or nothing
 */
export function MyLeaveBanner() {
  const { data: session } = useSession();
  const { data: leaves } = useLeaves();
  const { cancel, isCancelling } = useCancelLeaveWithToast();

  const characterId = session?.character?.id;
  const mine = (leaves ?? []).filter((leave) => leave.characterId === characterId);
  if (mine.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {mine.map((leave) => (
        <li
          key={leave.id}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500 bg-amber-500/5 px-4 py-2 text-sm"
        >
          <Plane className="size-4 text-amber-600" aria-hidden />
          <span className="font-medium">
            Bạn đang nghỉ {formatLeaveRange(leave.startDate, leave.endDate)}
          </span>
          {leave.reason && (
            <span className="text-muted-foreground">- {leave.reason}</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={isCancelling(leave.id)}
            onClick={() => cancel(leave.id)}
          >
            Hủy nghỉ
          </Button>
        </li>
      ))}
    </ul>
  );
}
