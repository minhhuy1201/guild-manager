"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Character } from "../types/attendance";

interface AttendancePasswordFormProps {
  /** Nhân vật đang được chỉnh sửa (dùng hiển thị tên) */
  character: Character | null;
  /** Đóng modal khi người dùng bấm Huỷ */
  onCancel: () => void;
  /**
   * Gửi mật khẩu để xác nhận. Ném lỗi nếu sai mật khẩu/quá hạn — form giữ nguyên
   * và hiển thị thông báo lỗi.
   */
  onSubmit: (password: string) => Promise<void>;
}

/**
 * Form nhập mật khẩu bên trong modal xác nhận điểm danh.
 * Chỉ tồn tại khi modal đang mở, nên mật khẩu/lỗi đã nhập tự biến mất lúc đóng —
 * không cần reset tay bằng effect.
 * @param character - Nhân vật đang chỉnh, hiển thị trong mô tả
 * @param onCancel - Gọi khi người dùng bấm Huỷ
 * @param onSubmit - Gọi khi submit, ném lỗi để form hiển thị
 * @returns Form mật khẩu kèm header và footer của dialog
 */
export function AttendancePasswordForm({
  character,
  onCancel,
  onSubmit,
}: AttendancePasswordFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Xử lý submit form: gọi onSubmit, hiển thị lỗi nếu thất bại.
   * @param event - Sự kiện submit form
   * @returns Promise hoàn tất khi đã gửi xong hoặc đã hiển thị lỗi
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
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Xác nhận điểm danh</DialogTitle>
        <DialogDescription>
          Nhập mật khẩu của thành viên{" "}
          <span className="font-medium text-foreground">{character?.name}</span>{" "}
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
          onClick={onCancel}
          disabled={submitting}
        >
          Huỷ
        </Button>
        <Button type="submit" disabled={submitting || password.trim() === ""}>
          {submitting ? "Đang lưu..." : "Xác nhận"}
        </Button>
      </DialogFooter>
    </form>
  );
}
