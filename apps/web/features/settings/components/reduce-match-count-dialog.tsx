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

interface ReduceMatchCountDialogProps {
  /** Whether the confirmation is showing */
  open: boolean;
  /** Called when the admin closes or refuses */
  onOpenChange: (open: boolean) => void;
  /** Called once the admin accepts losing the second formation */
  onConfirm: () => void;
}

/**
 * Confirm dropping to one match when a second formation is already laid out.
 *
 * A plain dialog rather than `ConfirmDeleteDialog`: the write belongs to the form waiting on this
 * answer, so this one only says yes or no. It runs no mutation of its own.
 * @param open - Whether the confirmation is showing
 * @param onOpenChange - Called when the admin closes or refuses
 * @param onConfirm - Called once the admin accepts losing the second formation
 * @returns The confirmation dialog
 */
export function ReduceMatchCountDialog({
  open,
  onOpenChange,
  onConfirm,
}: ReduceMatchCountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Hạ xuống 1 trận?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Hạ xuống 1 trận sẽ xoá đội hình đã xếp cho trận 2. Không khôi phục
            lại được.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X />
              Huỷ
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              <Trash2 />
              Hạ xuống 1 trận
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
