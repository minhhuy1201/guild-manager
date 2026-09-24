"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import type { TacticTokenSize } from "@guild/shared/enums";
import { assertNever } from "@guild/shared/lib";
import {
  TACTIC_LIMITS,
  type TacticElement,
  type TacticStage,
} from "@guild/shared/schemas";

import { toastError } from "@/components/shared/toast";
import { errorMessageOf } from "@/lib/error-message";
import { combineQueries, type QueryGroupState } from "@/lib/query-group";
import {
  DEFAULT_PALETTE_TOKEN,
  type BuiltInToken,
} from "../lib/built-in-tokens";
import {
  createArrow,
  createFreehand,
  createText,
  createToken,
  extendFreehand,
  pointArrow,
} from "../lib/create-element";
import {
  elementsInRect,
  hitTest,
  rectFromPoints,
  type MapPoint,
  type MapRect,
} from "../lib/element-geometry";
import { SceneReadError } from "../lib/read-scene";
import {
  addElement,
  isStageFull,
  removeElement,
  removeElements,
  resizeTokens,
  translateElements,
} from "../lib/scene";
import { useTacticEditorStore } from "../store/editor-store";
import { PICKING_TOOLS, type PointerModifiers } from "../types/tactic";
import { useSaveTactic } from "./use-save-tactic";
import { useTactic } from "./use-tactic";

/** Said when the fresh read failed and the draft had to start from the copy left in the cache. */
export const STALE_DRAFT_WARNING =
  "Không tải được bản mới nhất, đang mở bản đã lưu trong máy. Lưu lúc này có thể ghi đè thay đổi của admin khác.";

/**
 * How far, in map units, the pointer has to travel from the press before it counts as a drag. Below
 * this a press is a click: a hand never lets go exactly where it pressed, and a click must neither
 * nudge what it picked up nor leave an undo step behind.
 */
export const DRAG_THRESHOLD = 4;

/** Keys held when a press comes without any, as a touch always does. */
const NO_MODIFIERS: PointerModifiers = { shift: false };

/**
 * A press on the map that is still held down. Switch on `kind` and end with `assertNever`.
 */
type Gesture =
  | {
      kind: "marquee";
      /** Where the press went down */
      origin: MapPoint;
      /** The stage the marquee is drawn over */
      stage: TacticStage;
      /** Selection the marquee adds to - empty unless Shift was held */
      base: readonly string[];
      /** The box so far, or null while the pointer is still within the drag threshold */
      rect: MapRect | null;
    }
  | {
      kind: "move";
      /** Where the press went down */
      origin: MapPoint;
      /** The stage as it was at the press, which every move is measured against */
      stage: TacticStage;
      /** Elements the drag carries */
      ids: readonly string[];
      /** Element the press landed on */
      pressedId: string;
      /**
       * The elements this drag last wrote to the stage - the stage's own until the first move. Any
       * other array on the stage means something else edited it mid-drag
       */
      written: TacticElement[];
    };

/**
 * The elements a gesture expects its stage to hold right now: what a drag last wrote, or the stage
 * as it was at the press for anything that writes nothing.
 * @param gesture - The gesture still held down
 * @returns The very array the stage should still hold
 */
function expectedElements(gesture: Gesture): TacticElement[] {
  switch (gesture.kind) {
    case "marquee":
      return gesture.stage.elements;
    case "move":
      return gesture.written;
    default:
      return assertNever(gesture);
  }
}

/**
 * Whether something else changed the stage under a gesture: a Delete, an undo or a stage switch
 * all still run while the button is held. Carrying on would write elements from before that edit
 * back over it, or select ids read off a stage that is no longer open - tokens keep their id across
 * a duplicated stage, so those ids can land on pieces the marquee never covered.
 * @param gesture - The gesture still held down
 * @returns True when the gesture has to be dropped
 */
function isStageChangedUnder(gesture: Gesture): boolean {
  const state = useTacticEditorStore.getState();
  const stage = state.scene?.stages.find(
    (candidate) => candidate.id === gesture.stage.id
  );

  return (
    state.activeStageId !== gesture.stage.id ||
    stage?.elements !== expectedElements(gesture)
  );
}

/** What the editor screen needs to render itself. */
export interface TacticEditorScreen {
  /** Loading and error state of the tactic query */
  state: QueryGroupState;
  /** Name of the tactic, empty until it has loaded */
  name: string;
  /** The stage being drawn on, null until the scene has loaded */
  activeStage: TacticStage | null;
  /** The selected elements on the open stage, in drawing order; the action bar is drawn on them */
  selectedElements: TacticElement[];
  /** The marquee being dragged out, or null when none is */
  marquee: MapRect | null;
  /** Whether a selection is being dragged; the action bar hides while it is */
  isMoving: boolean;
  /** Whether there is an edit to take back on the open stage */
  canUndo: boolean;
  /** Whether there is an edit to put back on the open stage */
  canRedo: boolean;
  /** Whether a save is in flight */
  saving: boolean;
  /** Palette entry the next click on the map drops — always one, never nothing */
  paletteToken: BuiltInToken;
  /** Where a note is being written, while the note dialog is open */
  pendingTextPoint: MapPoint | null;
  /** Write the note that was being composed */
  confirmText: (text: string) => void;
  /** Drop the note that was being composed */
  cancelText: () => void;
  /** Pick a palette entry */
  selectPaletteToken: (token: BuiltInToken) => void;
  /** A palette entry started being dragged out of the palette */
  onPaletteDragStart: (token: BuiltInToken) => void;
  /** That drag ended, dropped or cancelled */
  onPaletteDragEnd: () => void;
  /** Whether a palette entry is being dragged, so the map may accept the drop */
  isDraggingPaletteToken: () => boolean;
  /** The dragged palette entry was let go over the map, at this point */
  onPaletteDrop: (point: MapPoint) => void;
  /** Pointer went down on the map, with the keys held; none when left out */
  onPointerDown: (point: MapPoint, modifiers?: PointerModifiers) => void;
  /** Pointer moved over the map */
  onPointerMove: (point: MapPoint) => void;
  /** Pointer was let go */
  onPointerUp: () => void;
  /** Resize the selected tokens, from the action bar */
  onSelectionTokenSizeChange: (size: TacticTokenSize) => void;
  /** Pick the size new tokens take, from the toolbar, and give it to the selected tokens too */
  onToolbarTokenSizeChange: (size: TacticTokenSize) => void;
  /** Delete every selected element */
  onDeleteSelected: () => void;
  /** Persist the whole scene; resolves true once the server accepted it */
  onSave: () => Promise<boolean>;
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
  const [paletteToken, setPaletteToken] = useState<BuiltInToken>(
    DEFAULT_PALETTE_TOKEN
  );
  const gestureRef = useRef<Gesture | null>(null);
  // A ref, not state: nothing on screen changes while an entry is dragged - the browser draws the
  // drag itself - and the drop is read in the same event loop turn as the last dragover.
  const draggedTokenRef = useRef<BuiltInToken | null>(null);
  const [marquee, setMarquee] = useState<MapRect | null>(null);
  // What the running drag last wrote, or null: a drag counts as running only while the open stage
  // still holds exactly that, so a Delete or an undo mid-drag gives the action bar back at once.
  const [movedElements, setMovedElements] = useState<TacticElement[] | null>(
    null
  );
  const [pendingTextPoint, setPendingTextPoint] = useState<MapPoint | null>(
    null
  );
  const loadedIdRef = useRef<string | null>(null);
  // A ref rather than the mutation's `isPending`: a second Ctrl+S can land before the render that
  // would carry the first one's pending flag.
  const savingRef = useRef(false);

  const scene = useTacticEditorStore((store) => store.scene);
  const activeStageId = useTacticEditorStore((store) => store.activeStageId);
  const selectedElementIds = useTacticEditorStore(
    (store) => store.selectedElementIds
  );
  const tool = useTacticEditorStore((store) => store.tool);
  const color = useTacticEditorStore((store) => store.color);
  const strokeWidth = useTacticEditorStore((store) => store.strokeWidth);
  const tokenSize = useTacticEditorStore((store) => store.tokenSize);
  const history = useTacticEditorStore((store) => store.history);
  const loadScene = useTacticEditorStore((store) => store.loadScene);
  const commit = useTacticEditorStore((store) => store.commit);
  const selectElements = useTacticEditorStore((store) => store.selectElements);
  const toggleElementSelection = useTacticEditorStore(
    (store) => store.toggleElementSelection
  );
  const clearSelection = useTacticEditorStore((store) => store.clearSelection);
  const setTokenSize = useTacticEditorStore((store) => store.setTokenSize);
  const setTool = useTacticEditorStore((store) => store.setTool);
  const updateDrawing = useTacticEditorStore((store) => store.updateDrawing);
  const updateElements = useTacticEditorStore((store) => store.updateElements);
  const markSaved = useTacticEditorStore((store) => store.markSaved);
  const reset = useTacticEditorStore((store) => store.reset);

  const tactic = tacticQuery.data;
  const isReadSettled = !tacticQuery.isFetching;
  const isReadFailed = tacticQuery.isError;

  // The saved scene comes through this door exactly once per tactic, and only once the read that
  // opening the editor started has settled - a cached copy may be one another admin has since saved
  // over. After that the store owns the drawing, and a refetch must not overwrite it.
  useEffect(() => {
    if (!tactic || !isReadSettled || loadedIdRef.current === tactic.id) {
      return;
    }

    loadedIdRef.current = tactic.id;
    loadScene(tactic.scene);
    if (isReadFailed) toastError(STALE_DRAFT_WARNING);
  }, [tactic, isReadSettled, isReadFailed, loadScene]);

  useEffect(() => reset, [reset]);

  const activeStage =
    scene?.stages.find((stage) => stage.id === activeStageId) ?? null;
  const selectedElements = useMemo(() => {
    const selected = new Set(selectedElementIds);

    return (activeStage?.elements ?? []).filter((element) =>
      selected.has(element.id)
    );
  }, [activeStage, selectedElementIds]);

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

  /**
   * Refuse to add to a stage that holds as many elements as a stage may, saying so.
   * @param stage - The stage about to receive an element
   * @returns True when the stage is full and nothing may be added
   */
  const refuseFullStage = useCallback((stage: TacticStage): boolean => {
    if (!isStageFull(stage)) {
      return false;
    }

    toastError(
      `Giai đoạn này đã đủ ${TACTIC_LIMITS.elementsPerStage} phần tử. Xoá bớt hoặc thêm giai đoạn mới.`
    );
    return true;
  }, []);

  /**
   * Stand a palette entry on the stage at the toolbar's colour and size, as one undo step. Room on
   * the stage is the caller's to check.
   * @param stage - The open stage
   * @param token - The palette entry to place
   * @param point - Where it stands, in map units
   */
  const placeToken = useCallback(
    (stage: TacticStage, token: BuiltInToken, point: MapPoint) => {
      commitElements(
        addElement(stage, createToken(token, point, color, tokenSize)).elements
      );
    },
    [color, tokenSize, commitElements]
  );

  /**
   * Pick up the element a press landed on, ready to drag it with the rest of the selection.
   * @param stage - The open stage
   * @param elementId - The element under the pointer
   * @param press - Where the press went down
   * @param toggle - Whether the press adds or removes this one element instead
   */
  const pressElement = useCallback(
    (
      stage: TacticStage,
      elementId: string,
      press: MapPoint,
      toggle: boolean
    ) => {
      if (toggle) {
        toggleElementSelection(elementId);
        return;
      }

      const selection = useTacticEditorStore.getState().selectedElementIds;
      // Pressing inside the selection carries all of it; pressing outside starts a new one.
      const ids = selection.includes(elementId) ? selection : [elementId];

      if (ids !== selection) selectElements(ids);
      gestureRef.current = {
        kind: "move",
        origin: press,
        stage,
        ids,
        pressedId: elementId,
        written: stage.elements,
      };
    },
    [toggleElementSelection, selectElements]
  );

  /**
   * Begin a marquee on empty map.
   * @param stage - The open stage
   * @param press - Where the press went down
   * @param additive - Whether it adds to the selection rather than replacing it
   */
  const startMarquee = useCallback(
    (stage: TacticStage, press: MapPoint, additive: boolean) => {
      const base = additive
        ? useTacticEditorStore.getState().selectedElementIds
        : [];

      if (!additive) clearSelection();
      gestureRef.current = {
        kind: "marquee",
        origin: press,
        stage,
        base,
        rect: null,
      };
    },
    [clearSelection]
  );

  const onPointerDown = useCallback(
    (point: MapPoint, modifiers: PointerModifiers = NO_MODIFIERS) => {
      if (!isAdmin || !activeStage) {
        return;
      }

      // A press that lands on something already drawn edits that thing instead of drawing again:
      // the select tool picks it up, and a token refuses to stack itself on the piece under the
      // pointer. Both work on a full stage, since neither adds anything.
      if (PICKING_TOOLS.has(tool)) {
        const hit = hitTest(activeStage, point);

        if (hit) {
          // Only the select tool reads Shift: the token tool has no marquee to add to.
          pressElement(activeStage, hit, point, tool === "select" && modifiers.shift);
          return;
        }

        if (tool === "select") {
          startMarquee(activeStage, point, modifiers.shift);
          return;
        }
      }

      // Erasing is the one tool that still works on a full stage — it is how the admin makes room.
      if (tool !== "eraser" && refuseFullStage(activeStage)) {
        return;
      }

      // `select` returned above, so it is not one of the cases left here.
      switch (tool) {
        case "token":
          placeToken(activeStage, paletteToken, point);
          return;
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
      refuseFullStage,
      placeToken,
      pressElement,
      startMarquee,
    ]
  );

  const dragGesture = useCallback(
    (gesture: Gesture, point: MapPoint) => {
      if (isStageChangedUnder(gesture)) {
        gestureRef.current = null;
        setMarquee(null);
        setMovedElements(null);
        return;
      }

      const isPastThreshold =
        Math.hypot(point.x - gesture.origin.x, point.y - gesture.origin.y) >=
        DRAG_THRESHOLD;

      switch (gesture.kind) {
        case "marquee": {
          if (!gesture.rect && !isPastThreshold) return;

          const rect = rectFromPoints(gesture.origin, point);
          gestureRef.current = { ...gesture, rect };
          setMarquee(rect);
          return;
        }
        case "move": {
          const moved = gesture.written !== gesture.stage.elements;

          if (!moved && !isPastThreshold) return;

          // Measured from the press on the stage as it was then, not added up move by move, so a
          // long drag cannot drift from the pointer.
          const { elements } = translateElements(
            gesture.stage,
            gesture.ids,
            point.x - gesture.origin.x,
            point.y - gesture.origin.y
          );

          // The first move records the drag's one undo step; the rest replace it in place.
          if (moved) updateElements(gesture.stage.id, elements);
          else commit(gesture.stage.id, elements);

          gestureRef.current = { ...gesture, written: elements };
          setMovedElements(elements);
          return;
        }
        default:
          assertNever(gesture);
      }
    },
    [commit, updateElements]
  );

  const onPointerMove = useCallback(
    (point: MapPoint) => {
      const gesture = gestureRef.current;

      if (gesture) {
        dragGesture(gesture, point);
        return;
      }

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
      updateDrawing(activeStage.id, next);
    },
    [activeStage, updateDrawing, dragGesture]
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

  const onPaletteDragStart = useCallback((token: BuiltInToken) => {
    draggedTokenRef.current = token;
  }, []);

  const onPaletteDragEnd = useCallback(() => {
    draggedTokenRef.current = null;
  }, []);

  const isDraggingPaletteToken = useCallback(
    () => draggedTokenRef.current !== null,
    []
  );

  const onPaletteDrop = useCallback(
    (point: MapPoint) => {
      const token = draggedTokenRef.current;
      draggedTokenRef.current = null;

      if (!token || !isAdmin || !activeStage) {
        return;
      }

      // Dropping an entry says the same as clicking it in the palette, so the palette shows what
      // the next click on the map drops. Unlike a click, a drop never picks up what is under it:
      // dragging a piece out of the palette can only mean adding one.
      setPaletteToken(token);
      setTool("token");
      if (refuseFullStage(activeStage)) return;
      placeToken(activeStage, token, point);
    },
    [isAdmin, activeStage, setTool, refuseFullStage, placeToken]
  );

  const onPointerUp = useCallback(() => {
    drawingRef.current = null;

    const gesture = gestureRef.current;
    gestureRef.current = null;

    if (!gesture) {
      return;
    }

    if (isStageChangedUnder(gesture)) {
      setMarquee(null);
      setMovedElements(null);
      return;
    }

    switch (gesture.kind) {
      case "marquee": {
        if (!gesture.rect) return;

        const hits = elementsInRect(gesture.stage, gesture.rect);
        selectElements([...new Set([...gesture.base, ...hits])]);
        setMarquee(null);
        return;
      }
      case "move":
        setMovedElements(null);
        // A click inside a selection, without a drag, means "this one": the drag is what the
        // rest of the selection was kept for.
        if (
          gesture.written === gesture.stage.elements &&
          gesture.ids.length > 1
        ) {
          selectElements([gesture.pressedId]);
        }
        return;
      default:
        assertNever(gesture);
    }
  }, [selectElements]);

  // The canvas only hears a release that happens over it. A button let go over the toolbar, or a
  // window that loses focus mid-drag, still has to end the stroke - the same guarantee the pan gets
  // in `useStageZoom` - or hovering back would keep drawing with no button held.
  useEffect(() => {
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
    window.addEventListener("blur", onPointerUp);

    return () => {
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("blur", onPointerUp);
    };
  }, [onPointerUp]);

  const onSelectionTokenSizeChange = useCallback(
    (size: TacticTokenSize) => {
      if (isAdmin && activeStage && selectedElementIds.length > 0) {
        commitElements(
          resizeTokens(activeStage, selectedElementIds, size).elements
        );
      }
    },
    [isAdmin, activeStage, selectedElementIds, commitElements]
  );

  const onToolbarTokenSizeChange = useCallback(
    (size: TacticTokenSize) => {
      setTokenSize(size);
      // Only a selection holding a token has anything to resize; anything else would record an
      // undo step that changes nothing.
      if (selectedElements.some((element) => element.kind === "token")) {
        onSelectionTokenSizeChange(size);
      }
    },
    [setTokenSize, selectedElements, onSelectionTokenSizeChange]
  );

  const onDeleteSelected = useCallback(() => {
    if (isAdmin && activeStage && selectedElementIds.length > 0) {
      commitElements(
        removeElements(activeStage, selectedElementIds).elements
      );
      clearSelection();
    }
  }, [
    isAdmin,
    activeStage,
    selectedElementIds,
    commitElements,
    clearSelection,
  ]);

  const onSave = useCallback(async () => {
    const current = useTacticEditorStore.getState().scene;

    if (!current || !isAdmin || savingRef.current) {
      return false;
    }

    savingRef.current = true;

    try {
      await saveTactic.mutateAsync({ id: tacticId, scene: current });
    } catch (caught) {
      // A failed save keeps the draft - the drawing on screen is worth far more than the error -
      // and says so in a toast, since the toolbar has no room for a sentence.
      toastError(errorMessageOf(caught, "Không lưu được chiến thuật."));
      return false;
    } finally {
      savingRef.current = false;
    }

    // `current` is what the server now holds; anything drawn since the request left stays unsaved.
    markSaved(current);
    return true;
  }, [isAdmin, saveTactic, tacticId, markSaved]);

  const onStageReady = useCallback((stage: Konva.Stage | null) => {
    stageRef.current = stage;
  }, []);

  // A scene this app cannot open says why in its own sentence; any other failure gets the generic
  // one.
  const queryState = combineQueries(
    [tacticQuery],
    tacticQuery.error instanceof SceneReadError
      ? tacticQuery.error.message
      : "Không tải được chiến thuật."
  );

  return {
    // Once a copy exists, a failed read never swaps the drawing for an error page: the draft starts
    // from that copy (with a warning), and a later background refetch failing changes nothing.
    state: tactic
      ? {
          ...queryState,
          isPending: scene === null,
          isError: false,
          errorMessage: "",
        }
      : queryState,
    name: tactic?.name ?? "",
    activeStage,
    selectedElements,
    marquee,
    isMoving: movedElements !== null && activeStage?.elements === movedElements,
    canUndo: (history.past[activeStageId ?? ""] ?? []).length > 0,
    canRedo: (history.future[activeStageId ?? ""] ?? []).length > 0,
    saving: saveTactic.isPending,
    paletteToken,
    selectPaletteToken: setPaletteToken,
    onPaletteDragStart,
    onPaletteDragEnd,
    isDraggingPaletteToken,
    onPaletteDrop,
    pendingTextPoint,
    confirmText,
    cancelText,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onSelectionTokenSizeChange,
    onToolbarTokenSizeChange,
    onDeleteSelected,
    onSave,
    onStageReady,
    stageRef,
  };
}
