"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSessionSubtitle, type BattleSession } from "@/features/attendance";
import { ApiError } from "@/lib/api-client";
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
  const [error, setError] = useState<string | null>(null);

  /**
   * Xoá trận rồi đóng dialog; thất bại thì giữ dialog và hiện lỗi.
   * @returns Promise hoàn tất khi đã xoá xong hoặc đã hiển thị lỗi
   */
  async function handleDelete() {
    if (!session) return;
    setError(null);

    try {
      await deleteMutation.mutateAsync(session.id);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Không xoá được trận này."
      );
    }
  }

  return (
    <Dialog
      open={session !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        {session && (
          <div className="grid gap-3">
            <DialogHeader>
              <DialogTitle>Xoá trận {session.label}?</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              {getSessionSubtitle(session)}
            </div>
            <div className="text-sm">{describeLoss(session)}</div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Huỷ
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? "Đang xoá…" : "Xoá trận"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
