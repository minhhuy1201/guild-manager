import { Lock } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ViewOnlyMarkProps {
  /** Why the row cannot be changed, shown in the tooltip and read by screen readers */
  reason: string;
}

/**
 * Takes the place of a row's action buttons when the viewer may look but not touch.
 * @param props.reason - Why the row is read-only
 * @returns A lock icon with the reason in a tooltip
 */
export function ViewOnlyMark({ reason }: ViewOnlyMarkProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:size-10"
          />
        }
      >
        <Lock className="size-4" aria-hidden />
        <span className="sr-only">{reason}</span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
