"use client";

import { CalendarRange, Clock, Lock, Swords } from "lucide-react";

import { DateRange } from "@/components/shared/date-range";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { getSessionSubtitle } from "../lib/session-subtitle";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useBattleSessions, useCurrentWeek } from "../hooks/use-attendance";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";

/**
 * Hiển thị khoảng thời gian tuần điểm danh và danh sách ngày đánh,
 * mỗi ngày kèm hạn chót riêng và trạng thái còn hạn/đã khóa.
 * @returns Card timeline tuần, hoặc skeleton/khối lỗi khi query chưa xong hoặc thất bại
 */
export function WeekTimeline() {
  const { data: week } = useCurrentWeek();
  const { data: sessions } = useBattleSessions();
  const { isPending, isError, errorMessage, refetch } = useAttendanceBoard();

  const battleSessions = sessions ?? [];

  useDeadlineRefresh(battleSessions);

  if (isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState message={errorMessage} onRetry={refetch} />
        </CardContent>
      </Card>
    );
  }

  if (isPending || !week) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarRange className="size-5" />
          </span>
          <div>
            <div className="text-xs text-muted-foreground">Tuần điểm danh</div>
            <div className="font-semibold">
              <DateRange start={week.weekStart} end={week.weekEnd} withYear />
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {battleSessions.map((session) => {
            const closed = session.isDeadlinePassed;
            const subtitle = getSessionSubtitle(session);
            return (
              <div
                key={session.id}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border p-3",
                  session.isGuildWar && "border-primary/40 bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-1.5 font-medium",
                    session.isGuildWar && "text-primary"
                  )}
                >
                  {session.isGuildWar && <Swords className="size-4" />}
                  {session.label}
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  {subtitle}
                </div>
                <div className="text-xs text-muted-foreground">
                  Hạn chót: {formatDateTime(session.deadline)}
                </div>
                {closed ? (
                  <StatusBadge tone="danger">
                    <Lock className="size-3.5" />
                    Đã khóa
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="success">
                    <Clock className="size-3.5" />
                    Còn hạn
                  </StatusBadge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
