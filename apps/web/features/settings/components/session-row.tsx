"use client";

import type { BattleSession } from "@guild/shared/schemas";

import {
  DeleteAction,
  EditAction,
  RowActions,
} from "@/components/shared/action-buttons";
import {
  SessionDeadline,
  SessionLabel,
  sessionTintClass,
} from "@/components/shared/session-label";
import { Badge } from "@/components/ui/badge";
import { getSessionSubtitle } from "@/features/attendance";
import { cn } from "@/lib/utils";
import { ReopenAttendanceAction } from "./reopen-attendance-action";

/** Tooltip of the disabled Edit and Delete buttons of a fought scrim. */
const FOUGHT_REASON = "Trận đã đánh, không sửa hay xoá được";

interface SessionRowProps {
  /** Session to display */
  session: BattleSession;
  /** Whether the battle time has passed; a fought battle can be neither edited nor deleted */
  isFought: boolean;
  /** Called on Edit */
  onEdit: (session: BattleSession) => void;
  /** Called on Delete */
  onDelete: (session: BattleSession) => void;
}

/**
 * One session in the settings list: label, opponent, deadline and its action buttons.
 * A Guild War always falls on Saturday with a fixed deadline, so it can be neither edited nor deleted.
 * Reopening its attendance is the one action it does take: the Guild War is the day whose line-up
 * gets announced most, and the announcement is what closes it.
 * A fought scrim keeps its buttons but disabled, with the reason as their tooltip.
 * @param session - Session to display
 * @param isFought - Whether the battle time has passed
 * @param onEdit - Called on Edit
 * @param onDelete - Called on Delete
 * @returns One row of the session list
 */
export function SessionRow({
  session,
  isFought,
  onEdit,
  onDelete,
}: SessionRowProps) {
  // A Guild War with nothing to reopen has no actions at all, and an empty group would still take
  // the row's gap after the content.
  const hasActions = !session.isGuildWar || session.canReopenAttendance;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-inner border p-3 shadow-sm transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-out-soft hover:shadow-md",
        sessionTintClass(session.isGuildWar),
        // Every card is opaque; the jade hover edge is for scrims, the Guild War keeps its primary edge.
        "bg-card",
        !session.isGuildWar && "hover:border-jade/50"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <SessionLabel session={session}>
          {session.isGuildWar && <Badge variant="secondary">Bang Chiến</Badge>}
          {session.canReopenAttendance && (
            <Badge variant="outline">Đã chốt đội hình</Badge>
          )}
          {isFought && <Badge variant="outline">Đã đánh</Badge>}
        </SessionLabel>
        {getSessionSubtitle(session) && (
          <div className="text-xs text-muted-foreground">
            {getSessionSubtitle(session)}
          </div>
        )}
        <SessionDeadline session={session} />
      </div>

      {hasActions && (
        <RowActions>
          {session.canReopenAttendance && (
            <ReopenAttendanceAction session={session} />
          )}
          {!session.isGuildWar && (
            <>
              <EditAction
                disabled={isFought}
                disabledReason={FOUGHT_REASON}
                onClick={() => onEdit(session)}
              />
              <DeleteAction
                disabled={isFought}
                disabledReason={FOUGHT_REASON}
                onClick={() => onDelete(session)}
              />
            </>
          )}
        </RowActions>
      )}
    </div>
  );
}
