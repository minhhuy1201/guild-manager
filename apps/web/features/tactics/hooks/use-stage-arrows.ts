"use client";

import { useEffect, useRef } from "react";
import type { TacticStage } from "@guild/shared/schemas";

import { belongsElsewhere } from "@/lib/keyboard-target";
import { stageStepForKey } from "../lib/shortcuts";

/**
 * Left and right arrow keys walk the stage tabs: left goes back a stage, right goes on to the next.
 *
 * The walk stops at both ends rather than wrapping — a tactic is read front to back, and jumping
 * from the last stage to the first would read as a glitch. The keys are off while the focus sits in
 * a field or inside a dialog, so renaming a stage still moves the caret.
 *
 * The keys answer from anywhere on the page, because an admin walks the stages with a hand on the
 * map rather than on the strip. Once the focus *is* on a tab the walk carries it along, which is
 * what the ARIA tablist pattern asks for: pair the returned ref with a roving `tabIndex` so Tab
 * reaches the strip once and the arrows move inside it.
 * @param stages - Every stage of the tactic, in the order they are shown
 * @param activeStageId - Stage whose tab is open
 * @param onSelect - Called with the stage the arrow lands on
 * @returns Ref for the element with `role="tablist"`, whose tabs the walk keeps the focus on
 */
export function useStageArrows(
  stages: TacticStage[],
  activeStageId: string | null,
  onSelect: (stageId: string) => void
): React.RefObject<HTMLDivElement | null> {
  const tablistRef = useRef<HTMLDivElement | null>(null);
  // Set by a walk that started on a tab, read once the newly selected tab has rendered.
  const refocusRef = useRef(false);

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
        belongsElsewhere(event.target)
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
      refocusRef.current =
        tablistRef.current?.contains(document.activeElement) === true;
      onSelect(next.id);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stages, activeStageId, onSelect]);

  // The tab that was carrying the focus is gone from the tab order the moment the selection moves,
  // so the focus has to follow the selection here, after the new tab has rendered.
  useEffect(() => {
    if (!refocusRef.current) {
      return;
    }

    refocusRef.current = false;
    tablistRef.current
      ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.focus();
  }, [activeStageId]);

  return tablistRef;
}
