"use client";

import { Plane } from "lucide-react";

import { toastError, toastSuccess } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth";
import { ApiError } from "@/lib/api-client";
import { useCancelLeave, useLeaves } from "../hooks/use-leaves";
import { formatLeaveRange } from "../lib/leave-label";

/** Shown when the cancel fails with something other than an `ApiError`. */
const FALLBACK_ERROR = "Không hủy được lần nghỉ, thử lại giúp mình.";

/**
 * The viewer's own active or upcoming leaves, each with a cancel button. Renders nothing when there
 * is none, so a member who never takes leave never sees it.
 * @returns The banner, or nothing
 */
export function MyLeaveBanner() {
  const { data: session } = useSession();
  const { data: leaves } = useLeaves();
  const { mutateAsync: cancel, isPending, variables } = useCancelLeave();

  const characterId = session?.character?.id;
  const mine = (leaves ?? []).filter((leave) => leave.characterId === characterId);
  if (mine.length === 0) return null;

  /**
   * Cancel one leave and report the outcome in a toast.
   * @param id - Leave to cancel
   * @returns A promise settled once the toast is shown
   */
  async function handleCancel(id: string): Promise<void> {
    try {
      await cancel(id);
      toastSuccess("Đã hủy lần nghỉ.");
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : FALLBACK_ERROR);
    }
  }

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
            disabled={isPending && variables === leave.id}
            onClick={() => handleCancel(leave.id)}
          >
            Hủy nghỉ
          </Button>
        </li>
      ))}
    </ul>
  );
}
