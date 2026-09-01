"use client";

import { ClipboardCopy, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CopyFormationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Label of the day being copied from, null while there is no source */
  sourceLabel: string | null;
  /** Called when the user closes or confirms */
  onOpenChange: (open: boolean) => void;
  /** Overwrite the open match with the copied line-up */
  onConfirm: () => void;
}

/**
 * Confirm overwriting a match that already holds people. It names the source and
 * says plainly that nothing is written until Save, because the copy only lands
 * in the draft.
 * @param open - Whether the dialog is open
 * @param sourceLabel - Label of the day being copied from
 * @param onOpenChange - Called when the user closes or confirms
 * @param onConfirm - Overwrite the open match
 * @returns The confirmation dialog
 */
export function CopyFormationDialog({
  open,
  sourceLabel,
  onOpenChange,
  onConfirm,
}: CopyFormationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Ghi đè đội hình của trận đang mở?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Toàn bộ đội hình đang xếp sẽ được thay bằng đội hình của{" "}
            <span className="font-medium">{sourceLabel}</span>, bỏ những người
            không điểm danh &quot;Có&quot; cho trận này. Chưa có gì được lưu cho
            tới khi bạn bấm Lưu.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X />
              Huỷ
            </Button>
            <Button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              <ClipboardCopy />
              Copy đè
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
