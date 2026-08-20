"use client";

import { useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { Character } from "@shared/schemas";

import { isMemberDragData, toDragSource, toDropTarget } from "../lib/dnd-data";
import type { DragSource, DropTarget } from "../types/formation";

/** The drag gesture in flight, translated from dnd-kit events. */
export interface FormationDndState {
  /** Character being dragged right now, for the DragOverlay preview */
  activeCharacter: Character | null;
  /** dnd-kit onDragStart handler */
  handleDragStart: (event: DragStartEvent) => void;
  /** dnd-kit onDragEnd handler */
  handleDragEnd: (event: DragEndEvent) => void;
  /** dnd-kit onDragCancel handler */
  cancelDrag: () => void;
}

/**
 * Translate dnd-kit's events into the draft's vocabulary. This hook owns only
 * the gesture — what a drop means to the formation is decided by `applyDrop`,
 * which it never inspects.
 * @param applyDrop - Draft handler that resolves one finished gesture
 * @param charactersById - Roster by id, to preview the card being dragged
 * @returns The dragged character plus the three dnd-kit handlers
 */
export function useFormationDnd(
  applyDrop: (
    source: DragSource,
    characterId: string,
    target: DropTarget
  ) => void,
  charactersById: Map<string, Character>
): FormationDndState {
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);

  /**
   * Remember which character is moving so DragOverlay can preview it.
   * @param event - dnd-kit drag start event
   */
  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (!isMemberDragData(data)) return;
    setActiveCharacter(charactersById.get(data.characterId) ?? null);
  }

  /**
   * Hand the finished gesture to the draft.
   * @param event - dnd-kit drag end event
   */
  function handleDragEnd(event: DragEndEvent) {
    setActiveCharacter(null);

    const dragData = event.active.data.current;
    if (!isMemberDragData(dragData)) return;

    applyDrop(
      toDragSource(dragData),
      dragData.characterId,
      toDropTarget(event.over?.data.current)
    );
  }

  return {
    activeCharacter,
    handleDragStart,
    handleDragEnd,
    cancelDrag: () => setActiveCharacter(null),
  };
}
