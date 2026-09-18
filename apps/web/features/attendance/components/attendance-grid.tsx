"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDashed } from "lucide-react";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "@guild/shared/schemas";

import { DataTable } from "@/components/shared/data-table";
import { SessionLabel } from "@/components/shared/session-label";
import { UnsavedChangesBar } from "@/components/shared/unsaved-changes-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { errorMessageOf } from "@/lib/error-message";
import { cn } from "@/lib/utils";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
import {
  useAttendanceRecords,
  useBattleSessions,
  useCharacters,
  useFilteredCharacters,
  useMarkAttendance,
} from "../hooks/use-attendance";
import { countDayTotals, type DayTotals } from "../lib/day-totals";
import { clickCell, type GridDraft } from "../lib/grid-draft";
import { recordKey } from "../lib/record-key";
import { getSessionSubtitle } from "../lib/session-subtitle";
import { STICKY_NAME_COLUMN } from "../lib/sticky-columns";
import { countUnanswered } from "../lib/unanswered";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";
import { AttendanceFilters } from "./attendance-filters";
import { AttendanceRow } from "./attendance-row";
import { AttendanceStatusIcon } from "./attendance-status-icon";

/**
 * Day columns drawn while the week's schedule is still loading. A guess, not a rule —
 * it only has to be a plausible week so the header does not visibly resize when the
 * real sessions land.
 */
const PLACEHOLDER_DAY_COLUMNS = 4;

/** A guild is a few dozen members: one page of the grid should hold all of them. */
const PAGE_SIZE = 50;

/** Mobile hint above the grid. */
const SWIPE_HINT = "Vuốt ngang để xem các ngày đánh khác - cột tên luôn hiện.";

/** Shown when a save fails with something that carries no sentence of its own. */
const SAVE_FALLBACK_ERROR = "Không lưu được điểm danh, thử lại giúp mình.";

// Stable stand-ins while a query has no data. A fallback built per render would change the
// filtered list's identity on every render, and the pagination resets its page on that identity.
const EMPTY_SESSIONS: BattleSession[] = [];
const EMPTY_RECORDS: Record<string, AttendanceRecord> = {};
const EMPTY_ROSTER: Character[] = [];
const EMPTY_DRAFT: GridDraft = {};

interface AttendanceGridProps {
  /** The viewer is an admin - they may change any answer, past deadlines included. */
  isAdmin: boolean;
}

/**
 * The attendance grid: one row per character, one column per battle day, and a totals row under
 * the heads counting the whole guild's answers per day.
 *
 * An admin changes answers by pressing the cells themselves, on as many rows as they like; the
 * changes collect in one draft over the whole grid and go out together from the save bar. A member
 * reads the same grid and answers for their own character in `MemberAttendanceCard`.
 * @param isAdmin - Whether the viewer is an admin
 * @returns The attendance table card
 */
export function AttendanceGrid({ isAdmin }: AttendanceGridProps) {
  const characters = useFilteredCharacters("attendance");
  const { data: roster } = useCharacters();
  const { data: sessions } = useBattleSessions();
  const { data: records } = useAttendanceRecords();
  const { mutateAsync: mark } = useMarkAttendance();
  const recoverSession = useSessionRecovery();
  const state = useAttendanceBoard();
  const unansweredOnly = useAttendanceFilterStore((s) => s.unansweredOnly);

  const [draft, setDraft] = useState<GridDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const battleSessions = sessions ?? EMPTY_SESSIONS;
  const recordMap = records ?? EMPTY_RECORDS;
  const changeCount = Object.keys(draft).length;

  const visibleCharacters = useMemo(
    () =>
      unansweredOnly
        ? characters.filter(
            (character) =>
              countUnanswered(battleSessions, recordMap, character.id) > 0
          )
        : characters,
    [characters, unansweredOnly, battleSessions, recordMap]
  );

  // The whole guild, not the filtered rows: "how many are coming" is asked of the guild.
  const totals = useMemo(
    () =>
      countDayTotals(
        (roster ?? EMPTY_ROSTER).map((character) => character.id),
        battleSessions,
        recordMap
      ),
    [roster, battleSessions, recordMap]
  );

  // Reset to page 1 whenever the rows change, so it cannot get stuck on an empty page. Keyed on
  // who the rows are, not on the array: with "Chưa điểm danh" on, the refetch after every save
  // rebuilds the filtered array even when it holds the same people, and an admin on page 2 would
  // be thrown back to page 1 each time.
  const rowIds = useMemo(
    () => visibleCharacters.map((character) => character.id).join("|"),
    [visibleCharacters]
  );
  const pagination = useTablePagination({
    items: visibleCharacters,
    resetKey: rowIds,
    initialPageSize: PAGE_SIZE,
  });

  // One source for the table's geometry: the header and the body must never disagree
  // about how many columns there are, or the whole width recomputes when data lands.
  const dayColumns = state.isPending
    ? PLACEHOLDER_DAY_COLUMNS
    : battleSessions.length;
  const columns = dayColumns + 1; // name + days

  useDeadlineRefresh(battleSessions);

  // The draft lives in memory, so leaving the page would silently drop it.
  useEffect(() => {
    if (changeCount === 0) return;

    /**
     * Ask the browser to confirm before discarding the unsaved answers.
     * @param event - The beforeunload event
     */
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changeCount]);

  /**
   * Move one cell's answer on, into the draft.
   * @param character - Row of the cell
   * @param session - Column of the cell
   */
  const handleCellClick = (character: Character, session: BattleSession) => {
    const saved = recordMap[recordKey(character.id, session.id)]?.isPresent;
    setDraft((current) =>
      clickCell(
        current,
        { characterId: character.id, sessionId: session.id },
        saved
      )
    );
  };

  /** Throw the whole draft away. */
  const handleReset = () => {
    setDraft(EMPTY_DRAFT);
    setSaveError(null);
  };

  /**
   * Write every changed cell, in parallel - one attendance write per cell, as the API takes them.
   * A partial failure keeps exactly the cells that failed in the draft, so pressing Save again
   * retries them and nothing else, and says why the first one failed.
   * @returns A promise settled once every write has settled
   */
  const handleSave = async () => {
    const changes = Object.values(draft);
    if (changes.length === 0) return;

    setSaving(true);
    setSaveError(null);
    const results = await Promise.allSettled(
      changes.map((change) => mark(change))
    );
    setSaving(false);

    const failed = changes.filter(
      (_, index) => results[index].status === "rejected"
    );
    setDraft(
      Object.fromEntries(
        failed.map((change) => [
          recordKey(change.characterId, change.sessionId),
          change,
        ])
      )
    );

    const firstFailure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    if (!firstFailure) return;
    // An expired session is taken care of by a navigation and its own toast.
    if (recoverSession(firstFailure.reason)) return;
    setSaveError(errorMessageOf(firstFailure.reason, SAVE_FALLBACK_ERROR));
  };

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle>Điểm danh theo ngày đánh</CardTitle>
        <AttendanceFilters scope="attendance" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!state.isError && !state.isPending && battleSessions.length > 0 && (
          <p className="-mb-2 text-xs text-muted-foreground md:hidden">
            {SWIPE_HINT}
          </p>
        )}
        <DataTable
          header={
            <>
              <TableRow>
                <TableHead className={STICKY_NAME_COLUMN}>Thành viên</TableHead>
                {state.isPending
                  ? Array.from({ length: dayColumns }, (_, index) => (
                      <TableHead key={index} className="text-center">
                        <Skeleton className="mx-auto h-5 w-20" />
                      </TableHead>
                    ))
                  : battleSessions.map((session) => {
                      const subtitle = getSessionSubtitle(session);
                      return (
                        <TableHead key={session.id} className="text-center">
                          <SessionLabel session={session} size="sm" />
                          {subtitle && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {subtitle}
                            </span>
                          )}
                          {session.isAttendanceClosed && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              Đã khoá
                            </span>
                          )}
                        </TableHead>
                      );
                    })}
              </TableRow>
              {/* `td`, not `th`: the heads are counted as the table's columns, and this row adds
                  none. */}
              <TableRow>
                <TableCell
                  className={cn(
                    STICKY_NAME_COLUMN,
                    "text-sm font-medium text-muted-foreground"
                  )}
                >
                  Cả bang
                </TableCell>
                {state.isPending
                  ? Array.from({ length: dayColumns }, (_, index) => (
                      <TableCell key={index}>
                        <Skeleton className="mx-auto h-5 w-24" />
                      </TableCell>
                    ))
                  : battleSessions.map((session) => (
                      <DayTotalsCell
                        key={session.id}
                        session={session}
                        totals={totals[session.id]}
                      />
                    ))}
              </TableRow>
            </>
          }
          pagination={pagination}
          state={state}
          columns={columns}
          emptyMessage="Không tìm thấy thành viên phù hợp."
          renderRow={(character) => (
            <AttendanceRow
              key={character.id}
              character={character}
              sessions={battleSessions}
              recordMap={recordMap}
              canEdit={isAdmin}
              disabled={saving}
              draft={draft}
              onCellClick={handleCellClick}
            />
          )}
          itemLabel="thành viên"
          pageSizeId="attendance-page-size"
        />
        {changeCount > 0 ? (
          <UnsavedChangesBar
            message={`${changeCount} ô đã đổi`}
            resetLabel="Huỷ"
            saving={saving}
            errorMessages={saveError ? [saveError] : []}
            onSave={() => void handleSave()}
            onReset={handleReset}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

interface DayTotalsCellProps {
  /** Battle day of the column */
  session: BattleSession;
  /** Its answers over the whole guild */
  totals: DayTotals;
}

/**
 * One day's count in the totals row: "Có", "Không" and unanswered, with the marks the cells below
 * use. The numbers are read out as one sentence; the icons themselves stay out of it.
 * @param session - Battle day of the column
 * @param totals - Its answers over the whole guild
 * @returns The totals cell
 */
function DayTotalsCell({ session, totals }: DayTotalsCellProps) {
  return (
    <TableCell
      className="text-center"
      aria-label={`${session.label}: ${totals.co} Có, ${totals.khong} Không, ${totals.chuaTraLoi} chưa điểm danh`}
    >
      <div
        aria-hidden
        className="flex items-center justify-center gap-3 text-sm font-medium tabular-nums"
      >
        <span className="inline-flex items-center gap-1">
          <AttendanceStatusIcon isPresent />
          {totals.co}
        </span>
        <span className="inline-flex items-center gap-1">
          <AttendanceStatusIcon isPresent={false} />
          {totals.khong}
        </span>
        {/* Amber is the palette's "not answered yet" (frontend.md §6). A bare dash before the
            number read as a minus sign. */}
        <span className="inline-flex items-center gap-1">
          <CircleDashed className="size-5 text-amber-500" />
          {totals.chuaTraLoi}
        </span>
      </div>
    </TableCell>
  );
}
