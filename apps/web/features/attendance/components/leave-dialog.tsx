"use client";

import { useState } from "react";
import { CalendarDays, MessageSquareText, Plane, User } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { vi } from "react-day-picker/locale";
import { vnDateKey } from "@guild/shared/lib";
import {
  ATTENDANCE_REASON_MAX_LENGTH,
  type Character,
} from "@guild/shared/schemas";

import { FieldCaption, FieldLabel } from "@/components/shared/field-label";
import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { toastSuccess } from "@/components/shared/toast";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useCreateLeave } from "../hooks/use-leaves";
import { fromDayKey, toDayKey } from "../lib/leave-date";
import { formatLeaveRange } from "../lib/leave-label";

const PICK_RANGE_ERROR = "Vui lòng chọn khoảng ngày nghỉ.";
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
  const [range, setRange] = useState<DateRange | undefined>();
  const [characterId, setCharacterId] = useState(ownCharacterId ?? "");
  const [reason, setReason] = useState("");
  const createLeave = useCreateLeave();

  // A member cannot file a leave that already ended; the server says so too, this only stops the
  // picker offering what would be refused. Admins fix past days, so for them nothing is disabled.
  const disabledDays = isAdmin
    ? undefined
    : { before: fromDayKey(vnDateKey(new Date())) };

  /**
   * Validate the form, then file the leave.
   * Throwing keeps the dialog up and shows the sentence, via `MutationForm`.
   * @returns A promise resolving once saved
   */
  async function submitLeave() {
    if (!range?.from) throw new Error(PICK_RANGE_ERROR);
    if (!characterId) throw new Error(PICK_MEMBER_ERROR);

    const startDate = toDayKey(range.from);
    const endDate = toDayKey(range.to ?? range.from);

    await createLeave.mutateAsync({
      characterId,
      startDate,
      endDate,
      reason: reason.trim() || null,
    });
    toastSuccess(`Đã khai nghỉ ${formatLeaveRange(startDate, endDate)}.`);
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
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="leave-member" icon={<User />}>
            Thành viên
          </FieldLabel>
          <select
            id="leave-member"
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Chọn thành viên</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldCaption icon={<CalendarDays />}>Khoảng ngày nghỉ</FieldCaption>
        <Calendar
          mode="range"
          locale={vi}
          selected={range}
          onSelect={setRange}
          disabled={disabledDays}
          className="self-center rounded-md border"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="leave-reason" icon={<MessageSquareText />}>
          Lý do
        </FieldLabel>
        <Input
          id="leave-reason"
          maxLength={ATTENDANCE_REASON_MAX_LENGTH}
          placeholder="Không bắt buộc"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </MutationForm>
  );
}
