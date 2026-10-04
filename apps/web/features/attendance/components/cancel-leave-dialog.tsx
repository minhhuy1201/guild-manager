"use client";

import type { Leave } from "@guild/shared/schemas";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { toastSuccess } from "@/components/shared/toast";
import { useCancelLeave } from "../hooks/use-leaves";
import { formatLeaveRange } from "../lib/leave-label";

interface CancelLeaveDialogProps {
  /** Leave about to be cancelled; null closes the dialog */
  leave: Leave | null;
  /** Name of the leave's member, for the title */
  memberName: string;
  /** Called when the dialog closes */
  onClose: () => void;
}

/**
 * The confirmation an admin passes before cancelling a leave. Said plainly because an admin cancel
 * also frees the days that already closed, which no member cancel does.
 * @param leave - Leave about to be cancelled
 * @param memberName - Name of the leave's member
 * @param onClose - Called when the dialog closes
 * @returns The confirmation dialog
 */
export function CancelLeaveDialog({
  leave,
  memberName,
  onClose,
}: CancelLeaveDialogProps) {
  const cancelMutation = useCancelLeave();

  return (
    <ConfirmDeleteDialog
      open={leave !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      // The shell does not mount the body while closed, so the empty branches never render; they
      // exist because `leave` is nullable while `title` is a required string.
      title={leave ? `Hủy lần nghỉ của ${memberName}?` : ""}
      submitLabel="Hủy lần nghỉ"
      pendingLabel="Đang hủy…"
      fallbackError="Không hủy được lần nghỉ, thử lại giúp mình."
      run={async () => {
        if (!leave) return;

        await cancelMutation.mutateAsync(leave.id);
        toastSuccess("Đã hủy lần nghỉ.");
      }}
    >
      <div className="text-sm">
        {leave &&
          `Lần nghỉ ${formatLeaveRange(leave.startDate, leave.endDate)} sẽ bị hủy. Các trận trong khoảng này đã khoá điểm danh cũng trở về chưa điểm danh, câu trả lời đã xoá lúc khai nghỉ không khôi phục lại.`}
      </div>
    </ConfirmDeleteDialog>
  );
}
