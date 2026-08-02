import { create } from "zustand";

import { applyDrop } from "../lib/assignment";
import type { Assignment, DragSource, DropTarget } from "../types/formation";

interface FormationState {
  /** Unsaved edits per battle, keyed by session id. Missing key = untouched. */
  drafts: Record<string, Assignment>;
  /** Battle whose tab is open */
  activeSessionId: string | null;
  /** Monday of the week on screen; null means the open week */
  selectedWeekStart: string | null;
  /** Switch to another battle's tab */
  setActiveSession: (sessionId: string) => void;
  /** Switch to another week; drafts of the previous week are dropped */
  setWeek: (weekStart: string | null) => void;
  /** Replace a battle's draft outright — used by the prefill */
  setDraft: (sessionId: string, assignment: Assignment) => void;
  /** Discard a battle's draft, falling back to the saved copy */
  clearDraft: (sessionId: string) => void;
  /** Resolve one drag gesture into the battle's draft */
  drop: (
    sessionId: string,
    base: Assignment,
    source: DragSource,
    characterId: string,
    target: DropTarget
  ) => void;
}

/**
 * Draft state of the formation builder (Zustand).
 * Holds ONLY unsaved edits — the saved formations are server data and stay in
 * TanStack Query. Every rule about what a drop means lives in
 * `lib/assignment.ts`; this store adds none of its own.
 */
export const useFormationStore = create<FormationState>((set) => ({
  drafts: {},
  activeSessionId: null,
  selectedWeekStart: null,
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
  setWeek: (weekStart) =>
    set({ selectedWeekStart: weekStart, drafts: {}, activeSessionId: null }),
  setDraft: (sessionId, assignment) =>
    set((state) => ({ drafts: { ...state.drafts, [sessionId]: assignment } })),
  clearDraft: (sessionId) =>
    set((state) => {
      const next = { ...state.drafts };
      delete next[sessionId];
      return { drafts: next };
    }),
  drop: (sessionId, base, source, characterId, target) =>
    set((state) => {
      const current = state.drafts[sessionId] ?? base;
      const next = applyDrop(current, source, characterId, target);

      // applyDrop returns the same reference for an out-of-bounds drop.
      if (next === current) return state;

      return { drafts: { ...state.drafts, [sessionId]: next } };
    }),
}));
