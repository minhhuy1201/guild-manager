"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import type { BattleSession } from "@guild/shared/schemas";

import { CreateButton } from "@/components/shared/action-buttons";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { combineQueries } from "@/lib/query-group";
import { useSettingsWeeks, useWeekSessions } from "../hooks/use-week-sessions";
import { DeleteSessionDialog } from "./delete-session-dialog";
import { SessionFormDialog } from "./session-form-dialog";
import { SessionList } from "./session-list";
import { SettingsSkeleton } from "./settings-skeleton";
import { WeekSelector } from "./week-selector";

/**
 * The schedule settings screen: pick a week, then add/edit/delete its sessions.
 * Only the open week and the next one are editable — the backend enforces that again.
 * @returns The settings screen
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

  const state = combineQueries(
    [weeksQuery, sessionsQuery],
    "Không tải được lịch đánh."
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <QueryBoundary state={state} skeleton={<SettingsSkeleton />}>
          {/* Narrowing only: useWeekSessions is disabled while weekStart is null,
              so the group stays pending and this branch never renders empty. */}
          {weekStart !== null && (
            <>
              <div>
                <h1 className="text-lg font-semibold">Thiết lập lịch đánh</h1>
                <p className="text-sm text-muted-foreground">
                  Sửa được lịch của tuần này và tuần sau. Trận Bang Chiến do hệ
                  thống tạo sẵn, chỉ đổi được giờ đánh.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <WeekSelector
                  weeks={weeks}
                  value={weekStart}
                  onChange={setSelectedWeek}
                />
                <CreateButton
                  label="Thêm trận scrim"
                  icon={<CalendarPlus className="size-4" />}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                />
              </div>

              <SessionList
                sessions={sessionsQuery.data ?? []}
                onEdit={(session) => {
                  setEditing(session);
                  setFormOpen(true);
                }}
                onDelete={setDeleting}
              />
            </>
          )}
        </QueryBoundary>
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
