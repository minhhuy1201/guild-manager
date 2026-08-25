"use client";

import type { BattleSession } from "@guild/shared/schemas";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { getSessionSubtitle } from "@/features/attendance";
import { useDeleteSession } from "../hooks/use-session-mutations";

interface DeleteSessionDialogProps {
  /** Session about to be deleted; null closes the dialog */
  session: BattleSession | null;
  /** Called when the dialog closes */
  onClose: () => void;
}

/**
 * The warning shown before deleting, stating plainly what will be lost.
 * @param session - Session about to be deleted
 * @returns The consequence sentence
 */
function describeLoss(session: BattleSession): string {
  const losses: string[] = [];

  if (session.attendanceCount > 0) {
    losses.push(`${session.attendanceCount} lượt điểm danh`);
  }
  if (session.hasFormation) losses.push("1 đội hình đã xếp");

  if (losses.length === 0) return "Trận này chưa có dữ liệu gì.";

  return `Trận này đã có ${losses.join(
    " và "
  )} — xoá là mất hết, không khôi phục được.`;
}

/**
 * Confirm deleting a scrim.
 * @param session - Session about to be deleted; null closes the dialog
 * @param onClose - Called when the dialog closes
 * @returns The delete confirmation dialog
 */
export function DeleteSessionDialog({
  session,
  onClose,
}: DeleteSessionDialogProps) {
  const deleteMutation = useDeleteSession();

  return (
    <ConfirmDeleteDialog
      open={session !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      // The shell does not mount the body while closed, so these empty branches never render; they
      // exist because `session` is nullable while `title` is a required string.
      title={session ? `Xoá trận ${session.label}?` : ""}
      description={
        session && (
          <div className="text-sm text-muted-foreground">
            {getSessionSubtitle(session)}
          </div>
        )
      }
      submitLabel="Xoá trận"
      pendingLabel="Đang xoá…"
      fallbackError="Không xoá được trận này."
      run={async () => {
        if (!session) return;
        await deleteMutation.mutateAsync(session.id);
      }}
    >
      <div className="text-sm">{session && describeLoss(session)}</div>
    </ConfirmDeleteDialog>
  );
}
