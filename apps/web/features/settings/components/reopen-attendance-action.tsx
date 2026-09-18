"use client";

import { LockOpen } from "lucide-react";
import type { BattleSession } from "@guild/shared/schemas";

import { RowActionButton } from "@/components/shared/action-buttons";
import { toastError, toastSuccess } from "@/components/shared/toast";
import { errorMessageOf } from "@/lib/error-message";
import { useReopenAttendance } from "../hooks/use-session-mutations";

/** Shown when the day is open to members again. */
const REOPENED = "Đã mở lại điểm danh. Nhớ gửi lại đội hình sau khi chốt.";

/** Shown when the request failed with nothing to say for itself. */
const FAILED = "Không mở lại được điểm danh ngày này.";

interface ReopenAttendanceActionProps {
  /** The day to reopen — its attendance was closed by an announcement */
  session: BattleSession;
}

/**
 * The way back from an announcement sent too early: reopen the day so members answer again.
 *
 * Owns its own mutation rather than taking a callback, like `DeleteSessionDialog` does — the row it
 * sits in is presentational, and the list above it has no reason to learn about this action.
 *
 * Rendered only while `canReopenAttendance` holds, so there is no disabled state to explain: past
 * the deadline the day is closed whatever this button does, and the button is simply gone.
 *
 * @param session - The closed day to reopen
 * @returns The reopen button
 */
export function ReopenAttendanceAction({
  session,
}: ReopenAttendanceActionProps) {
  const mutation = useReopenAttendance();

  return (
    <RowActionButton
      label="Mở lại điểm danh"
      icon={<LockOpen className="size-4" />}
      disabled={mutation.isPending}
      onClick={async () => {
        try {
          await mutation.mutateAsync(session.id);
          toastSuccess(REOPENED);
        } catch (error) {
          toastError(errorMessageOf(error, FAILED));
        }
      }}
    />
  );
}
