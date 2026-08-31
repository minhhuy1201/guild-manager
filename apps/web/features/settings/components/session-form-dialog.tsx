"use client";

import { useRef, useState } from "react";
import { AlarmClock, CalendarClock, Save, Swords } from "lucide-react";

import { deadlineCapFor, isWithinDeadlineCap } from "@guild/shared/lib";
import { DEADLINE_CAP_MESSAGE, type BattleSession } from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Input } from "@/components/ui/input";
import {
  useCreateSession,
  useUpdateSession,
} from "../hooks/use-session-mutations";
import { fromInputValue, toInputValue } from "../lib/datetime-input";
import { willDropFormation } from "../lib/match-count";
import { DateTimeField } from "./date-time-field";
import { MatchCountField } from "./match-count-field";
import { ReduceMatchCountDialog } from "./reduce-match-count-dialog";

// When adding a session, both time inputs prefill the most common values so only the date is left to pick.
const DEFAULT_BATTLE_TIME = "20:30";
// A day is played over two matches unless an admin says otherwise.
const DEFAULT_MATCH_COUNT = 2;
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
  const [matchCount, setMatchCount] = useState(
    session?.matchCount ?? DEFAULT_MATCH_COUNT
  );
  const [confirmingReduce, setConfirmingReduce] = useState(false);
  // Resolver of the confirmation currently on screen. A ref, not state: resolving it must not
  // re-render, and there is only ever one in flight because the submit is blocked while it waits.
  const confirmResolver = useRef<((accepted: boolean) => void) | null>(null);
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
   * Show the confirmation and wait for the admin's answer.
   * @returns A promise resolving to true when the admin accepted losing the second formation
   */
  function askToDropFormation(): Promise<boolean> {
    setConfirmingReduce(true);

    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
    });
  }

  /**
   * Close the confirmation, handing the waiting submit the admin's answer.
   * @param accepted - Whether the admin accepted losing the second formation
   */
  function settleConfirmation(accepted: boolean) {
    setConfirmingReduce(false);
    confirmResolver.current?.(accepted);
    confirmResolver.current = null;
  }

  /**
   * Validate both date/time fields, then create or update depending on what is being edited.
   * Throwing keeps the dialog up and shows the thrown sentence, via `MutationForm`.
   * @returns A promise resolving once saved
   */
  async function submitSession() {
    // The date/time field returns empty while no day is picked or the time box is still blank.
    if (!dateTime || (!isGuildWar && !deadline)) {
      throw new Error("Vui lòng chọn đủ ngày và giờ.");
    }

    // The date/time field is two masked text inputs, not a `datetime-local`, so there is no `max`
    // attribute for the browser to enforce — this check stands in for it.
    if (
      !isGuildWar &&
      !isWithinDeadlineCap(new Date(deadline), new Date(dateTime))
    ) {
      throw new Error(DEADLINE_CAP_MESSAGE);
    }

    // The request must not go out before the admin has seen what it destroys. Throwing on refusal
    // keeps the form up with everything they typed — `MutationForm` shows the sentence, and nothing
    // is saved.
    if (
      willDropFormation(session, matchCount) &&
      !(await askToDropFormation())
    ) {
      throw new Error("Chưa lưu — bạn đã huỷ việc hạ số trận.");
    }

    if (!session) {
      await createMutation.mutateAsync({
        dateTime: fromInputValue(dateTime),
        deadline: fromInputValue(deadline),
        matchCount,
        opponent: opponent.trim() || null,
      });
      return;
    }

    // A Guild War's deadline is system-owned; sending one gets a 400.
    await updateMutation.mutateAsync({
      id: session.id,
      input: {
        dateTime: fromInputValue(dateTime),
        ...(isGuildWar ? {} : { deadline: fromInputValue(deadline), matchCount }),
        opponent: isGuildWar ? null : opponent.trim() || null,
      },
    });
  }

  return (
    <>
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
        icon={<CalendarClock />}
        value={dateTime}
        onChange={handleDateTimeChange}
        defaultTime={DEFAULT_BATTLE_TIME}
      />

      <MatchCountField
        value={matchCount}
        isGuildWar={isGuildWar}
        onChange={setMatchCount}
      />

      {!isGuildWar && (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="session-opponent" icon={<Swords />}>
            Tên bang đối thủ
          </FieldLabel>
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
          <FieldLabel icon={<AlarmClock />}>Hạn chót điểm danh</FieldLabel>
          <p className="text-sm text-muted-foreground">
            17:00 Thứ 5 — cố định, không sửa được.
          </p>
        </div>
      ) : (
        <DateTimeField
          id="session-deadline"
          label="Hạn chót điểm danh"
          icon={<AlarmClock />}
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

      <ReduceMatchCountDialog
        open={confirmingReduce}
        onOpenChange={(open) => {
          if (!open) settleConfirmation(false);
        }}
        onConfirm={() => settleConfirmation(true)}
      />
    </>
  );
}
