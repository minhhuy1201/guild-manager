"use client";

import { MessageCircle, Pin, RefreshCw, Send, X } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { ANNOUNCEMENT_NOTE_MAX_CHARS } from "@guild/shared/schemas";
import type { TeamNoticeOutcome } from "../hooks/use-formation-announce";
import type { PreviewSession } from "../lib/discord-preview";
import { AnnouncePreview } from "./announce-preview";
import { TeamNoticeReportView } from "./team-notice-report";

const NOTIFY_MEMBERS_ID = "announce-notify-members";
const NOTE_ID = "announce-note";

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
  /** The battle day being announced, for the preview's wording */
  session: PreviewSession;
  /** The Announcement note typed so far */
  note: string;
  /** Null until the announcement went out with the direct messages switched on */
  outcome: TeamNoticeOutcome | null;
  /** Called when the user edits the note */
  onNoteChange: (note: string) => void;
  /** Called when the user toggles the direct messages */
  onNotifyMembersChange: (notify: boolean) => void;
  /** Message again: the members who were unsent, or everyone after a failed request */
  onRetry: () => void;
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
 * @param session - The battle day being announced, for the preview
 * @param note - The Announcement note typed so far
 * @param outcome - How the direct messages ended, null before the announcement went out
 * @param onNoteChange - Called with the new text of the note
 * @param onNotifyMembersChange - Called with the new value of the switch
 * @param onRetry - Message the members who were left out, or everyone after a failed request
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
  session,
  note,
  outcome,
  onNoteChange,
  onNotifyMembersChange,
  onRetry,
  onOpenChange,
  onConfirm,
}: AnnounceFormationDialogProps) {
  /**
   * Refuse a close while anything is in flight. The capture sheet unmounts with the dialog, and a
   * report that arrives after a close and reopen would replace the fresh form.
   * @param next - Whether the dialog is being opened
   */
  function handleOpenChange(next: boolean): void {
    if (!next && sending) return;

    onOpenChange(next);
  }

  if (outcome) {
    const canRetry = Boolean(outcome.error) || (outcome.report?.unsent.length ?? 0) > 0;
    const retryLabel = outcome.error ? "Thử lại" : "Nhắn lại người lỗi";

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={!sending}>
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
              {canRetry ? (
                <Button onClick={onRetry} disabled={sending}>
                  {sending ? <Spinner /> : <RefreshCw />}
                  {sending ? "Đang nhắn..." : retryLabel}
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!sending} className="sm:max-w-xl lg:max-w-4xl">
        <div className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Gửi thông báo đội hình?</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
            <div className="grid content-start gap-3 lg:col-span-2">
              <ul className="grid gap-1 text-sm tabular-nums">
                {filledCounts.map((filled, index) => (
                  <li key={index}>
                    {`Trận ${index + 1}: `}
                    {filled >= slotCount
                      ? `đủ ${filled}/${slotCount}`
                      : `thiếu ${slotCount - filled}/${slotCount}`}
                  </li>
                ))}
              </ul>
              <div className="grid gap-1.5">
                <FieldLabel htmlFor={NOTE_ID} icon={<Pin />}>
                  Lưu ý thêm
                </FieldLabel>
                <Textarea
                  id={NOTE_ID}
                  value={note}
                  maxLength={ANNOUNCEMENT_NOTE_MAX_CHARS}
                  disabled={sending}
                  placeholder="VD: Trận 2 đổi map, mọi người xem lại vị trí."
                  onChange={(event) => onNoteChange(event.target.value)}
                />
                <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                  <span>
                    {notifyMembers
                      ? "Hiện đầu tin trong kênh và mọi tin nhắn riêng."
                      : "Hiện đầu tin trong kênh."}
                  </span>
                  <span className="tabular-nums">
                    {note.length}/{ANNOUNCEMENT_NOTE_MAX_CHARS}
                  </span>
                </div>
              </div>
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
              <p className="text-sm text-muted-foreground">
                Gửi xong, ngày này khoá điểm danh: thành viên không tự đổi câu
                trả lời được nữa, chỉ người có quyền điểm danh hộ sửa được.
              </p>
              {blocked ? (
                <p className="text-sm text-destructive">
                  Đội hình còn thay đổi chưa lưu. Bấm Lưu trước rồi gửi lại.
                </p>
              ) : null}
            </div>
            <AnnouncePreview
              className="lg:col-span-3"
              session={session}
              imageCount={filledCounts.length}
              note={note}
              notifyMembers={notifyMembers}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={sending}
            >
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
