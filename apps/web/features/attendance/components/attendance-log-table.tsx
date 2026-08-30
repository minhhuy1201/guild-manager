"use client";

import { useMemo } from "react";

import { TableBodyState } from "@/components/shared/table-body-state";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";
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
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import {
  useAttendanceRecords,
  useBattleSessions,
  useCharacters,
  useFilteredCharacters,
  useSessionFilter,
} from "../hooks/use-attendance";
import { matchesPresenceFilter } from "../lib/presence-filter";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";
import { AttendanceStatusIcon } from "./attendance-status-icon";
import { CharacterName } from "./character-name";

/**
 * The "Thời gian điểm danh" column is hidden below `md`: on a phone the other three columns fit, and
 * the exact marking time is secondary.
 */
const MARKED_AT_COLUMN = "hidden md:table-cell";

/** Header column count: member, session, status, reason, marked-at. */
const COLUMN_COUNT = 5;

/** Per-column CSS classes, so the skeleton hides the same column as the header. */
const COLUMN_CLASSES = [
  undefined,
  undefined,
  undefined,
  undefined,
  MARKED_AT_COLUMN,
] as const;

/**
 * The attendance history table: who marked what, for which session, yes/no, and when.
 * Filtered by the History screen's filters (search + class + presence + session), newest first.
 * @returns The history table card
 */
export function AttendanceLogTable() {
  const { data: records } = useAttendanceRecords();
  const { data: characters } = useCharacters();
  const { data: sessions } = useBattleSessions();
  const state = useAttendanceBoard();
  const presence = useAttendanceFilterStore((s) => s.presence);
  const { selectedSession } = useSessionFilter();

  const characterMap = useMemo(
    () => new Map((characters ?? []).map((c) => [c.id, c])),
    [characters]
  );
  const sessionMap = useMemo(
    () => new Map((sessions ?? []).map((s) => [s.id, s])),
    [sessions]
  );

  const filteredCharacters = useFilteredCharacters("history");
  const filteredIds = useMemo(
    () => new Set(filteredCharacters.map((character) => character.id)),
    [filteredCharacters]
  );

  const allRecords = useMemo(() => Object.values(records ?? {}), [records]);

  const rows = useMemo(
    () =>
      allRecords
        .filter(
          (record) =>
            filteredIds.has(record.characterId) &&
            matchesPresenceFilter(presence, record.isPresent) &&
            (selectedSession === null || record.sessionId === selectedSession.id)
        )
        .sort(
          (a, b) =>
            new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
        ),
    [allRecords, filteredIds, presence, selectedSession]
  );

  const pagination = useTablePagination({ items: rows, resetKey: rows });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Lịch sử điểm danh
          {!state.isPending && !state.isError && ` (${rows.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thành viên</TableHead>
              <TableHead>Ngày đánh</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead className={MARKED_AT_COLUMN}>
                Thời gian điểm danh
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableBodyState
              state={state}
              columns={COLUMN_COUNT}
              columnClassNames={COLUMN_CLASSES}
              rows={pagination.pagedItems}
              emptyMessage={
                allRecords.length === 0
                  ? "Chưa có ai điểm danh."
                  : "Không có lượt điểm danh phù hợp."
              }
              renderRow={(record) => {
                const character = characterMap.get(record.characterId);
                const session = sessionMap.get(record.sessionId);
                return (
                  <TableRow key={`${record.characterId}-${record.sessionId}`}>
                    <TableCell>
                      {character ? (
                        <CharacterName character={character} />
                      ) : (
                        <span className="font-medium">—</span>
                      )}
                    </TableCell>
                    <TableCell>{session?.label ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <AttendanceStatusIcon isPresent={record.isPresent} />
                    </TableCell>
                    {/* A 255-character sentence would stretch the table, so the cell is capped and
                        the full text lives in the tooltip. */}
                    <TableCell className="max-w-56 text-muted-foreground">
                      <span
                        className="block truncate"
                        title={record.reason ?? undefined}
                      >
                        {record.reason ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn("text-muted-foreground", MARKED_AT_COLUMN)}
                    >
                      {formatDateTime(record.markedAt)}
                    </TableCell>
                  </TableRow>
                );
              }}
            />
          </TableBody>
        </Table>

        <div className="mt-4">
          <TablePaginationBar
            page={pagination.page}
            pageCount={pagination.pageCount}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="lượt điểm danh"
            pageSizeId="attendance-log-page-size"
          />
        </div>
      </CardContent>
    </Card>
  );
}
