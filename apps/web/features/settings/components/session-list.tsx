"use client";

import { CalendarPlus } from "lucide-react";
import type { BattleSession } from "@shared/schemas";

import { CreateButton } from "@/components/shared/action-buttons";
import { SessionRow } from "./session-row";

interface SessionListProps {
  /** Các trận của tuần đang xem, đã sắp theo giờ đánh */
  sessions: BattleSession[];
  /** Gọi khi bấm Sửa một trận */
  onEdit: (session: BattleSession) => void;
  /** Gọi khi bấm Xoá một trận */
  onDelete: (session: BattleSession) => void;
  /** Gọi khi bấm thêm trận scrim */
  onAdd: () => void;
}

/**
 * Danh sách trận của một tuần. Tuần chỉ có Guild War là trạng thái bình thường
 * của mọi tuần mới, nên phần rỗng nói rõ điều đó thay vì trông như lỗi.
 * @param sessions - Các trận của tuần đang xem
 * @param onEdit - Gọi khi bấm Sửa
 * @param onDelete - Gọi khi bấm Xoá
 * @param onAdd - Gọi khi bấm thêm trận scrim
 * @returns Danh sách trận kèm nút thêm
 */
export function SessionList({
  sessions,
  onEdit,
  onDelete,
  onAdd,
}: SessionListProps) {
  const hasScrim = sessions.some((session) => !session.isGuildWar);

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      {!hasScrim && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Tuần này chưa có trận scrim nào.
        </div>
      )}

      <CreateButton
        label="Thêm trận scrim"
        icon={<CalendarPlus className="size-4" />}
        variant="outline"
        className="self-start"
        onClick={onAdd}
      />
    </div>
  );
}
