"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteMatchDialogProps {
  /** Dialog đang mở hay không */
  open: boolean;
  /** Gọi khi người dùng đóng hoặc xác nhận */
  onOpenChange: (open: boolean) => void;
  /** Bỏ trận 2 khỏi nháp của ngày */
  onConfirm: () => void;
}

/**
 * Xác nhận bỏ trận 2. Nói rõ chưa mất gì cho tới khi bấm Lưu, vì nút Lưu là
 * của cả ngày chứ không của riêng trận nào.
 * @param open - Dialog đang mở hay không
 * @param onOpenChange - Gọi khi người dùng đóng hoặc xác nhận
 * @param onConfirm - Bỏ trận 2 khỏi nháp của ngày
 * @returns Dialog xác nhận
 */
export function DeleteMatchDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteMatchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Xoá trận 2 khỏi ngày này?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Đội hình trận 2 sẽ mất khi bạn bấm Lưu.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              Xoá trận 2
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
