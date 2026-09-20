"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Konva from "konva";
import type { TacticTokenSize } from "@guild/shared/enums";
import type { TacticElement, TacticStage } from "@guild/shared/schemas";

import { errorMessageOf } from "@/lib/error-message";
import { combineQueries, type QueryGroupState } from "@/lib/query-group";
import type { BuiltInToken } from "../lib/built-in-tokens";
import {
  createArrow,
  createFreehand,
  createText,
  createToken,
  extendFreehand,
  pointArrow,
} from "../lib/create-element";
import { hitTest, type MapPoint } from "../lib/hit-test";
import { migrateScene } from "../lib/migrate-scene";
import {
  addElement,
  moveToken,
  removeElement,
  resizeToken,
} from "../lib/scene";
import { useTacticEditorStore } from "../store/editor-store";
import { useSaveTactic } from "./use-save-tactic";
import { useTactic } from "./use-tactic";

/** What the editor screen needs to render itself. */
export interface TacticEditorScreen {
  /** Loading and error state of the tactic query */
  state: QueryGroupState;
  /** Name of the tactic, empty until it has loaded */
  name: string;
  /** The stage being drawn on, null until the scene has loaded */
  activeStage: TacticStage | null;
  /** Size of the selected token, or null when no token is selected */
  selectedTokenSize: TacticTokenSize | null;
  /** Whether there is an edit to take back on the open stage */
  canUndo: boolean;
  /** Whether there is an edit to put back on the open stage */
  canRedo: boolean;
  /** Whether a save is in flight */
  saving: boolean;
  /** What the last failed save said, verbatim from the backend */
  saveError: string | null;
  /** Palette entry the next click on the map drops */
  paletteToken: BuiltInToken | null;
  /** Where a note is being written, while the note dialog is open */
  pendingTextPoint: MapPoint | null;
  /** Write the note that was being composed */
  confirmText: (text: string) => void;
  /** Drop the note that was being composed */
  cancelText: () => void;
  /** Pick a palette entry */
  selectPaletteToken: (token: BuiltInToken) => void;
  /** Pointer went down on the map */
  onPointerDown: (point: MapPoint) => void;
  /** Pointer moved over the map */
  onPointerMove: (point: MapPoint) => void;
  /** Pointer was let go */
  onPointerUp: () => void;
  /** A token finished a drag */
  onTokenMoved: (tokenId: string, x: number, y: number) => void;
  /** An element was clicked */
  onElementClick: (elementId: string) => void;
  /** Resize the selected token */
  onTokenSizeChange: (size: TacticTokenSize) => void;
  /** Delete the selected element */
  onDeleteSelected: () => void;
  /** Persist the whole scene */
  onSave: () => void;
  /** Keep the Konva stage around for the image export */
  onStageReady: (stage: Konva.Stage | null) => void;
  /** The Konva stage, once it is mounted */
  stageRef: React.RefObject<Konva.Stage | null>;
}

/**
 * Everything the tactics editor does, in one place: it loads the saved scene once, hands the draft
 * to the store, turns pointer events into elements, and saves.
 *
 * The draft lives in Zustand rather than in the query cache because it is an unsent drawing
 * session, not a copy of a response — the same split the team builder uses for its formations.
 * @param tacticId - Id of the tactic being edited
 * @param isAdmin - Whether the viewer may write
 * @returns What the editor screen renders from
 */
export function useTacticEditor(
  tacticId: string,
  isAdmin: boolean
): TacticEditorScreen {
  const tacticQuery = useTactic(tacticId);
  const saveTactic = useSaveTactic();
  const stageRef = useRef<Konva.Stage | null>(null);
  const drawingRef = useRef<TacticElement | null>(null);
  const [paletteToken, setPaletteToken] = useState<BuiltInToken | null>(null);
  const [pendingTextPoint, setPendingTextPoint] = useState<MapPoint | null>(
    null
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const loadedIdRef = useRef<string | null>(null);

  const scene = useTacticEditorStore((store) => store.scene);
  const activeStageId = useTacticEditorStore((store) => store.activeStageId);
  const selectedElementId = useTacticEditorStore(
    (store) => store.selectedElementId
  );
  const tool = useTacticEditorStore((store) => store.tool);
  const color = useTacticEditorStore((store) => store.color);
  const strokeWidth = useTacticEditorStore((store) => store.strokeWidth);
  const history = useTacticEditorStore((store) => store.history);
  const loadScene = useTacticEditorStore((store) => store.loadScene);
  const commit = useTacticEditorStore((store) => store.commit);
  const selectElement = useTacticEditorStore((store) => store.selectElement);
  const markSaved = useTacticEditorStore((store) => store.markSaved);
  const reset = useTacticEditorStore((store) => store.reset);

  const tactic = tacticQuery.data;

  // The saved scene comes through this door exactly once per tactic: after that the store owns the
  // drawing, and a refetch must not overwrite what the admin has drawn since.
  useEffect(() => {
    if (!tactic || loadedIdRef.current === tactic.id) {
      return;
    }

    loadedIdRef.current = tactic.id;
    loadScene(migrateScene(tactic.scene));
  }, [tactic, loadScene]);

  useEffect(() => reset, [reset]);

  const activeStage =
    scene?.stages.find((stage) => stage.id === activeStageId) ?? null;
  const selectedElement =
    activeStage?.elements.find((element) => element.id === selectedElementId) ??
    null;

  /**
   * Write the open stage's elements through the store, recording one undo step.
   * @param elements - The stage's elements after the edit
   */
  const commitElements = useCallback(
    (elements: TacticElement[]) => {
      if (activeStageId) commit(activeStageId, elements);
    },
    [activeStageId, commit]
  );

  const onPointerDown = useCallback(
    (point: MapPoint) => {
      if (!isAdmin || !activeStage) {
        return;
      }

      switch (tool) {
        case "token": {
          if (!paletteToken) return;
          commitElements(
            addElement(activeStage, createToken(paletteToken, point, color))
              .elements
          );
          return;
        }
        case "arrow":
          drawingRef.current = createArrow(point, color, strokeWidth);
          commitElements([...activeStage.elements, drawingRef.current]);
          return;
        case "freehand":
          drawingRef.current = createFreehand(point, color, strokeWidth);
          commitElements([...activeStage.elements, drawingRef.current]);
          return;
        case "text":
          // The note's text comes from a dialog, not from the canvas: the screen opens it on this
          // point and calls `confirmText` when the admin is done.
          setPendingTextPoint(point);
          return;
        case "eraser": {
          const hit = hitTest(activeStage, point);
          if (hit) commitElements(removeElement(activeStage, hit).elements);
          return;
        }
      }
    },
    [
      isAdmin,
      activeStage,
      tool,
      paletteToken,
      color,
      strokeWidth,
      commitElements,
    ]
  );

  const onPointerMove = useCallback(
    (point: MapPoint) => {
      const drawing = drawingRef.current;

      if (!drawing || !activeStage) {
        return;
      }

      const next =
        drawing.kind === "arrow"
          ? pointArrow(drawing, point)
          : drawing.kind === "freehand"
            ? extendFreehand(drawing, point)
            : null;

      if (!next) {
        return;
      }

      drawingRef.current = next;
      // While a stroke grows it replaces itself in place: one undo step per stroke, not per point.
      useTacticEditorStore.setState((store) => ({
        scene: store.scene
          ? {
              ...store.scene,
              stages: store.scene.stages.map((stage) =>
                stage.id === activeStage.id
                  ? {
                      ...stage,
                      elements: stage.elements.map((element) =>
                        element.id === next.id ? next : element
                      ),
                    }
                  : stage
              ),
            }
          : store.scene,
        dirty: true,
      }));
    },
    [activeStage]
  );

  const confirmText = useCallback(
    (text: string) => {
      const trimmed = text.trim();

      if (activeStage && pendingTextPoint && trimmed) {
        commitElements(
          addElement(
            activeStage,
            createText(pendingTextPoint, trimmed, color)
          ).elements
        );
      }

      setPendingTextPoint(null);
    },
    [activeStage, pendingTextPoint, color, commitElements]
  );

  const cancelText = useCallback(() => setPendingTextPoint(null), []);

  const onPointerUp = useCallback(() => {
    drawingRef.current = null;
  }, []);

  const onTokenMoved = useCallback(
    (tokenId: string, x: number, y: number) => {
      if (isAdmin && activeStage) {
        commitElements(moveToken(activeStage, tokenId, x, y).elements);
      }
    },
    [isAdmin, activeStage, commitElements]
  );

  const onElementClick = useCallback(
    (elementId: string) => {
      if (tool !== "eraser") selectElement(elementId);
    },
    [tool, selectElement]
  );

  const onTokenSizeChange = useCallback(
    (size: TacticTokenSize) => {
      if (isAdmin && activeStage && selectedElementId) {
        commitElements(
          resizeToken(activeStage, selectedElementId, size).elements
        );
      }
    },
    [isAdmin, activeStage, selectedElementId, commitElements]
  );

  const onDeleteSelected = useCallback(() => {
    if (isAdmin && activeStage && selectedElementId) {
      commitElements(removeElement(activeStage, selectedElementId).elements);
      selectElement(null);
    }
  }, [
    isAdmin,
    activeStage,
    selectedElementId,
    commitElements,
    selectElement,
  ]);

  const onSave = useCallback(() => {
    const current = useTacticEditorStore.getState().scene;

    if (!current || !isAdmin) {
      return;
    }

    setSaveError(null);
    saveTactic
      .mutateAsync({ id: tacticId, scene: current })
      .then(markSaved)
      // A failed save keeps the draft: the drawing on screen is worth far more than the error.
      .catch((caught: unknown) =>
        setSaveError(errorMessageOf(caught, "Không lưu được chiến thuật."))
      );
  }, [isAdmin, saveTactic, tacticId, markSaved]);

  const onStageReady = useCallback((stage: Konva.Stage | null) => {
    stageRef.current = stage;
  }, []);

  return {
    state: combineQueries([tacticQuery], "Không tải được chiến thuật."),
    name: tactic?.name ?? "",
    activeStage,
    selectedTokenSize:
      selectedElement?.kind === "token" ? selectedElement.size : null,
    canUndo: (history.past[activeStageId ?? ""] ?? []).length > 0,
    canRedo: (history.future[activeStageId ?? ""] ?? []).length > 0,
    saving: saveTactic.isPending,
    saveError,
    paletteToken,
    selectPaletteToken: setPaletteToken,
    pendingTextPoint,
    confirmText,
    cancelText,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onTokenMoved,
    onElementClick,
    onTokenSizeChange,
    onDeleteSelected,
    onSave,
    onStageReady,
    stageRef,
  };
}
