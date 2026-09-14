"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Character } from "@guild/shared/schemas";

import { cn } from "@/lib/utils";
import type { MemberDragData } from "../lib/dnd-data";
import { MemberCard } from "./member-card";

interface DraggableMemberProps {
  /** Character to display */
  character: Character;
  /** Slot id the character currently sits in, or POOL_DROPPABLE_ID */
  from: string;
  /** Why this placement needs attention, e.g. the member dropped out */
  warning?: string;
  /** Short note shown under the name, e.g. "đang đánh trận 1" */
  note?: string;
}

/**
 * A member card the user can pick up. Encodes its origin in the drag payload so
 * `onDragEnd` can tell a pool card apart from a card already inside a slot.
 * Renders no transform: the moving preview is handled by DragOverlay instead.
 * @param character - Character to display
 * @param from - Origin of the drag: a slot id, or POOL_DROPPABLE_ID
 * @param warning - Why this placement needs attention, if any
 * @param note - Short note shown under the name, if any
 * @returns Draggable wrapper around a MemberCard
 */
export function DraggableMember({
  character,
  from,
  warning,
  note,
}: DraggableMemberProps) {
  const data: MemberDragData = {
    type: "member",
    characterId: character.id,
    from,
  };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: character.id,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // No `touch-none`: a finger on a card must still scroll the page, and the touch sensor waits
      // for a long press before it drags. That press must not select the name or open the browser's
      // own long-press menu either.
      className={cn(
        "w-full min-w-0 cursor-grab select-none [-webkit-touch-callout:none]",
        isDragging && "opacity-40"
      )}
    >
      <MemberCard character={character} warning={warning} note={note} />
    </div>
  );
}
