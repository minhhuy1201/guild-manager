"use client";

import { useState } from "react";
import { Swords, X } from "lucide-react";
import { attendanceLabel } from "@guild/shared/enums";
import {
  ATTENDANCE_REASON_MAX_LENGTH,
  type BattleSession,
} from "@guild/shared/schemas";

import { EmptyState } from "@/components/shared/empty-state";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { SessionLabel } from "@/components/shared/session-label";
import { Spinner } from "@/components/shared/spinner";
import { toastError, toastSuccess } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/features/auth";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
import {
  useAttendanceRecords,
  useBattleSessions,
  useMarkAttendance,
} from "../hooks/use-attendance";
import { getSessionSubtitle } from "../lib/session-subtitle";
import { recordKey } from "../lib/record-key";

/** The two options of an attendance entry, in display order. */
const CHOICES = [true, false];

/** Placeholder rows while loading — as many as a week usually has sessions. */
const SKELETON_ROWS = 3;

/** Shown when the write fails with something other than an `ApiError`. */
const FALLBACK_ERROR_MESSAGE = "Không điểm danh được, thử lại giúp mình.";

/**
 * Placeholder of the reason field. It names the key rather than describing the field, because the
 * field is the only control on this screen that a click does not save.
 */
const REASON_PLACEHOLDER = "Lý do vắng — Enter để lưu";

/** The whole contract of the reason field, shown as a tooltip and as the native `title`. */
const REASON_HINT =
  "Nhập lý do rồi bấm Enter để lưu. Bỏ trống cũng được, Esc để huỷ thay đổi.";

/**
 * Surface of a day tile, by the answer recorded for it: the tile says its own state before a single
 * button is read. Amber is the one tone the design system has no token for — it means "this day is
 * still waiting for you", which is neither a success nor a failure.
 *
 * The border carries the tone at full strength and the background at a twentieth of it: a whole
 * week of tiles is a lot of surface, and a fill as strong as the border would drown the text and
 * the buttons sitting on it.
 *
 * This is why the member tile does not take `sessionTintClass` the way the week timeline does — the
 * answer owns both the border and the fill, and the Guild War is still named by `SessionLabel`'s
 * swords and by the tinted tile in the timeline right above.
 */
const TILE_TONE = {
  co: "border-emerald-500 bg-emerald-500/5",
  khong: "border-destructive bg-destructive/5",
  chuaTraLoi: "border-amber-500 bg-amber-500/5",
} as const;

/**
 * The member's attendance screen: their own character only, one row per session.
 * @returns The personal attendance card
 */
export function MemberAttendanceCard() {
  const { data: session } = useSession();
  const { data: sessions } = useBattleSessions();
  const { data: records } = useAttendanceRecords();
  const { mutateAsync: mark, isPending, variables } = useMarkAttendance();
  const board = useAttendanceBoard();

  const battleSessions = sessions ?? [];
  const recordMap = records ?? {};
  const character = session?.character ?? null;

  useDeadlineRefresh(battleSessions);

  /**
   * Record one answer and report the outcome in a toast.
   * A member marks one session at a time, so the mutation's own `variables` are enough to say which
   * button is waiting — no local saving state like the admin grid, which fires several writes at once.
   * @param battleSession - Session being answered
   * @param isPresent - The answer just pressed
   * @returns A promise settled once the toast is shown
   */
  const handleMark = async (
    battleSession: BattleSession,
    isPresent: boolean
  ): Promise<void> => {
    if (!character) return;

    try {
      await mark({
        characterId: character.id,
        sessionId: battleSession.id,
        isPresent,
      });
      toastSuccess(
        `Đã điểm danh "${attendanceLabel(isPresent)}" cho ${battleSession.label}.`
      );
    } catch (error) {
      toastError(
        error instanceof ApiError ? error.message : FALLBACK_ERROR_MESSAGE
      );
    }
  };

  /**
   * Save the reason for a "Không" answer and report the outcome in a toast.
   * It reuses the attendance write, so the entry keeps one code path — and one deadline check.
   * @param battleSession - Session the reason belongs to
   * @param reason - Text typed by the member
   * @returns A promise settled once the toast is shown
   */
  const handleSaveReason = async (
    battleSession: BattleSession,
    reason: string
  ): Promise<void> => {
    if (!character) return;

    try {
      await mark({
        characterId: character.id,
        sessionId: battleSession.id,
        isPresent: false,
        reason: reason.trim() || null,
      });
      toastSuccess(`Đã lưu lý do cho ${battleSession.label}.`);
    } catch (error) {
      toastError(
        error instanceof ApiError ? error.message : FALLBACK_ERROR_MESSAGE
      );
    }
  };

  return (
    <QueryBoundary
      state={board}
      skeleton={
        <Card>
          <CardContent className="flex flex-col gap-3 py-6">
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      }
    >
      {character === null ? (
        <Card>
          <CardContent>
            <EmptyState message="Tài khoản chưa được gán nhân vật, liên hệ quản trị viên." />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Điểm danh của {character.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {battleSessions.length === 0 ? (
              <EmptyState message="Tuần này chưa có trận nào." />
            ) : (
              // The week timeline's own grid, so a day sits in the same column in both cards and
              // the eye travels straight down from the day to its two buttons.
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {battleSessions.map((battleSession) => {
                  const current =
                    recordMap[recordKey(character.id, battleSession.id)]
                      ?.isPresent ?? null;
                  const savedReason =
                    recordMap[recordKey(character.id, battleSession.id)]
                      ?.reason ?? "";
                  // `null` is "not answered yet", and `false` is a real answer — so the branch on
                  // null has to come first.
                  const tileTone =
                    current === null
                      ? TILE_TONE.chuaTraLoi
                      : current
                        ? TILE_TONE.co
                        : TILE_TONE.khong;

                  return (
                    <div
                      key={battleSession.id}
                      className={cn(
                        "flex flex-col gap-1.5 rounded-lg border p-3",
                        tileTone
                      )}
                    >
                      <SessionLabel session={battleSession} size="md" />
                      {getSessionSubtitle(battleSession) && (
                        <p className="text-sm text-muted-foreground">
                          {getSessionSubtitle(battleSession)}
                        </p>
                      )}

                      {/* `mt-auto` pins the answers to the bottom, so a day with a longer
                          subtitle does not leave its buttons higher than its neighbour's. */}
                      <div className="mt-auto flex flex-col gap-2 pt-2">
                        {battleSession.isDeadlinePassed ? (
                          <>
                            <span className="text-center text-sm text-muted-foreground">
                              Đã khoá
                            </span>
                            {savedReason !== "" && (
                              <span className="text-center text-sm text-muted-foreground italic">
                                Lý do: {savedReason}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {CHOICES.map((isPresent) => (
                              <AttendanceChoiceButton
                                key={String(isPresent)}
                                isPresent={isPresent}
                                isSelected={current === isPresent}
                                isSaving={
                                  isPending &&
                                  variables?.sessionId === battleSession.id &&
                                  variables.isPresent === isPresent
                                }
                                // Both answers of every day wait: a second write while one is in
                                // flight would leave the spinner on the wrong button.
                                disabled={isPending}
                                onSelect={() =>
                                  void handleMark(battleSession, isPresent)
                                }
                              />
                            ))}
                            {current === false && (
                              // Remounting on the stored value resets the field once a save lands,
                              // while a failed save keeps the typed text — the stored value did not
                              // change, so there is no remount.
                              <AbsenceReasonInput
                                key={`${battleSession.id}:${savedReason}`}
                                savedReason={savedReason}
                                disabled={isPending}
                                onSubmit={(reason) =>
                                  void handleSaveReason(battleSession, reason)
                                }
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </QueryBoundary>
  );
}

/**
 * Colours of the picked answer. Emerald "Có" and destructive "Không" are the marks the admin grid's
 * `AttendanceToggle` already uses (frontend.md §6), so both screens read as one app.
 */
const SELECTED_CLASS = {
  co: "border-transparent bg-emerald-500 text-white hover:bg-emerald-500/90 dark:bg-emerald-600",
  khong: "border-transparent bg-destructive text-white hover:bg-destructive/90",
} as const;

interface AttendanceChoiceButtonProps {
  /** The answer this button records */
  isPresent: boolean;
  /** This answer is the one currently recorded */
  isSelected: boolean;
  /** This button's write is in flight — it shows a spinner in place of its icon */
  isSaving: boolean;
  /** No answer may be pressed right now (another write is running) */
  disabled: boolean;
  onSelect: () => void;
}

/**
 * One answer of the member card: "Có" with the swords icon, "Không" with the cross.
 * @returns The answer button
 */
function AttendanceChoiceButton({
  isPresent,
  isSelected,
  isSaving,
  disabled,
  onSelect,
}: AttendanceChoiceButtonProps) {
  const Icon = isPresent ? Swords : X;

  return (
    <Button
      variant="outline"
      aria-pressed={isSelected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        isSelected && (isPresent ? SELECTED_CLASS.co : SELECTED_CLASS.khong)
      )}
    >
      {/*
        One slot for both states: the button's left padding keys off `data-icon`, and the icon and
        the spinner are pinned to the same size, so swapping them mid-write moves nothing.
      */}
      <span data-icon="inline-start" className="flex items-center">
        {isSaving ? <Spinner /> : <Icon className="size-4" aria-hidden />}
      </span>
      {attendanceLabel(isPresent)}
    </Button>
  );
}

interface AbsenceReasonInputProps {
  /** Reason already stored for this session — "" when none was given */
  savedReason: string;
  /** A write is already in flight, so this one may not start */
  disabled: boolean;
  /** Send the typed reason; the caller performs the write and shows the toast */
  onSubmit: (reason: string) => void;
}

/**
 * The one-line reason that goes with a "Không" answer.
 *
 * Enter sends and Escape restores what is stored — blur does neither: leaving the field is something
 * that happens by accident, and here it would fire a request rather than touch a local draft the way
 * the team builder's name field does. Nothing on screen would say that, so the placeholder names the
 * key and the tooltip spells out the whole contract, Escape included.
 * @returns The reason input
 */
function AbsenceReasonInput({
  savedReason,
  disabled,
  onSubmit,
}: AbsenceReasonInputProps) {
  const [value, setValue] = useState(savedReason);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Input
            value={value}
            disabled={disabled}
            aria-label="Lý do vắng"
            placeholder={REASON_PLACEHOLDER}
            title={REASON_HINT}
            maxLength={ATTENDANCE_REASON_MAX_LENGTH}
            className="h-8 text-sm"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit(value);
                return;
              }
              if (event.key === "Escape") {
                setValue(savedReason);
                event.currentTarget.blur();
              }
            }}
          />
        }
      />
      <TooltipContent>{REASON_HINT}</TooltipContent>
    </Tooltip>
  );
}
