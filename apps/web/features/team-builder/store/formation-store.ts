import { create } from "zustand";

import { applyDrop } from "../lib/assignment";
import type { Assignment, DragSource, DropTarget } from "../types/formation";

interface FormationState {
  /** Unsaved edits per battle day, keyed by session id. Missing key = untouched. */
  drafts: Record<string, Assignment[]>;
  /** Battle day whose tab is open */
  activeSessionId: string | null;
  /** Sub-tab open inside the day: 0 = match 1, 1 = match 2 */
  activeMatchIndex: number;
  /** Monday of the week on screen; null means the open week */
  selectedWeekStart: string | null;
  /** Switch to another day's tab, always landing on match 1 */
  setActiveSession: (sessionId: string) => void;
  /** Switch to another match inside the open day */
  setActiveMatch: (index: number) => void;
  /** Switch to another week; drafts of the previous week are dropped */
  setWeek: (weekStart: string | null) => void;
  /** Replace a day's draft outright — used by the prefill and by add/remove match */
  setDraft: (sessionId: string, matches: Assignment[]) => void;
  /** Discard a day's draft, falling back to the saved copy */
  clearDraft: (sessionId: string) => void;
  /** Resolve one drag gesture into one match of the day's draft */
  drop: (
    sessionId: string,
    matchIndex: number,
    base: Assignment[],
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
  activeMatchIndex: 0,
  selectedWeekStart: null,
  setActiveSession: (sessionId) =>
    set({ activeSessionId: sessionId, activeMatchIndex: 0 }),
  setActiveMatch: (index) => set({ activeMatchIndex: index }),
  setWeek: (weekStart) =>
    set({
      selectedWeekStart: weekStart,
      drafts: {},
      activeSessionId: null,
      activeMatchIndex: 0,
    }),
  setDraft: (sessionId, matches) =>
    set((state) => ({ drafts: { ...state.drafts, [sessionId]: matches } })),
  clearDraft: (sessionId) =>
    set((state) => {
      const next = { ...state.drafts };
      delete next[sessionId];
      return { drafts: next };
    }),
  drop: (sessionId, matchIndex, base, source, characterId, target) =>
    set((state) => {
      const current = state.drafts[sessionId] ?? base;
      const next = applyDrop(current[matchIndex], source, characterId, target);

      // applyDrop returns the same reference for an out-of-bounds drop.
      if (next === current[matchIndex]) return state;

      const matches = current.map((match, index) =>
        index === matchIndex ? next : match
      );

      return { drafts: { ...state.drafts, [sessionId]: matches } };
    }),
}));
