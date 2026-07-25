"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Character } from "../types/attendance";

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
 * Tự quản mật khẩu nhập, trạng thái gửi và lỗi; reset mỗi khi mở lại.
 * @returns Dialog xác nhận mật khẩu
 */
export function AttendancePasswordDialog({
  open,
  onOpenChange,
  character,
  onSubmit,
}: AttendancePasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset field/lỗi mỗi khi mở lại modal.
  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  /**
   * Xử lý submit form: gọi onSubmit, hiển thị lỗi nếu thất bại.
   * @param event - Sự kiện submit form
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Xác nhận điểm danh</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu của thành viên{" "}
              <span className="font-medium text-foreground">
                {character?.name}
              </span>{" "}
              để lưu thay đổi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="attendance-password">Mật khẩu thành viên</Label>
            <Input
              id="attendance-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-4" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={submitting || password.trim() === ""}>
              {submitting ? "Đang lưu..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
