"use client";

import { CalendarRange, Clock, Lock, Swords } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { isDeadlinePassed } from "../api/attendance-api";
import { useBattleSessions, useCurrentWeek } from "../hooks/use-attendance";

/**
 * Hiển thị khoảng thời gian tuần điểm danh và danh sách ngày đánh,
 * mỗi ngày kèm hạn chót riêng và trạng thái còn hạn/đã khóa.
 * @returns Card timeline tuần (rỗng khi chưa tải xong tuần)
 */
export function WeekTimeline() {
  const { data: week } = useCurrentWeek();
  const { data: sessions } = useBattleSessions();

  if (!week) {
    return null;
  }

  const battleSessions = sessions ?? [];

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
              {formatDate(week.fromDate)} → {formatDate(week.toDate)}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {battleSessions.map((session) => {
            const closed = isDeadlinePassed(session.deadline);
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
