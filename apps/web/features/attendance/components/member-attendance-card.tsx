"use client";

import { ATTENDANCE_STATUS_LABEL, AttendanceStatus } from "@guild/shared/enums";

import { QueryBoundary } from "@/components/shared/query-boundary";
import { SessionLabel } from "@/components/shared/session-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
import {
  useAttendanceRecords,
  useAttendanceSummary,
  useBattleSessions,
  useMarkAttendance,
} from "../hooks/use-attendance";
import { getSessionSubtitle } from "../lib/session-subtitle";
import { recordKey } from "../lib/record-key";

/** Hai lựa chọn của một lượt điểm danh, theo thứ tự hiển thị. */
const CHOICES = [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT];

/** Số dòng giả lúc chờ dữ liệu — bằng số trận thường có trong một tuần. */
const SKELETON_ROWS = 3;

/**
 * Màn điểm danh của bang chúng: chỉ nhân vật của chính mình, mỗi trận một dòng,
 * kèm số người đã đăng ký để biết trận nào đang thiếu người.
 * @returns Card điểm danh cá nhân
 */
export function MemberAttendanceCard() {
  const { data: session } = useSession();
  const { data: sessions } = useBattleSessions();
  const { data: records } = useAttendanceRecords();
  const { data: summary } = useAttendanceSummary();
  const { mutateAsync: mark, error: markError } = useMarkAttendance();
  const board = useAttendanceBoard();

  const battleSessions = sessions ?? [];
  const recordMap = records ?? {};
  const character = session?.character ?? null;

  useDeadlineRefresh(battleSessions);

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
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Tài khoản chưa được gán nhân vật, liên hệ quản trị viên.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Điểm danh của {character.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {markError && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {markError.message}
              </p>
            )}

            {battleSessions.map((battleSession) => {
              const current =
                recordMap[recordKey(character.id, battleSession.id)]?.status ??
                null;
              const counts = summary?.find(
                (row) => row.sessionId === battleSession.id
              );

              return (
                <div
                  key={battleSession.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <SessionLabel session={battleSession} size="md" />
                    <p className="text-sm text-muted-foreground">
                      {getSessionSubtitle(battleSession)}
                      {counts && ` · Đã có ${counts.coCount} người`}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {battleSession.isDeadlinePassed ? (
                      <span className="text-sm text-muted-foreground">
                        Đã khoá
                      </span>
                    ) : (
                      CHOICES.map((status) => (
                        <Button
                          key={status}
                          variant={current === status ? "default" : "outline"}
                          onClick={() =>
                            void mark({
                              characterId: character.id,
                              sessionId: battleSession.id,
                              status,
                            }).catch(() => {
                              // Lỗi hiển thị qua `markError`; nuốt để promise không văng ra ngoài.
                            })
                          }
                        >
                          {ATTENDANCE_STATUS_LABEL[status]}
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {battleSessions.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Tuần này chưa có trận nào.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </QueryBoundary>
  );
}
