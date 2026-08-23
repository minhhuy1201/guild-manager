"use client";

import type { BattleSession } from "@guild/shared/schemas";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { getSessionSubtitle } from "@/features/attendance";
import { useDeleteSession } from "../hooks/use-session-mutations";

interface DeleteSessionDialogProps {
  /** Trận sắp xoá; null thì dialog đóng */
  session: BattleSession | null;
  /** Gọi khi dialog đóng lại */
  onClose: () => void;
}

/**
 * Câu cảnh báo trước khi xoá, nói thẳng sẽ mất những gì.
 * @param session - Trận sắp xoá
 * @returns Câu mô tả hậu quả
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
 * Xác nhận xoá một trận scrim.
 * @param session - Trận sắp xoá; null thì dialog đóng
 * @param onClose - Gọi khi dialog đóng lại
 * @returns Dialog xác nhận xoá
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
      // Vỏ không mount thân khi đóng nên các nhánh rỗng ở đây không bao giờ
      // hiện ra; chúng có mặt vì `session` nullable còn `title` là chuỗi bắt buộc.
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
