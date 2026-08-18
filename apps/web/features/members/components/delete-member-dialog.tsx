"use client";

import { useState } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";
import type { Character } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-client";
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
  const [error, setError] = useState<string | null>(null);

  /**
   * Xoá thành viên rồi đóng dialog; thất bại thì giữ dialog và hiện lỗi.
   * @returns Promise hoàn tất khi đã xoá xong hoặc đã hiển thị lỗi
   */
  async function handleDelete() {
    if (!member) return;
    setError(null);

    try {
      await deleteMutation.mutateAsync(member.id);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Không xoá được thành viên này."
      );
    }
  }

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        {member && (
          <div className="grid gap-3">
            <DialogHeader>
              <DialogTitle>Xoá {member.name}?</DialogTitle>
            </DialogHeader>
            <div className="text-sm">
              Toàn bộ lịch sử điểm danh và các ô đội hình đã xếp của thành viên
              này sẽ mất theo, kể cả tuần cũ — không khôi phục được.
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                <X />
                Huỷ
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                {deleteMutation.isPending ? "Đang xoá…" : "Xoá thành viên"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
