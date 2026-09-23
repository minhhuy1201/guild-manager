import { create } from "zustand";
import type {
  TacticColor,
  TacticStrokeWidth,
  TacticTokenSize,
} from "@guild/shared/enums";
import type { TacticElement, TacticScene } from "@guild/shared/schemas";

import {
  createHistory,
  dropStageHistory,
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
  replaceStage,
} from "../lib/scene";
import type { TacticTool } from "../types/tactic";

/** The colour a fresh editor draws in. */
const DEFAULT_COLOR: TacticColor = "blue";

/** The stroke width a fresh editor draws with. */
const DEFAULT_STROKE_WIDTH: TacticStrokeWidth = 4;

/** The size a fresh editor drops tokens at. */
const DEFAULT_TOKEN_SIZE: TacticTokenSize = "md";

interface EditorState {
  /** What a click on the map does */
  tool: TacticTool;
  /** Colour every new element takes */
  color: TacticColor;
  /** Width every new stroke takes */
  strokeWidth: TacticStrokeWidth;
  /** Size every new token takes */
  tokenSize: TacticTokenSize;
  /** The scene being edited — a draft, not a copy of a response; null before one is loaded */
  scene: TacticScene | null;
  /** Stage whose tab is open */
  activeStageId: string | null;
  /** Elements the action bar, Delete and a drag act on, in the order they were picked */
  selectedElementIds: readonly string[];
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
  setTokenSize: (tokenSize: TacticTokenSize) => void;
  setActiveStage: (stageId: string) => void;
  /** Replace the whole selection */
  selectElements: (elementIds: readonly string[]) => void;
  /** Add one element to the selection, or take it out when it is already in */
  toggleElementSelection: (elementId: string) => void;
  clearSelection: () => void;
  togglePalette: () => void;
  /** Write one stage's elements, recording what they were so `undo` can put them back */
  commit: (stageId: string, elements: TacticElement[]) => void;
  /**
   * Swap the element being drawn for its grown self, without a step: the stroke's one undo step
   * was recorded by the `commit` that started it
   */
  updateDrawing: (stageId: string, element: TacticElement) => void;
  /**
   * Swap a stage's elements for their moved selves, without a step: a drag's one undo step was
   * recorded by the `commit` its first move made
   */
  updateElements: (stageId: string, elements: TacticElement[]) => void;
  undo: () => void;
  redo: () => void;
  addStage: () => void;
  duplicateStage: (stageId: string) => void;
  renameStage: (stageId: string, name: string) => void;
  removeStage: (stageId: string) => void;
  /**
   * The server accepted a scene: the draft is clean only if it is still that very scene, so edits
   * made while the request was out stay unsaved
   */
  markSaved: (sent: TacticScene) => void;
  /** Throw the session away — leaving the editor, or discarding the draft */
  reset: () => void;
}

/** The state a fresh editor starts from, and the one `reset` returns to. */
const INITIAL_STATE = {
  tool: "token" as TacticTool,
  color: DEFAULT_COLOR,
  strokeWidth: DEFAULT_STROKE_WIDTH,
  tokenSize: DEFAULT_TOKEN_SIZE,
  scene: null,
  activeStageId: null,
  selectedElementIds: [] as readonly string[],
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
      selectedElementIds: [],
      dirty: false,
      history: createHistory(),
    }),
  // Picking another tool means the admin moved on from what they had picked up; carrying the
  // selection across would leave Delete and the toolbar's size buttons acting on it unseen.
  setTool: (tool) => set({ tool, selectedElementIds: [] }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setTokenSize: (tokenSize) => set({ tokenSize }),
  setActiveStage: (stageId) =>
    set({ activeStageId: stageId, selectedElementIds: [] }),
  selectElements: (elementIds) => set({ selectedElementIds: elementIds }),
  toggleElementSelection: (elementId) =>
    set((state) => ({
      selectedElementIds: state.selectedElementIds.includes(elementId)
        ? state.selectedElementIds.filter((id) => id !== elementId)
        : [...state.selectedElementIds, elementId],
    })),
  clearSelection: () => set({ selectedElementIds: [] }),
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
        scene: replaceStage(scene, { ...stage, elements }),
        history: pushHistory(state.history, stageId, stage.elements),
        dirty: true,
      };
    }),
  updateDrawing: (stageId, element) =>
    set((state) => {
      const scene = state.scene;
      const stage = scene?.stages.find((candidate) => candidate.id === stageId);

      if (!scene || !stage) {
        return state;
      }

      return {
        scene: replaceStage(scene, {
          ...stage,
          elements: stage.elements.map((candidate) =>
            candidate.id === element.id ? element : candidate
          ),
        }),
        dirty: true,
      };
    }),
  updateElements: (stageId, elements) =>
    set((state) => {
      const scene = state.scene;
      const stage = scene?.stages.find((candidate) => candidate.id === stageId);

      if (!scene || !stage) {
        return state;
      }

      return { scene: replaceStage(scene, { ...stage, elements }), dirty: true };
    }),
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
        scene: replaceStage(state.scene, { ...stage, elements: step.elements }),
        history: step.history,
        selectedElementIds: [],
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
        scene: replaceStage(state.scene, { ...stage, elements: step.elements }),
        history: step.history,
        selectedElementIds: [],
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

    set({
      scene: next,
      history:
        next === scene
          ? state.history
          : dropStageHistory(state.history, stageId),
      activeStageId:
        state.activeStageId === stageId
          ? (next.stages[0]?.id ?? null)
          : state.activeStageId,
      dirty: next !== scene ? true : state.dirty,
    });
  },
  markSaved: (sent) => set((state) => ({ dirty: state.scene !== sent })),
  reset: () => set({ ...INITIAL_STATE, history: createHistory() }),
}));
