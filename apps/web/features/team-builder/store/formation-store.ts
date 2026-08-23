import { create } from "zustand";

import { applyDrop } from "../lib/assignment";
import type { DragSource, DropTarget, MatchDraft } from "../types/formation";

interface FormationState {
  /** Unsaved edits per battle day, keyed by session id. Missing key = untouched. */
  drafts: Record<string, MatchDraft[]>;
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
  /**
   * Start a day's draft from `initial`, or leave the draft it already has.
   * This is the only door the saved copy comes through, and it comes as a
   * starting value the caller already holds: the store never fetches it and
   * never keeps a second copy of it beside the draft.
   */
  ensureDraft: (sessionId: string, initial: MatchDraft[]) => void;
  /**
   * Replace a day's draft outright. `useFormationDraft` owns this — nothing
   * else may write `drafts` wholesale, or two hooks end up deciding what a
   * day contains.
   */
  setDraft: (sessionId: string, matches: MatchDraft[]) => void;
  /** Discard a day's draft, falling back to the saved copy */
  clearDraft: (sessionId: string) => void;
  /** Resolve one drag gesture into one match of the day's draft */
  drop: (
    sessionId: string,
    matchIndex: number,
    source: DragSource,
    characterId: string,
    target: DropTarget
  ) => void;
  /** Write the note of one slot in one match of the day's draft */
  setNote: (
    sessionId: string,
    matchIndex: number,
    slotId: string,
    text: string
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
  ensureDraft: (sessionId, initial) =>
    set((state) =>
      state.drafts[sessionId]
        ? state
        : { drafts: { ...state.drafts, [sessionId]: initial } }
    ),
  setDraft: (sessionId, matches) =>
    set((state) => ({ drafts: { ...state.drafts, [sessionId]: matches } })),
  clearDraft: (sessionId) =>
    set((state) => {
      const next = { ...state.drafts };
      delete next[sessionId];
      return { drafts: next };
    }),
  drop: (sessionId, matchIndex, source, characterId, target) =>
    set((state) => {
      const current = state.drafts[sessionId];
      const match = current?.[matchIndex];
      // No draft means the caller skipped `ensureDraft`; there is nothing here
      // to edit, and guessing the saved copy is exactly what this store must
      // not do.
      if (!current || !match) return state;

      const next = applyDrop(match.assignment, source, characterId, target);

      // applyDrop returns the same reference for an out-of-bounds drop.
      if (next === match.assignment) return state;

      const matches = current.map((item, index) =>
        index === matchIndex ? { ...item, assignment: next } : item
      );

      return { drafts: { ...state.drafts, [sessionId]: matches } };
    }),
  setNote: (sessionId, matchIndex, slotId, text) =>
    set((state) => {
      const current = state.drafts[sessionId];
      const match = current?.[matchIndex];
      if (!current || !match) return state;

      const notes = { ...match.notes };
      // A slot cleared back to blank loses its key, the same way an empty slot
      // carries no key in the assignment. The raw text is kept otherwise, so
      // typing a space mid-sentence is not swallowed.
      if (text.trim() === "") delete notes[slotId];
      else notes[slotId] = text;

      const matches = current.map((item, index) =>
        index === matchIndex ? { ...item, notes } : item
      );

      return { drafts: { ...state.drafts, [sessionId]: matches } };
    }),
}));
