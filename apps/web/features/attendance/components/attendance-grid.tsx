"use client";

import { useState } from "react";
import type { Character } from "@guild/shared/schemas";

import { DataTable } from "@/components/shared/data-table";
import { SessionLabel } from "@/components/shared/session-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableHead, TableRow } from "@/components/ui/table";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { getSessionSubtitle } from "../lib/session-subtitle";
import {
  STICKY_ACTION_COLUMN,
  STICKY_NAME_COLUMN,
} from "../lib/sticky-columns";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
import {
  useAttendanceRecords,
  useBattleSessions,
  useFilteredCharacters,
  useMarkAttendance,
} from "../hooks/use-attendance";
import { recordKey } from "../lib/record-key";
import { AttendanceRow, type AttendanceDraft } from "./attendance-row";

/**
 * Day columns drawn while the week's schedule is still loading. A guess, not a rule —
 * it only has to be a plausible week so the header does not visibly resize when the
 * real sessions land.
 */
const PLACEHOLDER_DAY_COLUMNS = 4;

/** Mobile hint above the grid — the pinned columns differ, so each viewer gets their own wording. */
const SWIPE_HINT_ADMIN =
  "Vuốt ngang để xem các ngày đánh khác — cột tên và cột thao tác luôn hiện.";
const SWIPE_HINT_READ_ONLY =
  "Vuốt ngang để xem các ngày đánh khác — cột tên luôn hiện.";

interface AttendanceGridProps {
  /** The viewer is an admin — they get the action column and are not locked by the deadline. */
  isAdmin: boolean;
}

/**
 * The attendance grid: one row per character, read-only by default.
 * The edit button in the last column switches a row to editing; confirming saves it straight away.
 * That column belongs to an admin — a member reads the same grid without it and answers for their
 * own character in `MemberAttendanceCard`.
 * @param isAdmin - Whether the viewer is an admin
 * @returns The attendance table card
 */
export function AttendanceGrid({ isAdmin }: AttendanceGridProps) {
  const characters = useFilteredCharacters("attendance");
  const { data: sessions } = useBattleSessions();
  const { data: records } = useAttendanceRecords();
  const { mutateAsync: mark, error: markError } = useMarkAttendance();
  const state = useAttendanceBoard();

  const [editingId, setEditingId] = useState<string | null>(null);
  // The row id being written. Not `mutation.isPending`: one confirm fires several
  // parallel `mark` calls, so the mutation cannot say which row they belong to.
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AttendanceDraft>({});

  // Reset to page 1 whenever the filter result changes, so it cannot get stuck on an empty page.
  const pagination = useTablePagination({
    items: characters,
    resetKey: characters,
  });

  const battleSessions = sessions ?? [];
  const recordMap = records ?? {};

  // One source for the table's geometry: the header and the body must never disagree
  // about how many columns there are, or the whole width recomputes when data lands.
  const dayColumns = state.isPending
    ? PLACEHOLDER_DAY_COLUMNS
    : battleSessions.length;
  const columns = dayColumns + (isAdmin ? 2 : 1); // name + days + actions

  useDeadlineRefresh(battleSessions);

  // Lock the column of any day past its deadline — used to show everyone the "Đã khóa" label.
  const passedSessionIds = new Set(
    battleSessions.filter((s) => s.isDeadlinePassed).map((s) => s.id)
  );
  // Admins may edit past-deadline days, so no cell is locked for them.
  const lockedSessionIds = isAdmin ? new Set<string>() : passedSessionIds;
  const allLocked =
    battleSessions.length > 0 &&
    lockedSessionIds.size === battleSessions.length;

  /**
   * Start editing a row: seed the draft from the existing records.
   * Opening another row replaces the one being edited (only one at a time).
   * @param character - Character to edit
   */
  const handleStartEdit = (character: Character) => {
    const initial: AttendanceDraft = {};
    for (const session of battleSessions) {
      initial[session.id] =
        recordMap[recordKey(character.id, session.id)]?.isPresent;
    }
    setDraft(initial);
    setEditingId(character.id);
  };

  /**
   * Change one cell's draft answer in the row being edited.
   * @param sessionId - Battle session id
   * @param isPresent - New answer
   */
  const handleDraftChange = (sessionId: string, isPresent: boolean) => {
    setDraft((prev) => ({ ...prev, [sessionId]: isPresent }));
  };

  /** Cancel editing and reset the draft. */
  const handleCancel = () => {
    setEditingId(null);
    setDraft({});
  };

  /**
   * The cells that changed relative to a character's current records.
   * @param character - Character being edited
   * @returns The { sessionId, isPresent } entries to save
   */
  const getChangedCells = (character: Character) =>
    battleSessions.flatMap((session) => {
      if (lockedSessionIds.has(session.id)) return [];
      const next = draft[session.id];
      const current = recordMap[recordKey(character.id, session.id)]?.isPresent;
      if (next === undefined || next === current) return [];
      return [{ sessionId: session.id, isPresent: next }];
    });

  /**
   * Save a character's changed cells.
   * @param character - Character being edited
   * @returns A promise settled once saved or once the error is shown
   */
  const handleConfirm = async (character: Character) => {
    const changes = getChangedCells(character);
    if (changes.length === 0) {
      handleCancel();
      return;
    }

    setSavingId(character.id);
    // The error surfaces through the mutation's `markError`, so swallow it here to avoid a stray promise.
    const saved = await Promise.all(
      changes.map(({ sessionId, isPresent }) => {
        const input = { characterId: character.id, sessionId, isPresent };
        return mark(input);
      })
    ).catch(() => null);
    setSavingId(null);

    if (saved) handleCancel();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Điểm danh theo ngày đánh</CardTitle>
      </CardHeader>
      <CardContent>
        {!state.isError && !state.isPending && battleSessions.length > 0 && (
          <p className="mb-2 text-xs text-muted-foreground md:hidden">
            {isAdmin ? SWIPE_HINT_ADMIN : SWIPE_HINT_READ_ONLY}
          </p>
        )}
        <DataTable
          header={
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
                        {passedSessionIds.has(session.id) && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            Đã khóa
                          </span>
                        )}
                      </TableHead>
                    );
                  })}
              {isAdmin && (
                <TableHead className={STICKY_ACTION_COLUMN}>Điểm danh</TableHead>
              )}
            </TableRow>
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
              canEdit={isAdmin}
              recordMap={recordMap}
              lockedSessionIds={lockedSessionIds}
              allLocked={allLocked}
              isEditing={editingId === character.id}
              isSaving={savingId === character.id}
              draft={editingId === character.id ? draft : {}}
              onStartEdit={handleStartEdit}
              onDraftChange={handleDraftChange}
              onCancel={handleCancel}
              onConfirm={handleConfirm}
            />
          )}
          itemLabel="thành viên"
          pageSizeId="attendance-page-size"
          footer={
            /* Always occupies its slot, so the pagination bar below never moves. */
            <div className="min-h-5">
              {markError && (
                <p className="animate-in text-center text-sm text-destructive fade-in duration-[var(--duration-base)] ease-out-soft">
                  {markError.message}
                </p>
              )}
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
