"use client";

import { useEffect } from "react";
import type { TacticStage } from "@guild/shared/schemas";

import { isTypingTarget, stageStepForKey } from "../lib/shortcuts";

/**
 * Left and right arrow keys walk the stage tabs: left goes back a stage, right goes on to the next.
 *
 * The walk stops at both ends rather than wrapping — a tactic is read front to back, and jumping
 * from the last stage to the first would read as a glitch. The keys are off while the focus sits in
 * a field, so renaming a stage still moves the caret.
 * @param stages - Every stage of the tactic, in the order they are shown
 * @param activeStageId - Stage whose tab is open
 * @param onSelect - Called with the stage the arrow lands on
 */
export function useStageArrows(
  stages: TacticStage[],
  activeStageId: string | null,
  onSelect: (stageId: string) => void
): void {
  useEffect(() => {
    if (stages.length < 2) {
      return;
    }

    /**
     * Step one stage on an arrow key.
     * @param event - The keyboard event
     */
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      const step = stageStepForKey(event.key);

      if (step === null) {
        return;
      }

      const current = stages.findIndex((stage) => stage.id === activeStageId);
      const next = stages[current + step];

      // No stage that way: the arrow belongs to the page (or to nothing) as it did before.
      if (current === -1 || !next) {
        return;
      }

      event.preventDefault();
      onSelect(next.id);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stages, activeStageId, onSelect]);
}
