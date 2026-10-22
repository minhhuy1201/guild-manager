import { CircleDot, Flag, Send, type LucideIcon } from "lucide-react";
import type { CatRaceEventSummary } from "@guild/shared/schemas";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RaceStage = "open" | "ended" | "posted";

const STAGE_LABEL: Record<RaceStage, string> = {
  open: "Đang mở",
  ended: "Đã kết thúc",
  posted: "Đã post",
};

const STAGE_ICON: Record<RaceStage, LucideIcon> = {
  open: CircleDot,
  ended: Flag,
  posted: Send,
};

// Open is the one live state, so it alone takes the accent; both finished states read as muted.
const STAGE_CLASS: Record<RaceStage, string> = {
  open: "bg-jade/15 text-jade",
  ended: "bg-muted text-muted-foreground",
  posted: "bg-muted text-muted-foreground",
};

/**
 * Where an event stands in the list.
 * @param race - The event summary
 * @returns The stage the badge and the card dimming follow
 */
export function raceStageOf(
  race: Pick<CatRaceEventSummary, "status" | "discordPostedAt">
): RaceStage {
  if (race.status === "OPEN") return "open";
  return race.discordPostedAt ? "posted" : "ended";
}

interface RaceStatusBadgeProps {
  stage: RaceStage;
  className?: string;
}

/**
 * A pill with an icon and the stage's name, so a finished event stands out from an open one.
 * @param stage - Which stage to show
 * @param className - Extra classes
 * @returns The badge
 */
export function RaceStatusBadge({ stage, className }: RaceStatusBadgeProps) {
  const Icon = STAGE_ICON[stage];

  return (
    <Badge className={cn("h-6 gap-1.5 px-2.5 text-sm", STAGE_CLASS[stage], className)}>
      <Icon aria-hidden />
      {STAGE_LABEL[stage]}
    </Badge>
  );
}
