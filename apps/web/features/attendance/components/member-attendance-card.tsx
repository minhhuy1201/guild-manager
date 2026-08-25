"use client";

import { ATTENDANCE_STATUS_LABEL, AttendanceStatus } from "@guild/shared/enums";

import { EmptyState } from "@/components/shared/empty-state";
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

/** The two options of an attendance entry, in display order. */
const CHOICES = [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT];

/** Placeholder rows while loading — as many as a week usually has sessions. */
const SKELETON_ROWS = 3;

/**
 * The member's attendance screen: their own character only, one row per session, with the sign-up
 * counts so they can see which session is short-handed.
 * @returns The personal attendance card
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
          <CardContent>
            <EmptyState message="Tài khoản chưa được gán nhân vật, liên hệ quản trị viên." />
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
                              // The error surfaces through `markError`; swallow it to avoid a stray promise.
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
              <EmptyState message="Tuần này chưa có trận nào." />
            )}
          </CardContent>
        </Card>
      )}
    </QueryBoundary>
  );
}
