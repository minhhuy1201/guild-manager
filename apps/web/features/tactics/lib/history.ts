import type { TacticElement } from "@guild/shared/schemas";

/** How many undo steps one stage keeps. Older steps fall off the bottom. */
export const HISTORY_LIMIT = 50;

/**
 * Undo and redo stacks, one pair per stage. Keyed by stage id so switching stage leaves the other
 * stage's history exactly as it was.
 */
export interface EditorHistory {
  /** Past states, oldest first, per stage id */
  past: Record<string, TacticElement[][]>;
  /** States taken back by an undo, newest first, per stage id */
  future: Record<string, TacticElement[][]>;
}

/** The result of an undo or a redo: the elements to apply, and the history that follows. */
export interface HistoryStep {
  /** Elements to put on the stage, or null when the stack was empty */
  elements: TacticElement[] | null;
  /** The history after the step */
  history: EditorHistory;
}

/**
 * An empty history.
 * @returns A history with no steps for any stage
 */
export function createHistory(): EditorHistory {
  return { past: {}, future: {} };
}

/**
 * Record the elements a stage held before an edit.
 * Pushing also drops the redo stack: once the drawing moves forward, the taken-back states are no
 * longer reachable and offering them would replay an edit the admin has moved past.
 * @param history - The history so far
 * @param stageId - Stage the edit happened on
 * @param elements - The stage's elements BEFORE the edit
 * @returns A new history carrying the step
 */
export function pushHistory(
  history: EditorHistory,
  stageId: string,
  elements: TacticElement[]
): EditorHistory {
  const past = [...(history.past[stageId] ?? []), elements].slice(
    -HISTORY_LIMIT
  );

  return {
    past: { ...history.past, [stageId]: past },
    future: { ...history.future, [stageId]: [] },
  };
}

/**
 * Take back the latest step of one stage.
 * @param history - The history so far
 * @param stageId - Stage to undo on
 * @param current - The stage's elements right now, kept so redo can bring them back
 * @returns The elements to apply (null when there was nothing to undo) and the new history
 */
export function undoHistory(
  history: EditorHistory,
  stageId: string,
  current: TacticElement[]
): HistoryStep {
  const past = history.past[stageId] ?? [];
  const previous = past.at(-1);

  if (!previous) {
    return { elements: null, history };
  }

  return {
    elements: previous,
    history: {
      past: { ...history.past, [stageId]: past.slice(0, -1) },
      future: {
        ...history.future,
        [stageId]: [current, ...(history.future[stageId] ?? [])],
      },
    },
  };
}

/**
 * Put back the latest state an undo took away.
 * @param history - The history so far
 * @param stageId - Stage to redo on
 * @param current - The stage's elements right now, kept so undo can take them back again
 * @returns The elements to apply (null when there was nothing to redo) and the new history
 */
export function redoHistory(
  history: EditorHistory,
  stageId: string,
  current: TacticElement[]
): HistoryStep {
  const future = history.future[stageId] ?? [];
  const [next, ...rest] = future;

  if (!next) {
    return { elements: null, history };
  }

  return {
    elements: next,
    history: {
      past: {
        ...history.past,
        [stageId]: [...(history.past[stageId] ?? []), current].slice(
          -HISTORY_LIMIT
        ),
      },
      future: { ...history.future, [stageId]: rest },
    },
  };
}

/**
 * Forget every step of one stage, both ways - for a stage that no longer exists, whose steps would
 * lead back to nothing.
 * @param history - The stacks to trim
 * @param stageId - The stage whose steps go
 * @returns New stacks without that stage; the others untouched
 */
export function dropStageHistory(
  history: EditorHistory,
  stageId: string
): EditorHistory {
  return {
    past: withoutStage(history.past, stageId),
    future: withoutStage(history.future, stageId),
  };
}

/**
 * One stack map minus one stage's entry.
 * @param stacks - Steps keyed by stage id
 * @param stageId - The stage whose entry goes
 * @returns A new map without that entry
 */
function withoutStage(
  stacks: EditorHistory["past"],
  stageId: string
): EditorHistory["past"] {
  return Object.fromEntries(
    Object.entries(stacks).filter(([id]) => id !== stageId)
  );
}
