"use client";

import { useState } from "react";
import { AttendanceStatus } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

import { ErrorState } from "@/components/shared/error-state";
import { SessionLabel } from "@/components/shared/session-label";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

/** Skeleton column count before the battle days are known: Member + 3 days + Actions. */
const SKELETON_COLUMNS = 5;

interface AttendanceGridProps {
  /** The viewer is an admin — not locked by the deadline. */
  isAdmin: boolean;
}

/**
 * The attendance grid: one row per character, read-only by default.
 * The edit button in the last column switches a row to editing; confirming saves it straight away.
 * @param isAdmin - Whether the viewer is an admin
 * @returns The attendance table card
 */
export function AttendanceGrid({ isAdmin }: AttendanceGridProps) {
  const characters = useFilteredCharacters("attendance");
  const { data: sessions } = useBattleSessions();
  const { data: records } = useAttendanceRecords();
  const { mutateAsync: mark, error: markError } = useMarkAttendance();
  const { isPending, isError, errorMessage, refetch } = useAttendanceBoard();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AttendanceDraft>({});

  // Reset to page 1 whenever the filter result changes, so it cannot get stuck on an empty page.
  const pagination = useTablePagination({
    items: characters,
    resetKey: characters,
  });

  const battleSessions = sessions ?? [];
  const recordMap = records ?? {};

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
      initial[session.id] = recordMap[recordKey(character.id, session.id)]?.status;
    }
    setDraft(initial);
    setEditingId(character.id);
  };

  /**
   * Change one cell's draft status in the row being edited.
   * @param sessionId - Battle session id
   * @param status - New status
   */
  const handleDraftChange = (sessionId: string, status: AttendanceStatus) => {
    setDraft((prev) => ({ ...prev, [sessionId]: status }));
  };

  /** Cancel editing and reset the draft. */
  const handleCancel = () => {
    setEditingId(null);
    setDraft({});
  };

  /**
   * The cells that changed relative to a character's current records.
   * @param character - Character being edited
   * @returns The { sessionId, status } entries to save
   */
  const getChangedCells = (character: Character) =>
    battleSessions.flatMap((session) => {
      if (lockedSessionIds.has(session.id)) return [];
      const next = draft[session.id];
      const current = recordMap[recordKey(character.id, session.id)]?.status;
      if (next === undefined || next === current) return [];
      return [{ sessionId: session.id, status: next }];
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

    // The error surfaces through the mutation's `markError`, so swallow it here to avoid a stray promise.
    const saved = await Promise.all(
      changes.map(({ sessionId, status }) => {
        const input = { characterId: character.id, sessionId, status };
        return mark(input);
      })
    ).catch(() => null);

    if (saved) handleCancel();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Điểm danh theo ngày đánh</CardTitle>
      </CardHeader>
      <CardContent>
        {!isError && !isPending && battleSessions.length > 0 && (
          <p className="mb-2 text-xs text-muted-foreground md:hidden">
            Vuốt ngang để xem các ngày đánh khác — cột tên và cột thao tác luôn
            hiện.
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={STICKY_NAME_COLUMN}>Thành viên</TableHead>
              {battleSessions.map((session) => {
                const subtitle = getSessionSubtitle(session);
                return (
                  <TableHead key={session.id} className="text-center">
                    <SessionLabel session={session} size="sm" />
                    <span className="block text-xs font-normal text-muted-foreground">
                      {subtitle}
                    </span>
                    {passedSessionIds.has(session.id) && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        Đã khóa
                      </span>
                    )}
                  </TableHead>
                );
              })}
              <TableHead className={STICKY_ACTION_COLUMN}>Điểm danh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError && (
              <TableRow>
                <TableCell colSpan={SKELETON_COLUMNS}>
                  <ErrorState message={errorMessage} onRetry={refetch} />
                </TableCell>
              </TableRow>
            )}
            {!isError && isPending && (
              <TableSkeleton rows={5} columns={SKELETON_COLUMNS} />
            )}
            {!isError && !isPending && characters.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={battleSessions.length + 2}
                  className="py-8 text-center text-muted-foreground"
                >
                  Không tìm thấy thành viên phù hợp.
                </TableCell>
              </TableRow>
            )}
            {!isError &&
              !isPending &&
              pagination.pagedItems.map((character) => (
                <AttendanceRow
                  key={character.id}
                  character={character}
                  sessions={battleSessions}
                  recordMap={recordMap}
                  lockedSessionIds={lockedSessionIds}
                  allLocked={allLocked}
                  isEditing={editingId === character.id}
                  draft={editingId === character.id ? draft : {}}
                  onStartEdit={handleStartEdit}
                  onDraftChange={handleDraftChange}
                  onCancel={handleCancel}
                  onConfirm={handleConfirm}
                />
              ))}
          </TableBody>
        </Table>

        {markError && (
          <p className="mt-4 text-center text-sm text-destructive">
            {markError.message}
          </p>
        )}

        {!isError && !isPending && characters.length > 0 && (
          <div className="mt-4">
            <TablePaginationBar
              page={pagination.page}
              pageCount={pagination.pageCount}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              itemLabel="thành viên"
              pageSizeId="attendance-page-size"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
