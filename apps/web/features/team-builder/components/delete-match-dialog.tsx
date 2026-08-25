"use client";

import { Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteMatchDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the user closes or confirms */
  onOpenChange: (open: boolean) => void;
  /** Drop match 2 from the day's draft */
  onConfirm: () => void;
}

/**
 * Confirm dropping match 2. It says plainly that nothing is lost until Save, because Save covers the
 * whole day rather than any single match.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the user closes or confirms
 * @param onConfirm - Drop match 2 from the day's draft
 * @returns The confirmation dialog
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
              <X />
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              <Trash2 />
              Xoá trận 2
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
