"use client";

import { useCallback, useMemo } from "react";
import type { SessionFormation } from "@guild/shared/schemas";

import { ApiError } from "@/lib/api-client";
import { resolveActiveMatchIndex } from "../lib/active-match";
import { isDayDirty } from "../lib/formation-diff";
import { FORMATION } from "../lib/mock-formation";
import { fromWire, fromWireMatches, toWireMatches } from "../lib/wire";
import { useFormationStore } from "../store/formation-store";
import type {
  Assignment,
  DragSource,
  DropTarget,
  MatchDraft,
  Notes,
} from "../types/formation";
import { useSaveFormation } from "./use-save-formation";

/** HTTP status the backend returns when a battle is already locked. */
const CONFLICT_STATUS = 409;

/** Stable stand-in while no battle day is selected, so memos do not rerun. */
const EMPTY_MATCHES: MatchDraft[] = [{ assignment: {}, notes: {} }];

/** Ceiling on matches per day — mirrors the `.max(2)` the backend validates. */
const MAX_MATCHES = 2;

/** The draft being edited: the open day's matches and everything that writes them. */
export interface FormationDraftState {
  /** Matches of the open day, draft where one exists, saved copy otherwise */
  matches: MatchDraft[];
  /** How many matches the open day has, 1 or 2 */
  matchCount: number;
  /** Sub-tab open inside the day: 0 = match 1, 1 = match 2 */
  activeMatchIndex: number;
  /** Who stands in which slot, for the open match */
  assignment: Assignment;
  /** Note of each slot, for the open match */
  notes: Notes;
  /** Whether the open day differs from its saved copy */
  dirty: boolean;
  /** Every day of the week that differs from its saved copy */
  dirtySessionIds: Set<string>;
  /** Whether a second match may still be added */
  canAddMatch: boolean;
  /** Number of slots in the layout */
  slotCount: number;
  /** Open another match inside the day */
  setActiveMatch: (index: number) => void;
  /** Write the note of one slot in the open match */
  setNote: (slotId: string, text: string) => void;
  /** Clone match 1 into a new match 2 and open it */
  addMatch: () => void;
  /** Drop match 2 and go back to match 1 */
  removeMatch: () => void;
  /** Empty every slot of every match of the open day */
  clearActiveDraft: () => void;
  /** Discard the open day's draft, falling back to the saved copy */
  resetActive: () => void;
  /** Fill a day that has no draft yet with a proposed line-up */
  seedFrom: (proposal: MatchDraft[]) => void;
  /** Resolve one finished drag gesture into the open match */
  applyDrop: (
    source: DragSource,
    characterId: string,
    target: DropTarget
  ) => void;
  /** Persist the open day's draft — both matches at once */
  handleSave: () => Promise<void>;
  /** True while the save request is in flight */
  saving: boolean;
  /** Message of the last failed save, undefined when the last save was fine */
  saveErrorMessage: string | undefined;
}

/**
 * The draft layer: merges the saved formations from TanStack Query with the
 * per-battle drafts held in Zustand, and owns every edit the user makes to
 * them, so the rules about what a draft edit means live in one file. It is the
 * only writer of `drafts`: the pool proposes a line-up for an empty day and
 * hands it here through `seedFrom`, rather than reaching into the store.
 * @param sessions - Battles of the week on screen, with their saved formations
 * @param activeSessionId - Battle whose tab is open, null when there is none
 * @param editable - Whether the open battle still accepts edits
 * @param refetchFormations - Reload the formations, called when a save hits a lock
 * @returns The open day's draft plus the handlers that edit and save it
 */
export function useFormationDraft(
  sessions: SessionFormation[],
  activeSessionId: string | null,
  editable: boolean,
  refetchFormations: () => void
): FormationDraftState {
  const drafts = useFormationStore((s) => s.drafts);
  const ensureDraft = useFormationStore((s) => s.ensureDraft);
  const setDraft = useFormationStore((s) => s.setDraft);
  const clearDraft = useFormationStore((s) => s.clearDraft);
  const drop = useFormationStore((s) => s.drop);
  const setNoteInStore = useFormationStore((s) => s.setNote);
  const setActiveMatch = useFormationStore((s) => s.setActiveMatch);
  const storedMatchIndex = useFormationStore((s) => s.activeMatchIndex);

  const saveMutation = useSaveFormation();

  const savedBySession = useMemo(() => {
    const map: Record<string, MatchDraft[]> = {};

    for (const session of sessions) {
      map[session.sessionId] = fromWireMatches(session.matches, FORMATION.slots);
    }

    return map;
  }, [sessions]);

  const matchesBySession = useMemo(() => {
    const map: Record<string, MatchDraft[]> = {};

    for (const session of sessions) {
      map[session.sessionId] =
        drafts[session.sessionId] ?? savedBySession[session.sessionId];
    }

    return map;
  }, [sessions, drafts, savedBySession]);

  const dirtySessionIds = useMemo(() => {
    const dirty = new Set<string>();

    for (const session of sessions) {
      if (
        isDayDirty(drafts[session.sessionId], savedBySession[session.sessionId])
      ) {
        dirty.add(session.sessionId);
      }
    }

    return dirty;
  }, [sessions, drafts, savedBySession]);

  const matches = useMemo(
    () =>
      (activeSessionId ? matchesBySession[activeSessionId] : null) ??
      EMPTY_MATCHES,
    [activeSessionId, matchesBySession]
  );

  const activeMatchIndex = resolveActiveMatchIndex(
    matches.length,
    storedMatchIndex
  );

  const activeMatch = matches[activeMatchIndex] ?? EMPTY_MATCHES[0];

  /**
   * Run one edit against the open day, making sure the day has a draft to edit
   * first. This is the single place the saved copy turns into a draft: every
   * writer below goes through here, so no caller has to hold the saved copy or
   * know which day it belongs to.
   * @param write - The store call to run, given the open day's id
   */
  function editActiveDraft(write: (sessionId: string) => void) {
    if (!activeSessionId) return;

    const sessionId = activeSessionId;
    const readDraft = () => useFormationStore.getState().drafts[sessionId];
    const hadDraft = Boolean(readDraft());

    // Zustand's `set` is synchronous, so the write below already sees the draft
    // this line put in place.
    ensureDraft(sessionId, matches);
    write(sessionId);

    // The write changed nothing — a drag released outside every droppable, say.
    // Put the day back the way it was found: a draft equal to the saved copy
    // would shadow the next refetch, could not be discarded (Đặt lại is
    // disabled while the day is clean), and would block a prefill that only
    // becomes eligible later. Reference equality is the test because every
    // write that does change something builds a new array.
    if (!hadDraft && readDraft() === matches) clearDraft(sessionId);
  }

  /**
   * Hand one finished gesture to the store as a draft edit.
   * @param source - Where the drag started
   * @param characterId - Character being dragged
   * @param target - Where it was released, null when outside every droppable
   */
  function applyDrop(
    source: DragSource,
    characterId: string,
    target: DropTarget
  ) {
    editActiveDraft((sessionId) =>
      drop(sessionId, activeMatchIndex, source, characterId, target)
    );
  }

  /**
   * Write the note of one slot in the match currently open.
   * @param slotId - Slot the note belongs to
   * @param text - New text, raw as typed
   */
  function setNote(slotId: string, text: string) {
    editActiveDraft((sessionId) =>
      setNoteInStore(sessionId, activeMatchIndex, slotId, text)
    );
  }

  /**
   * Fill the open day with a proposed line-up, but only while it has no draft
   * of its own — a proposal never overwrites something the user typed. The
   * pool computes the proposal and calls this; deciding whether it lands is
   * this hook's, because this hook owns the drafts. Memoised because the pool
   * holds it as an effect dependency.
   * @param proposal - Matches to start the day from
   */
  const seedFrom = useCallback(
    (proposal: MatchDraft[]) => {
      if (!activeSessionId) return;

      ensureDraft(activeSessionId, proposal);
    },
    [activeSessionId, ensureDraft]
  );

  /** Clone match 1 into a new match 2 and open it. */
  function addMatch() {
    if (!activeSessionId || matches.length >= MAX_MATCHES) return;

    // Copy match 1 as it stands, absentees in their slots included — never pull anyone out behind the
    // user's back. Notes travel along untouched.
    setDraft(activeSessionId, [
      ...matches,
      {
        assignment: { ...matches[0].assignment },
        notes: { ...matches[0].notes },
      },
    ]);
    setActiveMatch(matches.length);
  }

  /** Drop match 2 and go back to match 1. */
  function removeMatch() {
    if (!activeSessionId || matches.length < 2) return;

    setDraft(activeSessionId, [matches[0]]);
    setActiveMatch(0);
  }

  /** Empty every slot of every match of the open day, keeping the match count. */
  function clearActiveDraft() {
    if (!activeSessionId) return;

    const cleared = matches.map(() => ({
      assignment: fromWire({}, FORMATION.slots),
      notes: {} as Notes,
    }));
    setDraft(activeSessionId, cleared);
  }

  /** Discard the open day's draft, falling back to the saved copy. */
  function resetActive() {
    if (!activeSessionId) return;

    clearDraft(activeSessionId);
  }

  /**
   * Persist the open day's draft — both matches at once.
   * A failed save keeps the draft: the toolbar shows the message and the user
   * can retry. A 409 means the day just crossed its start time, so refetch to
   * flip the screen into read-only.
   */
  async function handleSave() {
    if (!activeSessionId) return;

    try {
      await saveMutation.mutateAsync({
        sessionId: activeSessionId,
        matches: toWireMatches(matches),
      });
      clearDraft(activeSessionId);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === CONFLICT_STATUS) {
        refetchFormations();
      }
    }
  }

  return {
    matches,
    matchCount: matches.length,
    activeMatchIndex,
    assignment: activeMatch.assignment,
    notes: activeMatch.notes,
    dirty: activeSessionId ? dirtySessionIds.has(activeSessionId) : false,
    dirtySessionIds,
    canAddMatch: editable && matches.length < MAX_MATCHES,
    slotCount: FORMATION.slots.length,
    setActiveMatch,
    setNote,
    addMatch,
    removeMatch,
    clearActiveDraft,
    resetActive,
    seedFrom,
    applyDrop,
    handleSave,
    saving: saveMutation.isPending,
    saveErrorMessage:
      saveMutation.error instanceof ApiError
        ? saveMutation.error.message
        : undefined,
  };
}
