"use client";

import { Send, X } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AnnounceFormationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** How many slots each match of the day has filled, in match order */
  filledCounts: number[];
  /** How many slots one match holds in total */
  slotCount: number;
  /** The day still has unsaved changes — sending is refused */
  blocked: boolean;
  /** Whether the announcement is in flight */
  sending: boolean;
  /** Called when the user closes the dialog */
  onOpenChange: (open: boolean) => void;
  /** Capture the line-ups and send the announcement */
  onConfirm: () => void;
}

/**
 * Confirm posting the day's line-up to Discord.
 *
 * It counts the empty slots per match rather than for the day as a whole: two matches sharing one
 * number hides which of them is the one still short of people.
 *
 * A day with unsaved changes cannot be announced at all — the images would show a line-up the
 * server does not have, and nothing downstream could ever reconcile the two.
 *
 * @param open - Whether the dialog is open
 * @param filledCounts - Slots filled per match, in match order
 * @param slotCount - Slots one match holds in total
 * @param blocked - Whether unsaved changes are refusing the send
 * @param sending - Whether the announcement is in flight
 * @param onOpenChange - Called when the user closes the dialog
 * @param onConfirm - Capture and send
 * @returns The confirmation dialog
 */
export function AnnounceFormationDialog({
  open,
  filledCounts,
  slotCount,
  blocked,
  sending,
  onOpenChange,
  onConfirm,
}: AnnounceFormationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Gửi thông báo đội hình?</DialogTitle>
          </DialogHeader>
          <ul className="grid gap-1 text-sm">
            {filledCounts.map((filled, index) => (
              <li key={index}>
                {`Trận ${index + 1}: `}
                {filled >= slotCount
                  ? `đủ ${filled}/${slotCount}`
                  : `thiếu ${slotCount - filled}/${slotCount}`}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Ảnh đội hình của {filledCounts.length === 1 ? "trận" : "cả hai trận"}{" "}
            sẽ được đăng vào channel bang chiến kèm thông báo tập hợp.
          </p>
          {blocked ? (
            <p className="text-sm text-destructive">
              Đội hình còn thay đổi chưa lưu. Bấm Lưu trước rồi gửi lại.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X />
              Huỷ
            </Button>
            <Button onClick={onConfirm} disabled={blocked || sending}>
              {sending ? <Spinner /> : <Send />}
              {sending ? "Đang gửi..." : "Gửi thông báo"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
