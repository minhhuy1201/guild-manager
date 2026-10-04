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
import { LeaveDayField } from "./leave-day-field";
import { MemberPicker } from "./member-picker";

const PICK_START_ERROR = "Vui lòng chọn ngày bắt đầu nghỉ.";
const PICK_MEMBER_ERROR = "Vui lòng chọn thành viên.";

interface LeaveDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog closes */
  onOpenChange: (open: boolean) => void;
  /** Admins may file for anyone and pick days already past; members only for themselves */
  isAdmin: boolean;
  /** The viewer's own character, null for a rescue admin */
  ownCharacterId: string | null;
  /** Everyone an admin may file for; unused for a member */
  characters: Character[];
}

/**
 * The file-a-leave dialog: a range calendar, an optional reason and, for an admin, who it is for.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog closes
 * @param isAdmin - Whether the viewer may file for others and for past days
 * @param ownCharacterId - The viewer's own character
 * @param characters - Everyone an admin may file for
 * @returns The dialog
 */
export function LeaveDialog({
  open,
  onOpenChange,
  isAdmin,
  ownCharacterId,
  characters,
}: LeaveDialogProps) {
  return (
    // The shell mounts the body only while open, so every visit starts from an empty form.
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <LeaveForm
        isAdmin={isAdmin}
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
  isAdmin,
  ownCharacterId,
  characters,
  onDone,
}: LeaveFormProps) {
  const [startDay, setStartDay] = useState("");
  const [endDay, setEndDay] = useState("");
  const [characterId, setCharacterId] = useState(ownCharacterId ?? "");
  const [reason, setReason] = useState("");
  const createLeave = useCreateLeave();

  // A member cannot file a leave that already ended; the server says so too, this only stops the
  // pickers offering what would be refused. Admins fix past days, so for them nothing is bounded.
  const today = vnDateKey(new Date());
  const earliestDay = isAdmin ? undefined : today;

  /**
   * Pick the first day. The last day follows it unless it is already on or after it, so one day off
   * is a single pick and a longer leave only needs the end moved.
   * @param day - The picked first day, `YYYY-MM-DD`
   */
  function handleStartChange(day: string) {
    setStartDay(day);
    if (endDay === "" || endDay < day) setEndDay(day);
  }

  /**
   * Validate the form, then file the leave.
   * Throwing keeps the dialog up and shows the sentence, via `MutationForm`.
   * @returns A promise resolving once saved
   */
  async function submitLeave() {
    if (!startDay) throw new Error(PICK_START_ERROR);
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
      {isAdmin && (
        <MemberPicker
          id="leave-member"
          characters={characters}
          value={characterId}
          onChange={setCharacterId}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <LeaveDayField
          id="leave-start"
          label="Từ ngày"
          value={startDay}
          onChange={handleStartChange}
          minDay={earliestDay}
        />
        <LeaveDayField
          id="leave-end"
          label="Đến ngày"
          value={endDay}
          onChange={setEndDay}
          minDay={startDay || earliestDay}
        />
      </div>

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
