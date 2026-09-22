"use client";

import { Save } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LeaveGuard } from "../hooks/use-leave-guard";

/**
 * The question an in-app link gets while the drawing is unsaved: save and leave, leave without
 * saving, or stay.
 *
 * Closing the dialog any other way (Escape, the corner X, a click outside) means staying, and so
 * does nothing while the save is running - the answer is already on its way.
 * @param guard - The held destination and the three answers, from `useLeaveGuard`
 * @returns The leave dialog
 */
export function LeaveDialog({ guard }: { guard: LeaveGuard }) {
  return (
    <Dialog
      open={guard.leavingTo !== null}
      onOpenChange={(open) => {
        if (!open && !guard.saving) guard.stay();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rời trang khi chưa lưu?</DialogTitle>
          <DialogDescription>
            Bản vẽ có thay đổi chưa lưu. Rời trang mà không lưu thì các thay
            đổi đó mất.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={guard.saving}
            onClick={guard.stay}
          >
            Ở lại
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-destructive"
            disabled={guard.saving}
            onClick={guard.discard}
          >
            Bỏ thay đổi
          </Button>
          <Button
            type="button"
            disabled={guard.saving}
            onClick={() => void guard.saveAndLeave()}
          >
            {guard.saving ? <Spinner /> : <Save />}
            {guard.saving ? "Đang lưu…" : "Lưu rồi rời"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
