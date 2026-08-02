"use client";

import { Lock, Swords } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SessionFormation } from "../types/session-formation";

interface SessionTabsProps {
  /** Battles of the week, ordered by battle time */
  sessions: SessionFormation[];
  /** Battle whose tab is open */
  activeSessionId: string | null;
  /** Battles holding unsaved changes */
  dirtySessionIds: Set<string>;
  /** Called with the battle the user switched to */
  onSelect: (sessionId: string) => void;
}

/**
 * One tab per battle of the week, so all three are visible without opening
 * anything. Marks the Guild War, and flags a locked battle and unsaved edits.
 * @param sessions - Battles of the week
 * @param activeSessionId - Battle whose tab is open
 * @param dirtySessionIds - Battles holding unsaved changes
 * @param onSelect - Called with the battle the user switched to
 * @returns The battle tab bar
 */
export function SessionTabs({
  sessions,
  activeSessionId,
  dirtySessionIds,
  onSelect,
}: SessionTabsProps) {
  return (
    <Tabs
      value={activeSessionId ?? undefined}
      onValueChange={(value) => onSelect(String(value))}
    >
      <TabsList className="grid h-auto w-full gap-2 bg-transparent p-0 sm:grid-cols-3">
        {sessions.map((session) => (
          <TabsTrigger
            key={session.sessionId}
            value={session.sessionId}
            className="h-auto cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-muted-foreground/40 px-3 py-3 text-sm font-medium hover:bg-muted/50 hover:border-primary/60 data-active:border-primary data-active:bg-primary/10 data-active:text-primary dark:data-active:border-primary dark:data-active:bg-primary/10 dark:data-active:text-primary"
          >
            {session.isGuildWar ? <Swords className="size-3.5" /> : null}
            {session.label}
            {session.locked ? <Lock className="size-3 opacity-70" /> : null}
            {dirtySessionIds.has(session.sessionId) ? (
              <span
                className="size-1.5 rounded-full bg-current"
                aria-label="Còn thay đổi chưa lưu"
              />
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
