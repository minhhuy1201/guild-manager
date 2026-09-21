"use client";

import type { TacticStage } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PLAIN_CLOCK_FACE,
  STAGE_CLOCK_FACES,
  needsStageNumber,
} from "../lib/stage-clock";

interface StageTabProps {
  /** The stage this tab opens */
  stage: TacticStage;
  /** Which stage it is, counting from 1 — the clock face follows it */
  position: number;
  /** Whether this is the stage on screen */
  active: boolean;
  onSelect: () => void;
  /** Called on a double click, for the strip that lets an admin rename in place */
  onRename?: () => void;
}

/**
 * One stage tab: a clock face, and the stage's name as its tooltip and accessible name.
 * @param props - The stage, where it sits in the strip, and its two callbacks
 * @returns The tab
 */
export function StageTab({
  stage,
  position,
  active,
  onSelect,
  onRename,
}: StageTabProps) {
  const ClockFace = STAGE_CLOCK_FACES[position - 1] ?? PLAIN_CLOCK_FACE;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            role="tab"
            aria-selected={active}
            // Roving tabIndex, as the ARIA tablist pattern asks: Tab reaches the strip once, and
            // the arrow keys move between the tabs from there.
            tabIndex={active ? 0 : -1}
            size={needsStageNumber(position) ? "xs" : "icon-xs"}
            variant={active ? "default" : "ghost"}
            onClick={onSelect}
            onDoubleClick={onRename}
          />
        }
      >
        <ClockFace />
        {/* Past twelve o'clock the faces repeat, so those tabs carry their number as well. */}
        {needsStageNumber(position) ? (
          <span className="text-[10px] tabular-nums">{position}</span>
        ) : null}
        <span className="sr-only">{stage.name}</span>
      </TooltipTrigger>
      <TooltipContent>{stage.name}</TooltipContent>
    </Tooltip>
  );
}
