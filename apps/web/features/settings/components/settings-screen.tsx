"use client";

import { useState } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BattleSession } from "@/features/attendance";
import { useSettingsWeeks, useWeekSessions } from "../hooks/use-week-sessions";
import { DeleteSessionDialog } from "./delete-session-dialog";
import { SessionFormDialog } from "./session-form-dialog";
import { SessionList } from "./session-list";
import { WeekSelector } from "./week-selector";

/** Số hàng khung xương hiện trong lúc chờ dữ liệu. */
const SKELETON_ROWS = 3;

/**
 * Màn Thiết lập lịch đánh: chọn tuần rồi thêm/sửa/xoá các trận của tuần đó.
 * Chỉ tuần đang mở và tuần kế tiếp sửa được — backend cũng chặn lại lần nữa.
 * @returns Màn hình thiết lập
 */
export function SettingsScreen() {
  const weeksQuery = useSettingsWeeks();
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const weeks = weeksQuery.data ?? [];
  const weekStart = selectedWeek ?? weeks[0]?.weekStart ?? null;
  const sessionsQuery = useWeekSessions(weekStart);

  const [editing, setEditing] = useState<BattleSession | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<BattleSession | null>(null);

  if (weeksQuery.isError || sessionsQuery.isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState
            message="Không tải được lịch đánh."
            onRetry={() => {
              void weeksQuery.refetch();
              void sessionsQuery.refetch();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (weeksQuery.isPending || sessionsQuery.isPending || weekStart === null) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-9 w-64" />
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Thiết lập lịch đánh</h1>
          <p className="text-sm text-muted-foreground">
            Sửa được lịch của tuần này và tuần sau. Trận Guild War do hệ thống
            tạo sẵn, chỉ đổi được giờ đánh.
          </p>
        </div>

        <WeekSelector
          weeks={weeks}
          value={weekStart}
          onChange={setSelectedWeek}
        />

        <SessionList
          sessions={sessionsQuery.data}
          onEdit={(session) => {
            setEditing(session);
            setFormOpen(true);
          }}
          onDelete={setDeleting}
          onAdd={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        />
      </CardContent>

      <SessionFormDialog
        open={formOpen}
        session={editing}
        onOpenChange={setFormOpen}
      />
      <DeleteSessionDialog
        session={deleting}
        onClose={() => setDeleting(null)}
      />
    </Card>
  );
}
