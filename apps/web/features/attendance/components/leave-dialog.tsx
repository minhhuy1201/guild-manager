"use client";

import { useState } from "react";
import { MessageSquareText, Plane } from "lucide-react";
import { vnDateKey } from "@guild/shared/lib";
import {
  ATTENDANCE_REASON_MAX_LENGTH,
  type Character,
} from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { toastSuccess } from "@/components/shared/toast";
import { Textarea } from "@/components/ui/textarea";
import { useCreateLeave } from "../hooks/use-leaves";
import { formatLeaveRange } from "../lib/leave-label";
import { LeaveRangeField } from "./leave-range-field";
import { MemberPicker } from "./member-picker";

const PICK_DAYS_ERROR = "Vui lòng chọn ngày nghỉ.";
const PICK_MEMBER_ERROR = "Vui lòng chọn thành viên.";

interface LeaveDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog closes */
  onOpenChange: (open: boolean) => void;
  /** Admins may file for anyone; members only for themselves */
  canManageOthers: boolean;
  /** The viewer's own character, null for a rescue admin */
  ownCharacterId: string | null;
  /** Everyone an admin may file for; unused for a member */
  characters: Character[];
}

/**
 * The file-a-leave dialog: one range of days, an optional reason and, for an admin, who it is for.
 * Nobody, admins included, can pick a day before today.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog closes
 * @param canManageOthers - Whether the viewer may file for others
 * @param ownCharacterId - The viewer's own character
 * @param characters - Everyone an admin may file for
 * @returns The dialog
 */
export function LeaveDialog({
  open,
  onOpenChange,
  canManageOthers,
  ownCharacterId,
  characters,
}: LeaveDialogProps) {
  return (
    // The shell mounts the body only while open, so every visit starts from an empty form.
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <LeaveForm
        canManageOthers={canManageOthers}
        ownCharacterId={ownCharacterId}
        characters={characters}
        onDone={() => onOpenChange(false)}
      />
    </MutationDialogShell>
  );
}

interface LeaveFormProps extends Omit<LeaveDialogProps, "open" | "onOpenChange"> {
  /** Called on a successful save */
  onDone: () => void;
}

/**
 * The form body, split out so its state is created fresh on each open.
 * @param props - See `LeaveFormProps`
 * @returns The form
 */
function LeaveForm({
  canManageOthers,
  ownCharacterId,
  characters,
  onDone,
}: LeaveFormProps) {
  const [startDay, setStartDay] = useState("");
  const [endDay, setEndDay] = useState("");
  const [characterId, setCharacterId] = useState(ownCharacterId ?? "");
  const [reason, setReason] = useState("");
  const createLeave = useCreateLeave();

  // The server refuses a leave starting before today too; this only stops the calendar offering it.
  const today = vnDateKey(new Date());

  /**
   * Take the range the calendar reports.
   * @param start - First day, `YYYY-MM-DD`
   * @param end - Last day, `YYYY-MM-DD`
   */
  function handleRangeChange(start: string, end: string) {
    setStartDay(start);
    setEndDay(end);
  }

  /**
   * Validate the form, then file the leave.
   * Throwing keeps the dialog up and shows the sentence, via `MutationForm`.
   * @returns A promise resolving once saved
   */
  async function submitLeave() {
    if (!startDay) throw new Error(PICK_DAYS_ERROR);
    if (!characterId) throw new Error(PICK_MEMBER_ERROR);

    await createLeave.mutateAsync({
      characterId,
      startDate: startDay,
      endDate: endDay,
      reason: reason.trim() || null,
    });
    toastSuccess(`Đã khai nghỉ ${formatLeaveRange(startDay, endDay)}.`);
  }

  return (
    <MutationForm
      title="Xin nghỉ phép"
      submitLabel="Khai nghỉ"
      pendingLabel="Đang lưu…"
      submitIcon={<Plane />}
      fallbackError="Không khai nghỉ được, thử lại giúp mình."
      onDone={onDone}
      run={submitLeave}
    >
      {canManageOthers && (
        <MemberPicker
          id="leave-member"
          characters={characters}
          value={characterId}
          onChange={setCharacterId}
        />
      )}

      <LeaveRangeField
        id="leave-range"
        label="Ngày nghỉ"
        start={startDay}
        end={endDay}
        onChange={handleRangeChange}
        minDay={today}
      />

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="leave-reason" icon={<MessageSquareText />}>
          Lý do
        </FieldLabel>
        <Textarea
          id="leave-reason"
          rows={3}
          maxLength={ATTENDANCE_REASON_MAX_LENGTH}
          placeholder="Không bắt buộc"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </MutationForm>
  );
}
