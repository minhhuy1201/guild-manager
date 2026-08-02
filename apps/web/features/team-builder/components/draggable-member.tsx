"use client";

import { useDraggable } from "@dnd-kit/core";

import type { Character } from "@/features/attendance";
import { cn } from "@/lib/utils";
import type { MemberDragData } from "../lib/dnd-data";
import { MemberCard } from "./member-card";

interface DraggableMemberProps {
  /** Character to display */
  character: Character;
  /** Slot id the character currently sits in, or POOL_DROPPABLE_ID */
  from: string;
  /** Reason the current placement is invalid, if any */
  invalidReason?: string;
}

/**
 * A member card the user can pick up. Encodes its origin in the drag payload so
 * `onDragEnd` can tell a pool card apart from a card already inside a slot.
 * Renders no transform: the moving preview is handled by DragOverlay instead.
 * @param character - Character to display
 * @param from - Origin of the drag: a slot id, or POOL_DROPPABLE_ID
 * @param invalidReason - Reason the current placement is invalid, if any
 * @returns Draggable wrapper around a MemberCard
 */
export function DraggableMember({
  character,
  from,
  invalidReason,
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
      className={cn("cursor-grab touch-none", isDragging && "opacity-40")}
    >
      <MemberCard character={character} invalidReason={invalidReason} />
    </div>
  );
}
