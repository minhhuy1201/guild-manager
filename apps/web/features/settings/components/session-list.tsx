"use client";

import type { BattleSession } from "@guild/shared/schemas";

import { EmptyState } from "@/components/shared/empty-state";
import { SessionRow } from "./session-row";

interface SessionListProps {
  /** Sessions of the week being viewed, already ordered by battle time */
  sessions: BattleSession[];
  /** Called on Edit */
  onEdit: (session: BattleSession) => void;
  /** Called on Delete */
  onDelete: (session: BattleSession) => void;
}

/**
 * A week's session list. A week holding only the Guild War is the normal state of every new week, so
 * the empty state says as much instead of looking like a failure.
 * @param sessions - Sessions of the week being viewed
 * @param onEdit - Called on Edit
 * @param onDelete - Called on Delete
 * @returns The session list
 */
export function SessionList({
  sessions,
  onEdit,
  onDelete,
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

      {!hasScrim && <EmptyState message="Tuần này chưa có trận scrim nào." />}
    </div>
  );
}
