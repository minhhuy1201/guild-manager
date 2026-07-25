"use client";

import { useMemo } from "react";
import { ATTENDANCE_STATUS_LABEL, AttendanceStatus } from "@shared/enums";

import { StatusIcon } from "@/components/shared/status-icon";
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
import {
  useAttendanceRecords,
  useBattleSessions,
  useCharacters,
} from "../hooks/use-attendance";
import { CharacterName } from "./character-name";

/**
 * Bảng lịch sử điểm danh: ai đã điểm danh, buổi nào, Có/Không, thời gian.
 * Sắp xếp mới nhất trước.
 * @returns Card chứa bảng lịch sử
 */
export function AttendanceLogTable() {
  const { data: records } = useAttendanceRecords();
  const { data: characters } = useCharacters();
  const { data: sessions } = useBattleSessions();

  const characterMap = useMemo(
    () => new Map((characters ?? []).map((c) => [c.id, c])),
    [characters]
  );
  const sessionMap = useMemo(
    () => new Map((sessions ?? []).map((s) => [s.id, s])),
    [sessions]
  );

  const rows = useMemo(
    () =>
      Object.values(records ?? {}).sort(
        (a, b) =>
          new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
      ),
    [records]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch sử điểm danh ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thành viên</TableHead>
              <TableHead>Ngày đánh</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead>Thời gian điểm danh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  Chưa có ai điểm danh.
                </TableCell>
              </TableRow>
            )}
            {rows.map((record) => {
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
                  <TableCell className="text-muted-foreground">
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
