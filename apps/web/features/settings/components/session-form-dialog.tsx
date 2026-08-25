"use client";

import { useState } from "react";
import { Save } from "lucide-react";

import { deadlineCapFor, isWithinDeadlineCap } from "@guild/shared/lib";
import { DEADLINE_CAP_MESSAGE, type BattleSession } from "@guild/shared/schemas";

import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateSession,
  useUpdateSession,
} from "../hooks/use-session-mutations";
import { fromInputValue, toInputValue } from "../lib/datetime-input";
import { DateTimeField } from "./date-time-field";

// When adding a session, both time inputs prefill the most common values so only the date is left to pick.
const DEFAULT_BATTLE_TIME = "20:30";
const DEFAULT_DEADLINE_TIME = "10:00";

interface SessionFormDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Session being edited; null means creating */
  session: BattleSession | null;
  /** Called when the dialog closes */
  onOpenChange: (open: boolean) => void;
}

/**
 * The create/edit session form. Picking a battle time auto-fills the suggested deadline, but only
 * while the user has not edited that field themselves — being overwritten mid-typing is the worst case.
 * @param open - Whether the dialog is open
 * @param session - Session being edited; null means creating
 * @param onOpenChange - Called when the dialog closes
 * @returns The form dialog
 */
export function SessionFormDialog({
  open,
  session,
  onOpenChange,
}: SessionFormDialogProps) {
  return (
    // The shell only mounts the body while open, so the form state resets on every open.
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <SessionForm session={session} onDone={() => onOpenChange(false)} />
    </MutationDialogShell>
  );
}

interface SessionFormProps {
  /** Session being edited; null means creating */
  session: BattleSession | null;
  /** Called on a successful save */
  onDone: () => void;
}

/**
 * A session's three fields: battle time, opponent guild name, deadline.
 * @param session - Session being edited; null means creating
 * @param onDone - Called on a successful save
 * @returns The create/edit session form
 */
function SessionForm({ session, onDone }: SessionFormProps) {
  const isGuildWar = session?.isGuildWar ?? false;

  const [dateTime, setDateTime] = useState(
    session ? toInputValue(session.dateTime) : ""
  );
  const [deadline, setDeadline] = useState(
    session ? toInputValue(session.deadline) : ""
  );
  const [opponent, setOpponent] = useState(session?.opponent ?? "");
  const [deadlineTouched, setDeadlineTouched] = useState(Boolean(session));

  const createMutation = useCreateSession();
  const updateMutation = useUpdateSession();

  /**
   * Change the battle time, also prefilling the deadline while the user has not edited it.
   * The prefilled value is the cap itself — the latest that is still valid.
   * @param value - New value of the battle time field
   */
  function handleDateTimeChange(value: string) {
    setDateTime(value);

    if (deadlineTouched || value === "") return;

    const cap = deadlineCapFor(new Date(value));
    setDeadline(toInputValue(cap.toISOString()));
  }

  /**
   * Validate both date/time fields, then create or update depending on what is being edited.
   * Throwing keeps the dialog up and shows the thrown sentence, via `MutationForm`.
   * @returns A promise resolving once saved
   */
  async function submitSession() {
    // The date/time field returns empty while the user is mid-typing or typed a date that does not exist.
    if (!dateTime || (!isGuildWar && !deadline)) {
      throw new Error(
        "Ngày giờ chưa hợp lệ. Nhập theo dạng dd/mm/yyyy và HH:mm."
      );
    }

    // The date/time field is two masked text inputs, not a `datetime-local`, so there is no `max`
    // attribute for the browser to enforce — this check stands in for it.
    if (
      !isGuildWar &&
      !isWithinDeadlineCap(new Date(deadline), new Date(dateTime))
    ) {
      throw new Error(DEADLINE_CAP_MESSAGE);
    }

    if (!session) {
      await createMutation.mutateAsync({
        dateTime: fromInputValue(dateTime),
        deadline: fromInputValue(deadline),
        opponent: opponent.trim() || null,
      });
      return;
    }

    // A Guild War's deadline is system-owned; sending one gets a 400.
    await updateMutation.mutateAsync({
      id: session.id,
      input: {
        dateTime: fromInputValue(dateTime),
        ...(isGuildWar ? {} : { deadline: fromInputValue(deadline) }),
        opponent: isGuildWar ? null : opponent.trim() || null,
      },
    });
  }

  return (
    <MutationForm
      title={session ? "Sửa ngày đánh" : "Thêm trận scrim"}
      submitLabel="Lưu"
      pendingLabel="Đang lưu…"
      submitIcon={<Save />}
      fallbackError="Không lưu được thay đổi."
      onDone={onDone}
      run={submitSession}
    >
      <DateTimeField
        id="session-date-time"
        label="Ngày giờ đánh"
        value={dateTime}
        onChange={handleDateTimeChange}
        defaultTime={DEFAULT_BATTLE_TIME}
      />

      {!isGuildWar && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-opponent">Tên bang đối thủ</Label>
          <Input
            id="session-opponent"
            maxLength={100}
            placeholder="Để trống nếu chưa chốt"
            value={opponent}
            onChange={(event) => setOpponent(event.target.value)}
          />
        </div>
      )}

      {isGuildWar ? (
        <div className="flex flex-col gap-1.5">
          <Label>Hạn chót điểm danh</Label>
          <p className="text-sm text-muted-foreground">
            17:00 Thứ 5 — cố định, không sửa được.
          </p>
        </div>
      ) : (
        <DateTimeField
          id="session-deadline"
          label="Hạn chót điểm danh"
          value={deadline}
          onChange={(value) => {
            setDeadlineTouched(true);
            setDeadline(value);
          }}
          defaultTime={DEFAULT_DEADLINE_TIME}
          description="Muộn nhất 10:00 sáng ngày đánh."
        />
      )}
    </MutationForm>
  );
}
