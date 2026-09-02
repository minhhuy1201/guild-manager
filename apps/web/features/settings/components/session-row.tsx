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

interface SessionRowProps {
  /** Session to display */
  session: BattleSession;
  /** Called on Edit */
  onEdit: (session: BattleSession) => void;
  /** Called on Delete */
  onDelete: (session: BattleSession) => void;
}

/**
 * One session in the settings list: label, opponent, deadline and the two action buttons.
 * A Guild War always falls on Saturday with a fixed deadline, so it can be neither edited nor deleted —
 * its row is read-only.
 * @param session - Session to display
 * @param onEdit - Called on Edit
 * @param onDelete - Called on Delete
 * @returns One row of the session list
 */
export function SessionRow({ session, onEdit, onDelete }: SessionRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border p-3",
        sessionTintClass(session.isGuildWar)
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <SessionLabel session={session}>
          {session.isGuildWar && <Badge variant="secondary">Bang Chiến</Badge>}
        </SessionLabel>
        {getSessionSubtitle(session) && (
          <div className="text-xs text-muted-foreground">
            {getSessionSubtitle(session)}
          </div>
        )}
        <SessionDeadline session={session} />
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
