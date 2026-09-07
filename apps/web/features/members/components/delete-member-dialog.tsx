"use client";

import type { GuildMember } from "@guild/shared/schemas";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { useDeleteMember } from "../hooks/use-member-mutations";

interface DeleteMemberDialogProps {
  /** Member about to be deleted; null closes the dialog */
  member: GuildMember | null;
  /** Called when the dialog closes */
  onClose: () => void;
}

/**
 * Confirm deleting a member. It says plainly that the attendance history goes too, because the
 * database cascades and there is no way back - and that the formation cells do not, because their
 * notes describe the position rather than the person.
 * @param member - Member about to be deleted; null closes the dialog
 * @param onClose - Called when the dialog closes
 * @returns The delete confirmation dialog
 */
export function DeleteMemberDialog({
  member,
  onClose,
}: DeleteMemberDialogProps) {
  const deleteMutation = useDeleteMember();

  return (
    <ConfirmDeleteDialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      // The shell does not mount the body while closed, so the empty branch never renders; it exists
      // because `title` is a required string while `member` is nullable.
      title={member ? `Xoá ${member.name}?` : ""}
      submitLabel="Xoá thành viên"
      pendingLabel="Đang xoá…"
      fallbackError="Không xoá được thành viên này."
      run={async () => {
        if (!member) return;
        await deleteMutation.mutateAsync(member.id);
      }}
    >
      <div className="text-sm">
        Toàn bộ lịch sử điểm danh của thành viên này sẽ mất theo, kể cả tuần cũ
        — không khôi phục được. Các ô đội hình đã xếp chỉ bị bỏ trống, ghi chú
        trên ô vẫn còn.
      </div>
    </ConfirmDeleteDialog>
  );
}
