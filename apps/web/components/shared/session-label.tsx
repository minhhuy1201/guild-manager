import type { ReactNode } from "react";
import { Swords } from "lucide-react";

import type { BattleSession } from "@guild/shared/schemas";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** How wide the space around the label is: a narrow cell, or a list row. */
export type SessionLabelSize = "sm" | "md";

/**
 * Icon size per named size. Two fixed values instead of a free `className`,
 * so a screen cannot quietly drift to a third one.
 */
const ICON_CLASS: Record<SessionLabelSize, string> = {
  sm: "size-3.5",
  md: "size-4",
};

/** Frame classes for a Guild War, kept beside the label they belong with. */
const GUILD_WAR_TINT = "border-primary/40 bg-primary/5";

/**
 * How a battle kind is written in upper case, for a headline that has no room for the
 * backend's full label. Lives here so the two words cannot drift from the icon and the
 * tint that mean the same thing.
 * @param isGuildWar - Whether the battle is the Guild War
 * @returns "BANG CHIẾN" or "SCRIM"
 */
export function sessionKindLabel(isGuildWar: boolean): string {
  return isGuildWar ? "BANG CHIẾN" : "SCRIM";
}

export interface SessionLabelProps {
  /** Battle to show; its label, its Guild War flag and its match count are read */
  session: Pick<BattleSession, "label" | "isGuildWar" | "matchCount">;
  /** Icon size: "sm" for a narrow cell, "md" for a list row */
  size?: SessionLabelSize;
  /** Marks a single screen adds after the label, inside the same row */
  children?: ReactNode;
}

/**
 * How a battle is recognised across the app: the Guild War carries a crossed
 * swords icon and the primary colour, a scrim carries neither. Both carry a
 * badge with the number of matches the day is played over.
 *
 * This is one inline row and nothing more — no frame, no spacing, no second
 * line. Four screens lay a battle out four different ways, and the only thing
 * they genuinely share is what the row itself looks like. The subtitle stays
 * with each screen because each screen stacks and styles it differently.
 * @param session - Battle to show; label, isGuildWar and matchCount are read
 * @param size - Icon size; "sm" for a narrow cell, "md" for a list row
 * @param children - Marks the screen adds after the label, in the same row
 * @returns The label row
 */
export function SessionLabel({
  session,
  size = "md",
  children,
}: SessionLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        session.isGuildWar && "text-primary"
      )}
    >
      {session.isGuildWar && <Swords className={ICON_CLASS[size]} />}
      {session.label}
      {/* `secondary`, not a hand-rolled outline: a solid ground with full-strength text is the
          only way this reads at a glance beside a label that is already bold, and often primary. */}
      <Badge variant="secondary">{session.matchCount} trận</Badge>
      {children}
    </span>
  );
}

export interface SessionDeadlineProps {
  /** Battle whose deadline is shown; only its deadline is read */
  session: Pick<BattleSession, "deadline">;
}

/**
 * The "Hạn chót: …" line of a battle.
 *
 * Returns the whole line, wrapper included: the two screens showing it write
 * it identically down to the class, so there is nothing left for a caller to
 * decide.
 * @param session - Battle whose deadline is shown
 * @returns The deadline line
 */
export function SessionDeadline({ session }: SessionDeadlineProps) {
  return (
    <div className="text-xs text-muted-foreground">
      Hạn chót: {formatDateTime(session.deadline)}
    </div>
  );
}

/**
 * Frame classes for a battle: a Guild War is tinted so it stands out of a
 * list. Returned as a string rather than rendered, because the frame belongs
 * to the screen — the tint is the only part of it that is a convention.
 * @param isGuildWar - Whether the battle is the Guild War
 * @returns Classes to merge into the frame's own className, or an empty string
 */
export function sessionTintClass(isGuildWar: boolean): string {
  return isGuildWar ? GUILD_WAR_TINT : "";
}
