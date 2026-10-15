import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Which way a step travelled to get on screen. */
export type StepDirection = "forward" | "back";

interface StepSlideProps {
  /** Way the step travelled to get here; null on the first step, which does not slide */
  direction: StepDirection | null;
  children: ReactNode;
}

/**
 * Slides a step in from the right when the user moves on, from the left when they step back. Give
 * it a `key` per step so each step mounts fresh and plays the entrance. `overflow-x-clip` keeps the
 * travelling step from adding a sideways scrollbar to the dialog. The `-mx-6 px-6` pair (the dialog's
 * own padding) widens the clip to the panel edge, so the footer, which bleeds out by `-mx-6`, is not
 * cut short on either side.
 * @param direction - Which way the step arrives from
 * @param children - The step
 * @returns The wrapper
 */
export function StepSlide({ direction, children }: StepSlideProps) {
  return (
    <div className="-mx-6 overflow-x-clip px-6">
      <div
        className={cn(
          direction === "forward" && "animate-step-forward",
          direction === "back" && "animate-step-back"
        )}
      >
        {children}
      </div>
    </div>
  );
}
