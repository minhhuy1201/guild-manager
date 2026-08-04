"use client";

import { Pencil, Swords, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionSubtitle, type BattleSession } from "@/features/attendance";
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
 * Guild War do hệ thống sinh nên chỉ sửa được giờ, không có nút xoá.
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

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(session)}>
          <Pencil className="size-4" />
          Sửa
        </Button>
        {!session.isGuildWar && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => onDelete(session)}
          >
            <Trash2 className="size-4" />
            Xoá
          </Button>
        )}
      </div>
    </div>
  );
}
