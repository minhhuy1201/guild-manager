import { CircleDot, Flag, Send, type LucideIcon } from "lucide-react";

import { StatusBadge, type BadgeTone } from "@/components/shared/status-badge";
import type { EventStage } from "../lib/event-stage";

const STAGE_LABEL: Record<EventStage, string> = {
  open: "Đang mở",
  ended: "Đã kết thúc",
  posted: "Đã post",
};

const STAGE_ICON: Record<EventStage, LucideIcon> = {
  open: CircleDot,
  ended: Flag,
  posted: Send,
};

// Open is the one live state, so it alone takes a tone; both finished states read as muted.
const STAGE_TONE: Record<EventStage, BadgeTone> = {
  open: "success",
  ended: "muted",
  posted: "muted",
};

interface RaceStatusBadgeProps {
  stage: EventStage;
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
    <StatusBadge tone={STAGE_TONE[stage]} className={className}>
      <Icon aria-hidden />
      {STAGE_LABEL[stage]}
    </StatusBadge>
  );
}
