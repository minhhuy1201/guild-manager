"use client";

import { Lock, Swords } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Assignment } from "../types/formation";
import type { SessionFormation } from "../types/session-formation";

interface SessionTabsProps {
  /** Battles of the week, ordered by battle time */
  sessions: SessionFormation[];
  /** Battle whose tab is open */
  activeSessionId: string | null;
  /** Assignment currently shown for each battle, keyed by session id */
  assignments: Record<string, Assignment>;
  /** Battles holding unsaved changes */
  dirtySessionIds: Set<string>;
  /** Total number of slots in the layout */
  slotCount: number;
  /** Called with the battle the user switched to */
  onSelect: (sessionId: string) => void;
}

/**
 * One tab per battle of the week. Shows each battle's fill count so all three
 * are visible without opening anything, marks the Guild War, and flags a locked
 * battle and unsaved edits.
 * @param sessions - Battles of the week
 * @param activeSessionId - Battle whose tab is open
 * @param assignments - Assignment shown for each battle
 * @param dirtySessionIds - Battles holding unsaved changes
 * @param slotCount - Total number of slots in the layout
 * @param onSelect - Called with the battle the user switched to
 * @returns The battle tab bar
 */
export function SessionTabs({
  sessions,
  activeSessionId,
  assignments,
  dirtySessionIds,
  slotCount,
  onSelect,
}: SessionTabsProps) {
  return (
    <Tabs
      value={activeSessionId ?? undefined}
      onValueChange={(value) => onSelect(String(value))}
    >
      <TabsList className="w-full">
        {sessions.map((session) => {
          const assignment = assignments[session.sessionId] ?? {};
          const filled = Object.values(assignment).filter(Boolean).length;

          return (
            <TabsTrigger
              key={session.sessionId}
              value={session.sessionId}
              className="flex-1 flex-col items-start gap-0.5 py-2"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {session.isGuildWar ? <Swords className="size-3.5" /> : null}
                {session.label}
                {session.locked ? (
                  <Lock className="size-3 text-muted-foreground" />
                ) : null}
                {dirtySessionIds.has(session.sessionId) ? (
                  <span
                    className="size-1.5 rounded-full bg-primary"
                    aria-label="Còn thay đổi chưa lưu"
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-xs",
                  filled === 0 ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {filled}/{slotCount}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
