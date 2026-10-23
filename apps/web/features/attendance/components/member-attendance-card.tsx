"use client";

import { Clock, History, Lock, Swords, X } from "lucide-react";
import { attendanceLabel } from "@guild/shared/enums";
import type { AttendanceRecord, BattleSession } from "@guild/shared/schemas";

import { DateRange } from "@/components/shared/date-range";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryBoundary } from "@/components/shared/query-boundary";
import {
  SessionDeadline,
  SessionLabel,
  sessionTintClass,
} from "@/components/shared/session-label";
import { Spinner } from "@/components/shared/spinner";
import { StatusBadge } from "@/components/shared/status-badge";
import { toastError, toastSuccess } from "@/components/shared/toast";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { SectionTitle } from "@/components/shared/section-title";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth";
import { ApiError } from "@/lib/api-client";
import { REVEAL_CLASS, revealStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useBattleClock } from "../hooks/use-battle-clock";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
import {
  useAttendanceRecords,
  useBattleSessions,
  useCurrentWeek,
  useMarkAttendance,
} from "../hooks/use-attendance";
import { splitFoughtBattles } from "../lib/fought-battles";
import { getSessionSubtitle } from "../lib/session-subtitle";
import { recordKey } from "../lib/record-key";
import { countUnanswered } from "../lib/unanswered";
import { AbsenceReasonInput } from "./absence-reason-input";
import { AttendanceStatusIcon } from "./attendance-status-icon";
import { FoughtBattlesFold } from "./fought-battles-fold";
import { UnansweredIcon } from "./unanswered-icon";

/** The two options of an attendance entry, in display order. */
const CHOICES = [true, false];

/** Placeholder rows while loading — as many as a week usually has sessions. */
const SKELETON_ROWS = 3;

/**
 * The week's strip: tiles share the card's full width whatever their number - one match is one wide
 * tile, four are four narrower ones - and wrap to the next line once a tile would get narrower than
 * the minimum. `min(100%, …)` keeps that minimum from forcing a sideways scroll on a small phone.
 */
const TILE_STRIP =
  "grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))]";

/** Shown when the write fails with something other than an `ApiError`. */
const FALLBACK_ERROR_MESSAGE = "Không điểm danh được, thử lại giúp mình.";

/** Shown in place of the summary to an account no admin has linked to a character yet. */
const NO_CHARACTER_MESSAGE =
  "Tài khoản chưa được gán nhân vật, liên hệ ADMIN.";

/**
 * Surface of a day tile, by the answer recorded for it: the tile says its own state before a single
 * button is read. Amber is the one tone the design system has no token for — it means "this day is
 * still waiting for you", which is neither a success nor a failure.
 *
 * The border carries the tone at full strength and the background at a twentieth of it: a whole
 * week of tiles is a lot of surface, and a fill as strong as the border would drown the text and
 * the buttons sitting on it.
 *
 * This is why an answering tile does not take `sessionTintClass` - the answer owns both the border
 * and the fill, and the Guild War is still named by `SessionLabel`'s swords. A tile with nobody to
 * answer for (no character linked) has no answer to show, so it takes the tint instead.
 */
const TILE_TONE = {
  co: "border-emerald-500 bg-emerald-500/5",
  khong: "border-destructive bg-destructive/5",
  chuaTraLoi: "border-amber-500 bg-amber-500/5",
} as const;

/** The mutation's current variables - which session and which answer are being written. */
type PendingWrite = { sessionId: string; isPresent: boolean } | undefined;

/**
 * The member's week: the schedule of the open week and their own answers, in one card. It used to
 * be two grids of the same day tiles - a read-only timeline, then this card with the buttons - so
 * a member opened the page onto the same week twice. Now every tile carries the day, its deadline,
 * whether it is still open, and the answer.
 *
 * An account with no character linked still needs the schedule, so it sees the same tiles read-only
 * under a line telling it to ask an admin.
 * @returns The "Tuần này của bạn" card
 */
export function MemberAttendanceCard() {
  const { data: session } = useSession();
  const { data: week } = useCurrentWeek();
  const { data: sessions } = useBattleSessions();
  const { data: records } = useAttendanceRecords();
  const { mutateAsync: mark, isPending, variables } = useMarkAttendance();
  const recoverSession = useSessionRecovery();
  const board = useAttendanceBoard();

  const battleSessions = sessions ?? [];
  const recordMap = records ?? {};
  const character = session?.character ?? null;

  useDeadlineRefresh(battleSessions);
  const now = useBattleClock(battleSessions);
  const { upcoming, fought } = splitFoughtBattles(battleSessions, now);

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
      // A 401 here is an access token that ran out while the tab sat open; only a navigation can
      // renew it, so saying "lỗi" and stopping would be wrong.
      if (recoverSession(error)) return;
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
      // A 401 here is an access token that ran out while the tab sat open; only a navigation can
      // renew it, so saying "lỗi" and stopping would be wrong.
      if (recoverSession(error)) return;
      toastError(
        error instanceof ApiError ? error.message : FALLBACK_ERROR_MESSAGE
      );
    }
  };

  /**
   * One day's tile, wired to the card's writes.
   * @param battleSession - Battle the tile shows
   * @param index - Position inside its group, for the staggered entrance
   * @param isFought - Whether the battle is over and folded
   * @returns The tile
   */
  const renderTile = (
    battleSession: BattleSession,
    index: number,
    isFought: boolean
  ) => (
    <DayTile
      key={battleSession.id}
      battleSession={battleSession}
      index={index}
      isFought={isFought}
      record={
        character
          ? recordMap[recordKey(character.id, battleSession.id)]
          : undefined
      }
      canAnswer={character !== null}
      isPending={isPending}
      pendingWrite={variables}
      onMark={(isPresent) => void handleMark(battleSession, isPresent)}
      onSaveReason={(reason) => void handleSaveReason(battleSession, reason)}
    />
  );

  return (
    <QueryBoundary
      state={board}
      skeleton={
        <Card variant="raised">
          <CardContent className={cn(TILE_STRIP, "py-6")}>
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <Skeleton key={index} className="h-40 w-full rounded-inner" />
            ))}
          </CardContent>
        </Card>
      }
    >
      <Card variant="raised">
        <CardHeader>
          <SectionTitle>Tuần này của bạn</SectionTitle>
          {/* No separator between the two: on a phone the pair wraps, and a dot left hanging at
              the end of the first line reads as a typo. */}
          <CardDescription className="flex flex-wrap items-center gap-x-3">
            {character ? <span>{character.name}</span> : null}
            {week ? (
              <DateRange start={week.weekStart} end={week.weekEnd} withYear />
            ) : null}
          </CardDescription>
          {battleSessions.length > 0 ? (
            <WeekSummary
              unanswered={
                character
                  ? countUnanswered(battleSessions, recordMap, character.id)
                  : null
              }
            />
          ) : null}
        </CardHeader>
        <CardContent>
          {battleSessions.length === 0 ? (
            <EmptyState message="Tuần này chưa có trận nào." />
          ) : (
            <div className="flex flex-col gap-4">
              <div className={TILE_STRIP}>
                {upcoming.map((battleSession, index) =>
                  renderTile(battleSession, index, false)
                )}
              </div>
              {fought.length > 0 ? (
                <FoughtBattlesFold
                  count={fought.length}
                  summary={
                    character ? (
                      <FoughtAnswers
                        battles={fought}
                        recordMap={recordMap}
                        characterId={character.id}
                      />
                    ) : null
                  }
                >
                  <div className={TILE_STRIP}>
                    {fought.map((battleSession, index) =>
                      renderTile(battleSession, index, true)
                    )}
                  </div>
                </FoughtBattlesFold>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </QueryBoundary>
  );
}

interface WeekSummaryProps {
  /** Open battles the member has not answered; null when no character is linked */
  unanswered: number | null;
}

/**
 * The line under the card's title: what is left to do this week, or why there is nothing to do.
 * @param unanswered - Open battles left to answer, null when no character is linked
 * @returns The summary line
 */
function WeekSummary({ unanswered }: WeekSummaryProps) {
  if (unanswered === null) {
    return <p className="text-sm text-muted-foreground">{NO_CHARACTER_MESSAGE}</p>;
  }

  if (unanswered === 0) {
    return <p className="text-sm">Bạn đã điểm danh đủ tuần này.</p>;
  }

  return (
    <p className="text-sm">
      Bạn còn <strong className="font-semibold">{unanswered} trận</strong> chưa
      điểm danh.
    </p>
  );
}

interface DayTileProps {
  /** Battle this tile shows */
  battleSession: BattleSession;
  /** Position in its group, for the staggered entrance */
  index: number;
  /** The battle is over: the tile fades and says "Đã đánh" instead of its lock */
  isFought: boolean;
  /** The member's recorded answer, undefined when there is none or no character */
  record: Pick<AttendanceRecord, "isPresent" | "reason"> | undefined;
  /** Whether a character is linked, so there is someone to answer for */
  canAnswer: boolean;
  /** Whether any attendance write is in flight */
  isPending: boolean;
  /** Which session and answer that write is for */
  pendingWrite: PendingWrite;
  /** Record an answer for this battle */
  onMark: (isPresent: boolean) => void;
  /** Save the absence reason for this battle */
  onSaveReason: (reason: string) => void;
}

/**
 * One battle day of the week: its name, subtitle, deadline and open/locked badge, then the
 * member's two answers while the day is open - or the reason already given once it is locked.
 * @param battleSession - Battle this tile shows
 * @param index - Position in its group
 * @param isFought - Whether the battle is over
 * @param record - The member's recorded answer
 * @param canAnswer - Whether a character is linked
 * @param isPending - Whether a write is in flight
 * @param pendingWrite - Which session and answer that write is for
 * @param onMark - Record an answer
 * @param onSaveReason - Save the absence reason
 * @returns The tile
 */
function DayTile({
  battleSession,
  index,
  isFought,
  record,
  canAnswer,
  isPending,
  pendingWrite,
  onMark,
  onSaveReason,
}: DayTileProps) {
  const current = record?.isPresent ?? null;
  const savedReason = record?.reason ?? "";
  const isLocked = battleSession.isAttendanceClosed;
  const subtitle = getSessionSubtitle(battleSession);
  // `null` is "not answered yet", and `false` is a real answer - so the branch on null has to come
  // first.
  const tone = !canAnswer
    ? sessionTintClass(battleSession.isGuildWar)
    : current === null
      ? TILE_TONE.chuaTraLoi
      : current
        ? TILE_TONE.co
        : TILE_TONE.khong;

  return (
    // The wrapper is the size container: a tile that ends up wide (one match, or two on a big
    // screen) lays its info and its answers side by side instead of stretching the buttons.
    <div
      className={cn("@container/tile", REVEAL_CLASS)}
      style={revealStyle(index)}
    >
      <div
        data-slot="day-tile"
        className={cn(
          "flex h-full flex-col gap-4 rounded-inner border-2 p-4",
          "@xl/tile:flex-row @xl/tile:items-center @xl/tile:justify-between",
          tone,
          isFought && "opacity-70"
        )}
      >
        <div className="flex flex-col gap-1.5">
          <SessionLabel session={battleSession} size="md" />
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          <SessionDeadline session={battleSession} />
          <div>
            {isFought ? (
              <StatusBadge tone="muted">
                <History className="size-3.5" />
                Đã đánh
              </StatusBadge>
            ) : isLocked ? (
              <StatusBadge tone="danger">
                <Lock className="size-3.5" />
                Đã khoá
              </StatusBadge>
            ) : (
              <StatusBadge tone="success">
                <Clock className="size-3.5" />
                Còn hạn
              </StatusBadge>
            )}
          </div>
        </div>

        {/* `mt-auto` pins the answers to the bottom, so a day with a longer subtitle does not
            leave its buttons higher than its neighbour's. */}
        {canAnswer ? (
          <div className="mt-auto grid grid-cols-2 gap-2 @xl/tile:mt-0 @xl/tile:w-96 @xl/tile:shrink-0">
            {isLocked ? (
              savedReason !== "" && (
                <span className="col-span-2 text-center text-sm text-muted-foreground italic">
                  Lý do: {savedReason}
                </span>
              )
            ) : (
              <>
                {CHOICES.map((isPresent) => (
                  <AttendanceChoiceButton
                    key={String(isPresent)}
                    isPresent={isPresent}
                    isSelected={current === isPresent}
                    isSaving={
                      isPending &&
                      pendingWrite?.sessionId === battleSession.id &&
                      pendingWrite.isPresent === isPresent
                    }
                    // Both answers of every day wait: a second write while one is in flight would
                    // leave the spinner on the wrong button.
                    disabled={isPending}
                    onSelect={() => onMark(isPresent)}
                  />
                ))}
                {current === false && (
                  // Remounting on the stored value resets the field once a save lands, while a
                  // failed save keeps the typed text - the stored value did not change, so there
                  // is no remount.
                  <div className="col-span-2">
                    <AbsenceReasonInput
                      key={`${battleSession.id}:${savedReason}`}
                      savedReason={savedReason}
                      disabled={isPending}
                      onSubmit={onSaveReason}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface FoughtAnswersProps {
  /** The fought battles, in the week's order */
  battles: BattleSession[];
  /** Recorded answers, keyed by `recordKey` */
  recordMap: Record<string, AttendanceRecord>;
  /** Character whose answers are shown */
  characterId: string;
}

/**
 * The member's answer to each fought battle, as the marks the tiles use, so the folded bar still
 * answers "did I go?" at a glance.
 * @param battles - The fought battles
 * @param recordMap - Recorded answers
 * @param characterId - Character whose answers are shown
 * @returns One mark per battle
 */
function FoughtAnswers({ battles, recordMap, characterId }: FoughtAnswersProps) {
  return (
    <span className="flex items-center gap-1.5">
      {battles.map((battle) => {
        const record = recordMap[recordKey(characterId, battle.id)];

        return record ? (
          <AttendanceStatusIcon
            key={battle.id}
            isPresent={record.isPresent}
            source={record.source}
            className="size-6"
          />
        ) : (
          <UnansweredIcon key={battle.id} className="size-6" />
        );
      })}
    </span>
  );
}

/**
 * Colours of the picked answer. Emerald "Có" and destructive "Không" are the marks the admin grid's
 * cells already show (frontend.md §6), so both screens read as one app.
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
      size="lg"
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
