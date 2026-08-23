"use client";

import type { Character } from "@guild/shared/schemas";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { useDeleteMember } from "../hooks/use-member-mutations";

interface DeleteMemberDialogProps {
  /** Thành viên sắp xoá; null thì dialog đóng */
  member: Character | null;
  /** Gọi khi dialog đóng lại */
  onClose: () => void;
}

/**
 * Xác nhận xoá một thành viên. Nói thẳng là mất cả lịch sử vì database xoá cascade,
 * không có đường khôi phục.
 * @param member - Thành viên sắp xoá; null thì dialog đóng
 * @param onClose - Gọi khi dialog đóng lại
 * @returns Dialog xác nhận xoá
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
      // Vỏ không mount thân khi đóng nên nhánh rỗng không bao giờ hiện ra;
      // nó có mặt vì `title` là chuỗi bắt buộc còn `member` thì nullable.
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
        Toàn bộ lịch sử điểm danh và các ô đội hình đã xếp của thành viên này sẽ
        mất theo, kể cả tuần cũ — không khôi phục được.
      </div>
    </ConfirmDeleteDialog>
  );
}
