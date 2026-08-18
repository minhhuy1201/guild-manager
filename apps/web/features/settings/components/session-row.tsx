"use client";

import { Swords } from "lucide-react";
import type { BattleSession } from "@shared/schemas";

import {
  DeleteAction,
  EditAction,
  RowActions,
} from "@/components/shared/action-buttons";
import { Badge } from "@/components/ui/badge";
import { getSessionSubtitle } from "@/features/attendance";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SessionRowProps {
  /** Trận cần hiển thị */
  session: BattleSession;
  /** Gọi khi bấm Sửa */
  onEdit: (session: BattleSession) => void;
  /** Gọi khi bấm Xoá */
  onDelete: (session: BattleSession) => void;
}

/**
 * Một trận trong danh sách thiết lập: nhãn, đối thủ, hạn chót và hai nút thao tác.
 * Guild War luôn rơi vào thứ 7 với hạn chót cố định nên không sửa cũng không xoá được,
 * hàng của nó chỉ để xem.
 * @param session - Trận cần hiển thị
 * @param onEdit - Gọi khi bấm Sửa
 * @param onDelete - Gọi khi bấm Xoá
 * @returns Một hàng trong danh sách trận
 */
export function SessionRow({ session, onEdit, onDelete }: SessionRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border p-3",
        session.isGuildWar && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          className={cn(
            "flex items-center gap-1.5 font-medium",
            session.isGuildWar && "text-primary"
          )}
        >
          {session.isGuildWar && <Swords className="size-4" />}
          {session.label}
          {session.isGuildWar && <Badge variant="secondary">Guild War</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">
          {getSessionSubtitle(session)}
        </div>
        <div className="text-xs text-muted-foreground">
          Hạn chót: {formatDateTime(session.deadline)}
        </div>
      </div>

      {!session.isGuildWar && (
        <RowActions>
          <EditAction onClick={() => onEdit(session)} />
          <DeleteAction onClick={() => onDelete(session)} />
        </RowActions>
      )}
    </div>
  );
}
