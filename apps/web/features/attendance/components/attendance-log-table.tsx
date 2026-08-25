"use client";

import { useMemo } from "react";
import { ATTENDANCE_STATUS_LABEL, AttendanceStatus } from "@guild/shared/enums";

import { ErrorState } from "@/components/shared/error-state";
import { StatusIcon } from "@/components/shared/status-icon";
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
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import {
  useAttendanceRecords,
  useBattleSessions,
  useCharacters,
  useFilteredCharacters,
} from "../hooks/use-attendance";
import { CharacterName } from "./character-name";

/**
 * The "Thời gian điểm danh" column is hidden below `md`: on a phone the other three columns fit, and
 * the exact marking time is secondary.
 */
const MARKED_AT_COLUMN = "hidden md:table-cell";

/** Per-column CSS classes for the skeleton, so it hides the same column as the header. */
const SKELETON_COLUMN_CLASSES = [
  undefined,
  undefined,
  undefined,
  MARKED_AT_COLUMN,
] as const;

/**
 * The attendance history table: who marked what, for which session, yes/no, and when.
 * Filtered by the shared filters (search + class), newest first.
 * @returns The history table card
 */
export function AttendanceLogTable() {
  const { data: records } = useAttendanceRecords();
  const { data: characters } = useCharacters();
  const { data: sessions } = useBattleSessions();
  const { isPending, isError, errorMessage, refetch } = useAttendanceBoard();

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
        .filter((record) => filteredIds.has(record.characterId))
        .sort(
          (a, b) =>
            new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
        ),
    [allRecords, filteredIds]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Lịch sử điểm danh{!isPending && !isError && ` (${rows.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thành viên</TableHead>
              <TableHead>Ngày đánh</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className={MARKED_AT_COLUMN}>
                Thời gian điểm danh
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError && (
              <TableRow>
                <TableCell colSpan={4}>
                  <ErrorState message={errorMessage} onRetry={refetch} />
                </TableCell>
              </TableRow>
            )}
            {!isError && isPending && (
              <TableSkeleton
                rows={5}
                columns={4}
                columnClassNames={SKELETON_COLUMN_CLASSES}
              />
            )}
            {!isError && !isPending && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  {allRecords.length === 0
                    ? "Chưa có ai điểm danh."
                    : "Không có lượt điểm danh phù hợp."}
                </TableCell>
              </TableRow>
            )}
            {!isError &&
              !isPending &&
              rows.map((record) => {
                const character = characterMap.get(record.characterId);
                const session = sessionMap.get(record.sessionId);
                const present = record.status === AttendanceStatus.PRESENT;
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
                      <StatusIcon
                        tone={present ? "success" : "danger"}
                        label={ATTENDANCE_STATUS_LABEL[record.status]}
                      />
                    </TableCell>
                    <TableCell
                      className={cn("text-muted-foreground", MARKED_AT_COLUMN)}
                    >
                      {formatDateTime(record.markedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
