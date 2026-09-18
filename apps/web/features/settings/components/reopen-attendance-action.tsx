"use client";

import { useState } from "react";
import { LockOpen } from "lucide-react";
import type { BattleSession } from "@guild/shared/schemas";

import { RowActionButton } from "@/components/shared/action-buttons";
import { MutationDialog } from "@/components/shared/mutation-dialog";
import { toastSuccess } from "@/components/shared/toast";
import { useReopenAttendance } from "../hooks/use-session-mutations";

/** Tooltip and dialog wording, kept together so the button and its dialog cannot drift apart. */
const ACTION_LABEL = "Mở lại điểm danh";

/** Shown once the day is open to members again. */
const REOPENED = "Đã mở lại điểm danh. Nhớ gửi lại đội hình sau khi chốt.";

/** Shown when the request failed with nothing to say for itself. */
const FAILED = "Không mở lại được điểm danh ngày này.";

interface ReopenAttendanceActionProps {
  /** The day to reopen — its attendance was closed by an announcement */
  session: BattleSession;
}

/**
 * The way back from an announcement sent too early: reopen the day so members answer again.
 *
 * Owns its own mutation rather than taking a callback, like `DeleteSessionDialog` does — the row it
 * sits in is presentational, and the list above it has no reason to learn about this action.
 *
 * Confirmed rather than immediate, despite not being destructive: the guild has already read the
 * roster, and the consequence of the press is that the answers behind it may now change.
 *
 * Rendered only while `canReopenAttendance` holds, so there is no disabled state to explain: past
 * the deadline the day is closed whatever this button does, and the button is simply gone.
 *
 * @param session - The closed day to reopen
 * @returns The reopen button and its confirmation
 */
export function ReopenAttendanceAction({
  session,
}: ReopenAttendanceActionProps) {
  const [open, setOpen] = useState(false);
  const reopen = useReopenAttendance();

  return (
    <>
      <RowActionButton
        label={ACTION_LABEL}
        icon={<LockOpen className="size-4" />}
        onClick={() => setOpen(true)}
      />
      <MutationDialog
        open={open}
        onOpenChange={setOpen}
        title={`${ACTION_LABEL} ${session.label}?`}
        submitLabel="Mở lại"
        pendingLabel="Đang mở…"
        submitIcon={<LockOpen />}
        fallbackError={FAILED}
        showCancel
        run={async () => {
          await reopen.mutateAsync(session.id);
          toastSuccess(REOPENED);
        }}
      >
        <p className="text-sm">
          Đội hình ngày này đã gửi lên Discord nên điểm danh đang khoá. Mở lại
          thì thành viên đổi được câu trả lời, khác đi so với đội hình cả bang
          vừa đọc — xếp lại rồi gửi lần nữa sau khi chốt.
        </p>
      </MutationDialog>
    </>
  );
}
