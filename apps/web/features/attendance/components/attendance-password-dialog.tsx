"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Character } from "../types/attendance";
import { AttendancePasswordForm } from "./attendance-password-form";

interface AttendancePasswordDialogProps {
  /** Modal có đang mở hay không */
  open: boolean;
  /** Đổi trạng thái mở/đóng modal */
  onOpenChange: (open: boolean) => void;
  /** Nhân vật đang được chỉnh sửa (dùng hiển thị tên) */
  character: Character | null;
  /**
   * Gửi mật khẩu để xác nhận. Ném lỗi nếu sai mật khẩu/quá hạn — modal giữ nguyên
   * và hiển thị thông báo lỗi.
   */
  onSubmit: (password: string) => Promise<void>;
}

/**
 * Modal nhập mật khẩu của nhân vật đang chỉnh để xác nhận thay đổi điểm danh.
 * Chỉ lo phần khung modal; mật khẩu/lỗi/trạng thái gửi nằm trong form con, vốn bị
 * unmount khi đóng nên tự reset ở lần mở sau.
 * @param open - Modal có đang mở hay không
 * @param onOpenChange - Đổi trạng thái mở/đóng modal
 * @param character - Nhân vật đang chỉnh, hiển thị trong mô tả
 * @param onSubmit - Gọi khi submit, ném lỗi để form hiển thị
 * @returns Dialog xác nhận mật khẩu
 */
export function AttendancePasswordDialog({
  open,
  onOpenChange,
  character,
  onSubmit,
}: AttendancePasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <AttendancePasswordForm
          character={character}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
