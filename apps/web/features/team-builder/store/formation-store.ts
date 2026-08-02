import { create } from "zustand";

import {
  applyDrop,
  assign,
  createEmptyAssignment,
  swap,
  unassign,
} from "../lib/assignment";
import { createMockFormation } from "../lib/mock-formation";
import type { Assignment, DragSource, DropTarget, Formation } from "../types/formation";

/** Layout is static demo data for now, built once at module load. */
const FORMATION = createMockFormation();

interface FormationState {
  /** Slot layout — never edited by the user in this screen */
  formation: Formation;
  /** Who stands where */
  assignment: Assignment;
  /** Place a character into a slot, clearing their previous slot */
  assign: (slotId: string, characterId: string) => void;
  /** Empty a slot, sending its occupant back to the pool */
  unassign: (slotId: string) => void;
  /** Exchange the occupants of two slots */
  swap: (slotIdA: string, slotIdB: string) => void;
  /** Resolve one drag gesture through the pure reducer */
  drop: (source: DragSource, characterId: string, target: DropTarget) => void;
  /** Clear every slot */
  reset: () => void;
}

/**
 * Client state of the formation builder (Zustand).
 * Holds UI state only — the guild roster is server data and stays in TanStack Query.
 * Every action delegates to the pure reducer in `lib/assignment.ts`; this store
 * adds no rules of its own.
 */
export const useFormationStore = create<FormationState>((set) => ({
  formation: FORMATION,
  assignment: createEmptyAssignment(FORMATION.slots),
  assign: (slotId, characterId) =>
    set((state) => ({ assignment: assign(state.assignment, slotId, characterId) })),
  unassign: (slotId) =>
    set((state) => ({ assignment: unassign(state.assignment, slotId) })),
  swap: (slotIdA, slotIdB) =>
    set((state) => ({ assignment: swap(state.assignment, slotIdA, slotIdB) })),
  drop: (source, characterId, target) =>
    set((state) => ({
      assignment: applyDrop(state.assignment, source, characterId, target),
    })),
  reset: () => set({ assignment: createEmptyAssignment(FORMATION.slots) }),
}));
