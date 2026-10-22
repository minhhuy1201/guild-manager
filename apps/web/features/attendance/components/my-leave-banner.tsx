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
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-inner border-2 border-amber-500 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"
          >
            <Plane className="size-4.5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">
              Bạn đang nghỉ {formatLeaveRange(leave.startDate, leave.endDate)}
            </span>
            {leave.reason && (
              <span className="text-muted-foreground">{leave.reason}</span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
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
