import { create } from "zustand";
import type { TacticColor, TacticStrokeWidth } from "@guild/shared/enums";
import type { TacticElement, TacticScene } from "@guild/shared/schemas";

import {
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type EditorHistory,
} from "../lib/history";
import {
  addStage,
  duplicateStage,
  removeStage,
  renameStage,
} from "../lib/scene";
import type { TacticTool } from "../types/tactic";

/** The colour a fresh editor draws in. */
const DEFAULT_COLOR: TacticColor = "red";

/** The stroke width a fresh editor draws with. */
const DEFAULT_STROKE_WIDTH: TacticStrokeWidth = 4;

interface EditorState {
  /** What a click on the map does */
  tool: TacticTool;
  /** Colour every new element takes */
  color: TacticColor;
  /** Width every new stroke takes */
  strokeWidth: TacticStrokeWidth;
  /** The scene being edited — a draft, not a copy of a response; null before one is loaded */
  scene: TacticScene | null;
  /** Stage whose tab is open */
  activeStageId: string | null;
  /** Element the toolbar's size buttons act on */
  selectedElementId: string | null;
  /** Whether the token palette is folded away */
  paletteCollapsed: boolean;
  /** Whether the draft holds edits the server has not seen */
  dirty: boolean;
  /** Undo and redo steps, one stack per stage */
  history: EditorHistory;
  /** Start a drawing session from the saved scene, clean and on the first stage */
  loadScene: (scene: TacticScene) => void;
  setTool: (tool: TacticTool) => void;
  setColor: (color: TacticColor) => void;
  setStrokeWidth: (strokeWidth: TacticStrokeWidth) => void;
  setActiveStage: (stageId: string) => void;
  selectElement: (elementId: string | null) => void;
  togglePalette: () => void;
  /** Write one stage's elements, recording what they were so `undo` can put them back */
  commit: (stageId: string, elements: TacticElement[]) => void;
  /** Replace the whole scene without recording a step — for stage operations */
  applySceneEdit: (scene: TacticScene) => void;
  undo: () => void;
  redo: () => void;
  addStage: () => void;
  duplicateStage: (stageId: string) => void;
  renameStage: (stageId: string, name: string) => void;
  removeStage: (stageId: string) => void;
  /** The draft has reached the server: keep it, but stop calling it unsaved */
  markSaved: () => void;
  /** Throw the session away — leaving the editor, or discarding the draft */
  reset: () => void;
}

/** The state a fresh editor starts from, and the one `reset` returns to. */
const INITIAL_STATE = {
  tool: "token" as TacticTool,
  color: DEFAULT_COLOR,
  strokeWidth: DEFAULT_STROKE_WIDTH,
  scene: null,
  activeStageId: null,
  selectedElementId: null,
  paletteCollapsed: false,
  dirty: false,
  history: createHistory(),
};

/**
 * Draft state of the tactics editor (Zustand).
 *
 * Holds ONLY the drawing session: the saved scene stays server data in TanStack Query, and the
 * draft comes through `loadScene` once when the editor opens. Every rule about what an edit means
 * lives in `lib/scene.ts`; this store adds none of its own.
 */
export const useTacticEditorStore = create<EditorState>((set, get) => ({
  ...INITIAL_STATE,
  loadScene: (scene) =>
    set({
      scene,
      activeStageId: scene.stages[0]?.id ?? null,
      selectedElementId: null,
      dirty: false,
      history: createHistory(),
    }),
  // The selection drives the size buttons, which only make sense for the token tool; carrying it
  // across a tool change would leave those buttons acting on something the admin stopped editing.
  setTool: (tool) => set({ tool, selectedElementId: null }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setActiveStage: (stageId) =>
    set({ activeStageId: stageId, selectedElementId: null }),
  selectElement: (elementId) => set({ selectedElementId: elementId }),
  togglePalette: () =>
    set((state) => ({ paletteCollapsed: !state.paletteCollapsed })),
  commit: (stageId, elements) =>
    set((state) => {
      const scene = state.scene;
      const stage = scene?.stages.find((candidate) => candidate.id === stageId);

      if (!scene || !stage) {
        return state;
      }

      return {
        scene: {
          ...scene,
          stages: scene.stages.map((candidate) =>
            candidate.id === stageId ? { ...candidate, elements } : candidate
          ),
        },
        history: pushHistory(state.history, stageId, stage.elements),
        dirty: true,
      };
    }),
  applySceneEdit: (scene) => set({ scene, dirty: true }),
  undo: () =>
    set((state) => {
      const stageId = state.activeStageId;
      const stage = state.scene?.stages.find(
        (candidate) => candidate.id === stageId
      );

      if (!state.scene || !stageId || !stage) {
        return state;
      }

      const step = undoHistory(state.history, stageId, stage.elements);

      if (!step.elements) {
        return state;
      }

      return {
        scene: {
          ...state.scene,
          stages: state.scene.stages.map((candidate) =>
            candidate.id === stageId
              ? { ...candidate, elements: step.elements ?? [] }
              : candidate
          ),
        },
        history: step.history,
        selectedElementId: null,
        dirty: true,
      };
    }),
  redo: () =>
    set((state) => {
      const stageId = state.activeStageId;
      const stage = state.scene?.stages.find(
        (candidate) => candidate.id === stageId
      );

      if (!state.scene || !stageId || !stage) {
        return state;
      }

      const step = redoHistory(state.history, stageId, stage.elements);

      if (!step.elements) {
        return state;
      }

      return {
        scene: {
          ...state.scene,
          stages: state.scene.stages.map((candidate) =>
            candidate.id === stageId
              ? { ...candidate, elements: step.elements ?? [] }
              : candidate
          ),
        },
        history: step.history,
        selectedElementId: null,
        dirty: true,
      };
    }),
  // Stage operations deliberately skip the undo stack: one Ctrl+Z resurrecting a whole deleted
  // stage is harder to predict than the confirmation dialog that guards the deletion.
  addStage: () => {
    const scene = get().scene;

    if (!scene) {
      return;
    }

    const next = addStage(scene);

    set({
      scene: next,
      activeStageId: next.stages.at(-1)?.id ?? get().activeStageId,
      dirty: next !== scene,
    });
  },
  duplicateStage: (stageId) => {
    const scene = get().scene;

    if (!scene) {
      return;
    }

    const next = duplicateStage(scene, stageId);
    const index = next.stages.findIndex(
      (candidate) => candidate.id === stageId
    );

    set({
      scene: next,
      activeStageId: next.stages[index + 1]?.id ?? get().activeStageId,
      dirty: next !== scene,
    });
  },
  renameStage: (stageId, name) => {
    const scene = get().scene;

    if (!scene) {
      return;
    }

    set({ scene: renameStage(scene, stageId, name), dirty: true });
  },
  removeStage: (stageId) => {
    const state = get();
    const scene = state.scene;

    if (!scene) {
      return;
    }

    const next = removeStage(scene, stageId);
    const historyPast = { ...state.history.past };
    const historyFuture = { ...state.history.future };
    delete historyPast[stageId];
    delete historyFuture[stageId];

    set({
      scene: next,
      // The removed stage's steps lead back to a stage that no longer exists.
      history:
        next === scene
          ? state.history
          : { past: historyPast, future: historyFuture },
      activeStageId:
        state.activeStageId === stageId
          ? (next.stages[0]?.id ?? null)
          : state.activeStageId,
      dirty: next !== scene ? true : state.dirty,
    });
  },
  markSaved: () => set({ dirty: false }),
  reset: () => set({ ...INITIAL_STATE, history: createHistory() }),
}));
