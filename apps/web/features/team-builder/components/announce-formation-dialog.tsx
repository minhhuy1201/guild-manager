"use client";

import { MessageCircle, Send, X } from "lucide-react";

import { FieldLabel } from "@/components/shared/field-label";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TeamNoticeOutcome } from "../hooks/use-formation-announce";
import { TeamNoticeReportView } from "./team-notice-report";

const NOTIFY_MEMBERS_ID = "announce-notify-members";

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
  /** Whether each placed member gets a direct message after the announcement */
  notifyMembers: boolean;
  /** Null until the announcement went out with the direct messages switched on */
  outcome: TeamNoticeOutcome | null;
  /** Called when the user toggles the direct messages */
  onNotifyMembersChange: (notify: boolean) => void;
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
 * @param notifyMembers - Whether each placed member gets a direct message too
 * @param outcome - How the direct messages ended, null before the announcement went out
 * @param onNotifyMembersChange - Called with the new value of the switch
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
  notifyMembers,
  outcome,
  onNotifyMembersChange,
  onOpenChange,
  onConfirm,
}: AnnounceFormationDialogProps) {
  if (outcome) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="grid gap-3">
            <DialogHeader>
              <DialogTitle>Đã gửi thông báo đội hình</DialogTitle>
            </DialogHeader>
            {outcome.report ? (
              <TeamNoticeReportView report={outcome.report} />
            ) : null}
            {outcome.error ? (
              <div className="grid gap-1 text-sm">
                <p className="text-destructive">{outcome.error}</p>
                <p className="text-muted-foreground">
                  Thông báo đã đăng vào channel bang chiến, chỉ phần nhắn riêng
                  chưa gửi được.
                </p>
              </div>
            ) : null}
            {outcome.report || outcome.error ? null : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Đang nhắn riêng từng người...
              </p>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={sending}
              >
                <X />
                Đóng
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
            sẽ được đăng vào channel bang chiến kèm thông báo tập hợp. Gửi xong,
            ngày này khoá điểm danh: thành viên không tự đổi câu trả lời được
            nữa, chỉ quản trị viên sửa hộ.
          </p>
          <div className="flex items-center gap-2">
            <Checkbox
              id={NOTIFY_MEMBERS_ID}
              checked={notifyMembers}
              onCheckedChange={(checked) => onNotifyMembersChange(checked)}
            />
            <FieldLabel htmlFor={NOTIFY_MEMBERS_ID} icon={<MessageCircle />}>
              Nhắn riêng từng người
            </FieldLabel>
          </div>
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
