"use client";

import { Lock } from "lucide-react";
import type { MatchFormation, SessionFormation } from "@guild/shared/schemas";

import { SessionLabel } from "@/components/shared/session-label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSessionSubtitle } from "@/features/attendance";

interface SessionTabsProps {
  /** Battles of the week, ordered by battle time */
  sessions: SessionFormation[];
  /** Battle whose tab is open */
  activeSessionId: string | null;
  /** Battles holding unsaved changes */
  dirtySessionIds: Set<string>;
  /** Called with the battle the user switched to */
  onSelect: (sessionId: string) => void;
  /** Total slots of one match, for the "12/60" badge */
  slotCount: number;
}

/**
 * Progress label for a day: one count per match, e.g. "12/60 · 8/60".
 * @param matches - Saved line-up of each match of the day
 * @param slotCount - Total slots of one match
 * @returns The label, or null when the day has nothing saved
 */
function matchProgress(
  matches: MatchFormation[],
  slotCount: number
): string | null {
  if (matches.length === 0) return null;

  // Counts people placed, not notes — a note on an empty slot fills nothing.
  return matches
    .map((match) => `${Object.keys(match.slots).length}/${slotCount}`)
    .join(" · ");
}

/**
 * One tab per battle of the week, so all three are visible without opening
 * anything. Marks the Guild War, and flags a locked battle and unsaved edits.
 * @param sessions - Battles of the week
 * @param activeSessionId - Battle whose tab is open
 * @param dirtySessionIds - Battles holding unsaved changes
 * @param onSelect - Called with the battle the user switched to
 * @param slotCount - Total slots of one match
 * @returns The battle tab bar
 */
export function SessionTabs({
  sessions,
  activeSessionId,
  dirtySessionIds,
  onSelect,
  slotCount,
}: SessionTabsProps) {
  return (
    <Tabs
      value={activeSessionId ?? undefined}
      onValueChange={(value) => onSelect(String(value))}
    >
      {/*
        Chiều cao mặc định của TabsList gắn với modifier `group-data-horizontal/tabs`,
        nên `h-auto` trơn KHÔNG đè được nó: tailwind-merge coi hai lớp khác modifier
        là không xung đột, và cả hai cùng độ ưu tiên nên lớp sinh sau thắng. Phải
        đè bằng đúng modifier đó, không thì hàng thẻ trận bị ép còn 32px và tràn
        xuống che mất hàng "Trận 1 / Tạo trận 2" bên dưới.
      */}
      <TabsList className="grid w-full gap-2 bg-transparent p-0 group-data-horizontal/tabs:h-auto sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => {
          const subtitle = getSessionSubtitle(session);
          const progress = matchProgress(session.matches, slotCount);
          return (
            <TabsTrigger
              key={session.sessionId}
              value={session.sessionId}
              className="h-auto cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-muted-foreground/40 px-3 py-3 text-sm font-medium hover:bg-muted/50 hover:border-primary/60 data-active:border-primary data-active:bg-primary/10 data-active:text-primary dark:data-active:border-primary dark:data-active:bg-primary/10 dark:data-active:text-primary"
            >
              <SessionLabel session={session} size="sm">
                {session.locked ? <Lock className="size-3 opacity-70" /> : null}
                {dirtySessionIds.has(session.sessionId) ? (
                  <span
                    className="size-1.5 rounded-full bg-current"
                    aria-label="Còn thay đổi chưa lưu"
                  />
                ) : null}
              </SessionLabel>
              <span className="text-xs font-normal opacity-80">
                {progress ? `${subtitle} · ${progress}` : subtitle}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
