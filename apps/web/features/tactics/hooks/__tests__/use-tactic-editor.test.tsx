// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TACTIC_LIMITS, TACTIC_SCHEMA_VERSION } from "@guild/shared/schemas";
import type { TacticElement } from "@guild/shared/schemas";

vi.mock("../../api/tactics-api", () => ({
  fetchTactic: vi.fn(),
  saveTacticStages: vi.fn(),
}));

const toastError = vi.fn();
vi.mock("@/components/shared/toast", () => ({
  toastError: (message: string) => toastError(message),
  toastSuccess: vi.fn(),
}));

import { fetchTactic, saveTacticStages } from "../../api/tactics-api";
import { tacticKeys } from "../../api/tactics-keys";
import { useTacticEditorStore } from "../../store/editor-store";
import { STALE_DRAFT_WARNING, useTacticEditor } from "../use-tactic-editor";
import {
  createTestQueryClient,
  makeScene,
  makeTactic,
  renderTacticHook,
} from "./render-tactic-hook";

/** The elements the open stage holds right now. */
function elements(): TacticElement[] {
  const state = useTacticEditorStore.getState();

  return (
    state.scene?.stages.find((stage) => stage.id === state.activeStageId)
      ?.elements ?? []
  );
}

/**
 * Render the editor over a loaded tactic.
 * @param isAdmin - Whether the viewer may write
 * @returns The render result, once the saved scene has reached the store
 */
async function renderEditor(isAdmin = true) {
  const rendered = renderTacticHook(() => useTacticEditor("t1", isAdmin));

  await waitFor(() =>
    expect(useTacticEditorStore.getState().scene).not.toBeNull()
  );

  return rendered;
}

beforeEach(() => {
  toastError.mockReset();
  vi.mocked(fetchTactic).mockResolvedValue(makeTactic({ scene: makeScene(2) }));
  vi.mocked(saveTacticStages).mockResolvedValue(makeTactic());
});

describe("useTacticEditor", () => {
  it("copies the saved scene into the store once, clean", async () => {
    const { result } = await renderEditor();

    expect(result.current.name).toBe("Thủ cổng tây");
    expect(useTacticEditorStore.getState().dirty).toBe(false);
    expect(result.current.activeStage?.id).toBe("s1");
  });

  it("drops a palette token where the pointer went down", async () => {
    const { result } = await renderEditor();

    act(() =>
      result.current.selectPaletteToken({ label: "Đội công", icon: "swords" })
    );
    act(() => result.current.onPointerDown({ x: 100, y: 200 }));

    expect(elements()[0]).toMatchObject({
      kind: "token",
      label: "Đội công",
      x: 100,
      y: 200,
    });
  });

  it("drops Đội công while the user has picked nothing else", async () => {
    const { result } = await renderEditor();

    act(() => result.current.onPointerDown({ x: 10, y: 10 }));

    expect(elements()[0]).toMatchObject({
      kind: "token",
      label: "Đội công",
      icon: "swords",
    });
  });

  it("draws an arrow from the press to the release", async () => {
    const { result } = await renderEditor();

    act(() => useTacticEditorStore.getState().setTool("arrow"));
    act(() => result.current.onPointerDown({ x: 10, y: 10 }));
    act(() => result.current.onPointerMove({ x: 80, y: 60 }));
    act(() => result.current.onPointerUp());
    act(() => result.current.onPointerMove({ x: 999, y: 999 }));

    expect(elements()).toHaveLength(1);
    expect(elements()[0]).toMatchObject({
      kind: "arrow",
      points: [10, 10, 80, 60],
    });
  });

  it("ends a stroke released outside the canvas, so hovering back does not extend it", async () => {
    const { result } = await renderEditor();

    act(() => useTacticEditorStore.getState().setTool("arrow"));
    act(() => result.current.onPointerDown({ x: 10, y: 10 }));
    act(() => result.current.onPointerMove({ x: 80, y: 60 }));
    // The button comes up over the toolbar: the canvas never sees it, the window does.
    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
    act(() => result.current.onPointerMove({ x: 999, y: 999 }));

    expect(elements()[0]).toMatchObject({
      kind: "arrow",
      points: [10, 10, 80, 60],
    });
  });

  it("ends a stroke when the window loses focus mid-drag", async () => {
    const { result } = await renderEditor();

    act(() => useTacticEditorStore.getState().setTool("freehand"));
    act(() => result.current.onPointerDown({ x: 10, y: 10 }));
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    act(() => result.current.onPointerMove({ x: 500, y: 500 }));

    expect(elements()[0]).toMatchObject({
      kind: "freehand",
      points: [10, 10, 10, 10],
    });
  });

  it("grows one freehand stroke instead of one per point", async () => {
    const { result } = await renderEditor();

    act(() => useTacticEditorStore.getState().setTool("freehand"));
    act(() => result.current.onPointerDown({ x: 0, y: 0 }));
    act(() => result.current.onPointerMove({ x: 5, y: 5 }));
    act(() => result.current.onPointerMove({ x: 9, y: 9 }));

    expect(elements()).toHaveLength(1);
    expect(elements()[0]).toMatchObject({
      kind: "freehand",
      points: [0, 0, 0, 0, 5, 5, 9, 9],
    });
  });

  it("asks for a note's text before writing it, and drops it on cancel", async () => {
    const { result } = await renderEditor();

    act(() => useTacticEditorStore.getState().setTool("text"));
    act(() => result.current.onPointerDown({ x: 30, y: 40 }));
    expect(result.current.pendingTextPoint).toEqual({ x: 30, y: 40 });
    expect(elements()).toHaveLength(0);

    act(() => result.current.confirmText("  Tập kết  "));
    expect(elements()[0]).toMatchObject({
      kind: "text",
      text: "Tập kết",
      x: 30,
      y: 40,
    });

    act(() => useTacticEditorStore.getState().setTool("text"));
    act(() => result.current.onPointerDown({ x: 50, y: 50 }));
    act(() => result.current.cancelText());
    expect(elements()).toHaveLength(1);
    expect(result.current.pendingTextPoint).toBeNull();
  });

  it("erases what the pointer is over, and nothing when it is over empty map", async () => {
    const { result } = await renderEditor();

    act(() =>
      result.current.selectPaletteToken({ label: "Đội công", icon: "swords" })
    );
    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    act(() => useTacticEditorStore.getState().setTool("eraser"));

    act(() => result.current.onPointerDown({ x: 900, y: 900 }));
    expect(elements()).toHaveLength(1);

    act(() => result.current.onPointerDown({ x: 105, y: 102 }));
    expect(elements()).toHaveLength(0);
  });

  it("moves, resizes and deletes the token the admin selected", async () => {
    const { result } = await renderEditor();

    act(() =>
      result.current.selectPaletteToken({ label: "Đội công", icon: "swords" })
    );
    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    const tokenId = elements()[0].id;

    // Pressing a placed token picks it up; dragging it moves it by as far as the pointer went.
    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    act(() => result.current.onPointerMove({ x: 400, y: 500 }));
    act(() => result.current.onPointerUp());
    expect(elements()[0]).toMatchObject({ x: 400, y: 500 });

    // The whole element, not just its size: the action bar is drawn where the element is.
    expect(result.current.selectedElements).toEqual([
      expect.objectContaining({ id: tokenId, kind: "token", size: "md" }),
    ]);

    act(() => result.current.onSelectionTokenSizeChange("lg"));
    expect(elements()[0]).toMatchObject({ size: "lg" });

    act(() => result.current.onDeleteSelected());
    expect(elements()).toHaveLength(0);
    expect(result.current.selectedElements).toEqual([]);
  });

  it("picks up the element under the pointer with the select tool", async () => {
    const { result } = await renderEditor();

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    const tokenId = elements()[0].id;

    act(() => useTacticEditorStore.getState().setTool("select"));
    act(() => result.current.onPointerDown({ x: 104, y: 98 }));
    act(() => result.current.onPointerUp());

    expect(useTacticEditorStore.getState().selectedElementIds).toEqual([tokenId]);
    // Selecting draws nothing, so the stage still holds the one token.
    expect(elements()).toHaveLength(1);

    act(() => result.current.onPointerDown({ x: 900, y: 900 }));
    act(() => result.current.onPointerUp());
    expect(useTacticEditorStore.getState().selectedElementIds).toEqual([]);
  });

  // The complaint this answers: a click on a placed piece used to stack another one on top of it.
  it("selects a placed token instead of dropping a second one on it", async () => {
    const { result } = await renderEditor();

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    const tokenId = elements()[0].id;

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));

    expect(elements()).toHaveLength(1);
    expect(useTacticEditorStore.getState().selectedElementIds).toEqual([tokenId]);
  });

  it("still starts an arrow on top of a token, so it can point away from one", async () => {
    const { result } = await renderEditor();

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    act(() => useTacticEditorStore.getState().setTool("arrow"));
    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    act(() => result.current.onPointerMove({ x: 300, y: 300 }));

    expect(elements()).toHaveLength(2);
    expect(elements()[1]).toMatchObject({ kind: "arrow" });
  });

  it("refuses a 401st element on the open stage and says so", async () => {
    const full = makeScene(1);
    full.stages[0].elements = Array.from(
      { length: TACTIC_LIMITS.elementsPerStage },
      (_, index) => ({
        kind: "token" as const,
        id: `tk${index}`,
        label: "Đội công",
        icon: "swords" as const,
        x: 10,
        y: 10,
        size: "md" as const,
        color: "red" as const,
      })
    );
    vi.mocked(fetchTactic).mockResolvedValue(makeTactic({ scene: full }));

    const { result } = await renderEditor();
    act(() =>
      result.current.selectPaletteToken({ label: "Đội thủ", icon: "shield" })
    );
    act(() => result.current.onPointerDown({ x: 500, y: 500 }));

    expect(elements()).toHaveLength(TACTIC_LIMITS.elementsPerStage);
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining("đã đủ 400 phần tử")
    );
  });

  it("still erases on a full stage, because that is how room is made", async () => {
    const full = makeScene(1);
    full.stages[0].elements = Array.from(
      { length: TACTIC_LIMITS.elementsPerStage },
      (_, index) => ({
        kind: "token" as const,
        id: `tk${index}`,
        label: "Đội công",
        icon: "swords" as const,
        x: 100,
        y: 100,
        size: "md" as const,
        color: "red" as const,
      })
    );
    vi.mocked(fetchTactic).mockResolvedValue(makeTactic({ scene: full }));

    const { result } = await renderEditor();
    act(() => useTacticEditorStore.getState().setTool("eraser"));
    act(() => result.current.onPointerDown({ x: 100, y: 100 }));

    expect(elements()).toHaveLength(TACTIC_LIMITS.elementsPerStage - 1);
  });

  it("writes nothing at all for a member", async () => {
    const { result } = await renderEditor(false);

    act(() =>
      result.current.selectPaletteToken({ label: "Đội công", icon: "swords" })
    );
    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.onSave();
    });

    expect(saved).toBe(false);
    expect(elements()).toHaveLength(0);
    expect(saveTacticStages).not.toHaveBeenCalled();
  });

  it("saves the whole scene and marks the draft clean", async () => {
    const { result } = await renderEditor();

    act(() => useTacticEditorStore.getState().setTool("arrow"));
    act(() => result.current.onPointerDown({ x: 1, y: 1 }));
    expect(useTacticEditorStore.getState().dirty).toBe(true);

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.onSave();
    });

    // The answer is what lets "save and leave" leave only once the drawing is safe.
    expect(saved).toBe(true);
    expect(useTacticEditorStore.getState().dirty).toBe(false);
    expect(vi.mocked(saveTacticStages).mock.calls[0][0].id).toBe("t1");
  });

  it("keeps the draft and toasts the backend's sentence when a save fails", async () => {
    vi.mocked(saveTacticStages).mockRejectedValue(
      new Error("Một chiến thuật tối đa 20 giai đoạn.")
    );
    const { result } = await renderEditor();

    act(() => useTacticEditorStore.getState().setTool("arrow"));
    act(() => result.current.onPointerDown({ x: 1, y: 1 }));

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.onSave();
    });

    expect(saved).toBe(false);
    expect(toastError).toHaveBeenCalledWith(
      "Một chiến thuật tối đa 20 giai đoạn."
    );
    expect(useTacticEditorStore.getState().dirty).toBe(true);
    expect(elements()).toHaveLength(1);
  });

  it("keeps a stroke drawn while the save was out as unsaved", async () => {
    let finish: (value: ReturnType<typeof makeTactic>) => void = () => {};
    vi.mocked(saveTacticStages).mockImplementation(
      () => new Promise((resolve) => (finish = resolve))
    );
    const { result } = await renderEditor();

    act(() => useTacticEditorStore.getState().setTool("arrow"));
    act(() => result.current.onPointerDown({ x: 1, y: 1 }));
    act(() => result.current.onPointerUp());

    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = result.current.onSave();
    });
    await waitFor(() => expect(saveTacticStages).toHaveBeenCalled());
    act(() => result.current.onPointerDown({ x: 50, y: 50 }));
    act(() => result.current.onPointerUp());

    await act(async () => {
      finish(makeTactic());
      await pending;
    });

    expect(elements()).toHaveLength(2);
    expect(useTacticEditorStore.getState().dirty).toBe(true);
  });

  it("sends one save at a time, refusing a second press while the first is out", async () => {
    let finish: (value: ReturnType<typeof makeTactic>) => void = () => {};
    vi.mocked(saveTacticStages).mockImplementation(
      () => new Promise((resolve) => (finish = resolve))
    );
    const { result } = await renderEditor();
    act(() => useTacticEditorStore.getState().setTool("arrow"));
    act(() => result.current.onPointerDown({ x: 1, y: 1 }));

    let first: Promise<boolean> = Promise.resolve(false);
    let second: Promise<boolean> = Promise.resolve(true);
    act(() => {
      first = result.current.onSave();
      second = result.current.onSave();
    });

    await expect(second).resolves.toBe(false);
    await waitFor(() => expect(saveTacticStages).toHaveBeenCalled());
    await act(async () => {
      finish(makeTactic());
      await expect(first).resolves.toBe(true);
    });
    expect(saveTacticStages).toHaveBeenCalledTimes(1);
  });

  it("opens on a fresh read of the tactic, not on a copy left in the cache", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      tacticKeys.detail("t1"),
      makeTactic({ scene: makeScene(1) })
    );
    vi.mocked(fetchTactic).mockResolvedValue(makeTactic({ scene: makeScene(3) }));

    renderTacticHook(() => useTacticEditor("t1", true), queryClient);

    await waitFor(() =>
      expect(useTacticEditorStore.getState().scene).not.toBeNull()
    );
    expect(useTacticEditorStore.getState().scene?.stages).toHaveLength(3);
  });

  it("falls back to the cached copy with a warning when the fresh read fails", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      tacticKeys.detail("t1"),
      makeTactic({ scene: makeScene(1) })
    );
    vi.mocked(fetchTactic).mockRejectedValue(new Error("mất mạng"));

    const { result } = renderTacticHook(
      () => useTacticEditor("t1", true),
      queryClient
    );

    await waitFor(() =>
      expect(useTacticEditorStore.getState().scene).not.toBeNull()
    );
    expect(useTacticEditorStore.getState().scene?.stages).toHaveLength(1);
    expect(result.current.state.isError).toBe(false);
    expect(toastError).toHaveBeenCalledWith(STALE_DRAFT_WARNING);
  });

  it("shows a scene from a newer app as the page's error instead of crashing the route", async () => {
    vi.mocked(fetchTactic).mockResolvedValue({
      ...makeTactic(),
      scene: { ...makeScene(), schemaVersion: TACTIC_SCHEMA_VERSION + 1 },
    } as never);

    const { result } = renderTacticHook(() => useTacticEditor("t1", true));

    await waitFor(() => expect(result.current.state.isError).toBe(true));
    expect(result.current.state.errorMessage).toMatch(/phiên bản mới hơn/);
    expect(useTacticEditorStore.getState().scene).toBeNull();
  });

  it("reports what can be undone on the open stage only", async () => {
    const { result } = await renderEditor();

    expect(result.current.canUndo).toBe(false);

    act(() => useTacticEditorStore.getState().setTool("arrow"));
    act(() => result.current.onPointerDown({ x: 1, y: 1 }));
    expect(result.current.canUndo).toBe(true);

    act(() => useTacticEditorStore.getState().setActiveStage("s2"));
    expect(result.current.canUndo).toBe(false);
  });

  it("keeps the Konva stage for the export", async () => {
    const { result } = await renderEditor();
    const stage = { toDataURL: () => "data:image/png;base64,AAA" };

    act(() => result.current.onStageReady(stage as never));

    expect(result.current.stageRef.current).toBe(stage);
  });
});

/**
 * Serve a one-stage tactic already holding these elements.
 * @param stageElements - What the stage holds when the editor opens
 */
function openWith(stageElements: TacticElement[]): void {
  const scene = makeScene(1);
  scene.stages[0].elements = stageElements;
  vi.mocked(fetchTactic).mockResolvedValue(makeTactic({ scene }));
}

/**
 * A token standing at a point.
 * @param id - Its id
 * @param x - Where it stands along the x axis
 * @param y - Where it stands along the y axis
 * @returns The token
 */
function tokenAt(id: string, x: number, y: number): TacticElement {
  return {
    kind: "token",
    id,
    label: "Đội công",
    icon: "swords",
    x,
    y,
    size: "md",
    color: "red",
  };
}

/** How many undo steps the open stage holds. */
function undoSteps(): number {
  const state = useTacticEditorStore.getState();

  return (state.history.past[state.activeStageId ?? ""] ?? []).length;
}

describe("useTacticEditor - token size", () => {
  it("drops new tokens at the toolbar's size, without an undo step for picking it", async () => {
    const { result } = await renderEditor();

    act(() => result.current.onToolbarTokenSizeChange("sm"));
    expect(useTacticEditorStore.getState().tokenSize).toBe("sm");
    expect(undoSteps()).toBe(0);

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    expect(elements()[0]).toMatchObject({ size: "sm" });
  });

  it("resizes the selected tokens from the toolbar in one undo step", async () => {
    openWith([
      tokenAt("a", 100, 100),
      tokenAt("b", 300, 300),
      { kind: "text", id: "n", x: 500, y: 500, text: "Tập kết", color: "red", fontSize: 28 },
    ]);
    const { result } = await renderEditor();
    act(() => useTacticEditorStore.getState().selectElements(["a", "b", "n"]));

    act(() => result.current.onToolbarTokenSizeChange("lg"));

    expect(elements().map((element) => element.kind === "token" && element.size)).toEqual([
      "lg",
      "lg",
      false,
    ]);
    expect(undoSteps()).toBe(1);
    expect(useTacticEditorStore.getState().tokenSize).toBe("lg");
  });
});

describe("useTacticEditor - marquee and group moves", () => {
  beforeEach(() => {
    openWith([
      tokenAt("a", 100, 100),
      tokenAt("b", 200, 200),
      tokenAt("c", 800, 800),
      { kind: "arrow", id: "r", points: [100, 300, 200, 300], color: "blue", strokeWidth: 4 },
      { kind: "text", id: "n", x: 120, y: 400, text: "Cổng", color: "red", fontSize: 20 },
    ]);
  });

  /**
   * Open the editor on the select tool.
   * @returns The render result
   */
  async function renderSelecting() {
    const rendered = await renderEditor();
    act(() => useTacticEditorStore.getState().setTool("select"));

    return rendered;
  }

  it("selects every element whose whole box a marquee covers", async () => {
    const { result } = await renderSelecting();

    act(() => result.current.onPointerDown({ x: 300, y: 50 }));
    act(() => result.current.onPointerMove({ x: 40, y: 330 }));
    expect(result.current.marquee).toEqual({ left: 40, top: 50, right: 300, bottom: 330 });

    act(() => result.current.onPointerUp());

    expect(useTacticEditorStore.getState().selectedElementIds).toEqual(["a", "b", "r"]);
    expect(result.current.marquee).toBeNull();
  });

  it("adds a Shift marquee to the selection instead of replacing it", async () => {
    const { result } = await renderSelecting();
    act(() => useTacticEditorStore.getState().selectElements(["c"]));

    act(() => result.current.onPointerDown({ x: 40, y: 40 }, { shift: true }));
    act(() => result.current.onPointerMove({ x: 160, y: 160 }));
    act(() => result.current.onPointerUp());

    expect(useTacticEditorStore.getState().selectedElementIds).toEqual(["c", "a"]);
  });

  it("ends a marquee released outside the canvas", async () => {
    const { result } = await renderSelecting();

    act(() => result.current.onPointerDown({ x: 40, y: 40 }));
    act(() => result.current.onPointerMove({ x: 160, y: 160 }));
    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(useTacticEditorStore.getState().selectedElementIds).toEqual(["a"]);
    expect(result.current.marquee).toBeNull();
  });

  it("toggles one element in and out of the selection with Shift, moving nothing", async () => {
    const { result } = await renderSelecting();
    act(() => useTacticEditorStore.getState().selectElements(["a"]));

    act(() => result.current.onPointerDown({ x: 200, y: 200 }, { shift: true }));
    act(() => result.current.onPointerMove({ x: 400, y: 400 }));
    act(() => result.current.onPointerUp());
    expect(useTacticEditorStore.getState().selectedElementIds).toEqual(["a", "b"]);
    expect(elements()[1]).toMatchObject({ x: 200, y: 200 });

    act(() => result.current.onPointerDown({ x: 100, y: 100 }, { shift: true }));
    act(() => result.current.onPointerUp());
    expect(useTacticEditorStore.getState().selectedElementIds).toEqual(["b"]);
  });

  it("treats a press that barely moves as a click: no marquee and no undo step", async () => {
    const { result } = await renderSelecting();

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    act(() => result.current.onPointerMove({ x: 102, y: 101 }));
    act(() => result.current.onPointerUp());
    expect(elements()[0]).toMatchObject({ x: 100, y: 100 });

    act(() => result.current.onPointerDown({ x: 600, y: 600 }));
    act(() => result.current.onPointerMove({ x: 602, y: 601 }));
    expect(result.current.marquee).toBeNull();
    act(() => result.current.onPointerUp());

    expect(undoSteps()).toBe(0);
  });

  it("moves the whole selection, every kind, as one undo step", async () => {
    const { result } = await renderSelecting();
    act(() => useTacticEditorStore.getState().selectElements(["a", "r", "n"]));

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    act(() => result.current.onPointerMove({ x: 150, y: 120 }));
    expect(result.current.isMoving).toBe(true);
    act(() => result.current.onPointerMove({ x: 200, y: 140 }));
    act(() => result.current.onPointerUp());

    expect(result.current.isMoving).toBe(false);
    expect(elements()[0]).toMatchObject({ x: 200, y: 140 });
    expect(elements()[1]).toMatchObject({ x: 200, y: 200 });
    expect(elements()[3]).toMatchObject({ points: [200, 340, 300, 340] });
    expect(elements()[4]).toMatchObject({ x: 220, y: 440 });
    expect(undoSteps()).toBe(1);

    act(() => useTacticEditorStore.getState().undo());
    expect(elements()[0]).toMatchObject({ x: 100, y: 100 });
    expect(elements()[3]).toMatchObject({ points: [100, 300, 200, 300] });
  });

  it("drops a drag whose stage changed under it, instead of writing the deleted element back", async () => {
    const { result } = await renderSelecting();

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    act(() => result.current.onPointerMove({ x: 150, y: 150 }));
    // Delete answers the keyboard even with the button still held.
    act(() => result.current.onDeleteSelected());
    expect(result.current.isMoving).toBe(false);

    act(() => result.current.onPointerMove({ x: 200, y: 200 }));
    act(() => result.current.onPointerUp());

    expect(elements().map((element) => element.id)).toEqual(["b", "c", "r", "n"]);
  });

  it("drops a drag when the stage is switched mid-drag", async () => {
    vi.mocked(fetchTactic).mockResolvedValue(
      makeTactic({
        scene: {
          ...makeScene(2),
          stages: [
            { id: "s1", name: "Giai đoạn 1", elements: [tokenAt("a", 100, 100)] },
            { id: "s2", name: "Giai đoạn 2", elements: [] },
          ],
        },
      })
    );
    const { result } = await renderSelecting();

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    act(() => result.current.onPointerMove({ x: 150, y: 150 }));
    act(() => useTacticEditorStore.getState().setActiveStage("s2"));
    act(() => result.current.onPointerMove({ x: 300, y: 300 }));

    const first = useTacticEditorStore.getState().scene?.stages[0].elements[0];
    expect(first).toMatchObject({ x: 150, y: 150 });
  });

  it("drops a marquee when the stage is switched mid-drag, selecting nothing on the new one", async () => {
    // Tokens keep their id across a duplicated stage, so ids picked on the old stage would select
    // pieces the marquee never covered on the new one.
    vi.mocked(fetchTactic).mockResolvedValue(
      makeTactic({
        scene: {
          ...makeScene(2),
          stages: [
            { id: "s1", name: "Giai đoạn 1", elements: [tokenAt("a", 100, 100)] },
            { id: "s2", name: "Giai đoạn 2", elements: [tokenAt("a", 900, 900)] },
          ],
        },
      })
    );
    const { result } = await renderSelecting();

    act(() => result.current.onPointerDown({ x: 40, y: 40 }));
    act(() => result.current.onPointerMove({ x: 160, y: 160 }));
    act(() => useTacticEditorStore.getState().setActiveStage("s2"));
    act(() => result.current.onPointerMove({ x: 200, y: 200 }));
    act(() => result.current.onPointerUp());

    expect(useTacticEditorStore.getState().selectedElementIds).toEqual([]);
    expect(result.current.marquee).toBeNull();
  });

  it("narrows a selection to the element clicked without a drag", async () => {
    const { result } = await renderSelecting();
    act(() => useTacticEditorStore.getState().selectElements(["a", "b"]));

    act(() => result.current.onPointerDown({ x: 200, y: 200 }));
    act(() => result.current.onPointerUp());

    expect(useTacticEditorStore.getState().selectedElementIds).toEqual(["b"]);
  });

  it("deletes the whole selection as one undo step", async () => {
    const { result } = await renderSelecting();
    act(() => useTacticEditorStore.getState().selectElements(["a", "c", "n"]));

    act(() => result.current.onDeleteSelected());

    expect(elements().map((element) => element.id)).toEqual(["b", "r"]);
    expect(useTacticEditorStore.getState().selectedElementIds).toEqual([]);
    expect(undoSteps()).toBe(1);
  });

  it("draws no marquee with the token tool, where a press on empty map drops a token", async () => {
    const { result } = await renderEditor();

    act(() => result.current.onPointerDown({ x: 600, y: 600 }));
    act(() => result.current.onPointerMove({ x: 700, y: 700 }));

    expect(result.current.marquee).toBeNull();
    expect(elements()).toHaveLength(6);
  });

  it("selects nothing for a member", async () => {
    const { result } = await renderEditor(false);
    act(() => useTacticEditorStore.getState().setTool("select"));

    act(() => result.current.onPointerDown({ x: 40, y: 40 }));
    act(() => result.current.onPointerMove({ x: 300, y: 300 }));
    act(() => result.current.onPointerUp());

    expect(useTacticEditorStore.getState().selectedElementIds).toEqual([]);
  });
});

describe("useTacticEditor - dragging a token out of the palette", () => {
  const scout = { label: "Trinh sát", icon: "eye" as const };

  it("drops the dragged token where it was let go, in one undo step", async () => {
    const { result } = await renderEditor();
    act(() => useTacticEditorStore.getState().setColor("red"));
    act(() => result.current.onToolbarTokenSizeChange("lg"));

    act(() => result.current.onPaletteDragStart(scout));
    expect(result.current.isDraggingPaletteToken()).toBe(true);
    expect(result.current.draggedPaletteToken).toEqual(scout);
    act(() => result.current.onPaletteDrop({ x: 640, y: 320 }));
    act(() => result.current.onPaletteDragEnd());

    expect(elements()).toEqual([
      expect.objectContaining({
        kind: "token",
        label: "Trinh sát",
        icon: "eye",
        x: 640,
        y: 320,
        color: "red",
        size: "lg",
      }),
    ]);
    expect(undoSteps()).toBe(1);
    expect(result.current.isDraggingPaletteToken()).toBe(false);
    expect(result.current.draggedPaletteToken).toBeNull();
  });

  it("arms the dropped token and the token tool, as a click on it in the palette would", async () => {
    const { result } = await renderEditor();
    act(() => useTacticEditorStore.getState().setTool("arrow"));

    act(() => result.current.onPaletteDragStart(scout));
    act(() => result.current.onPaletteDrop({ x: 100, y: 100 }));

    expect(result.current.paletteToken).toEqual(scout);
    expect(useTacticEditorStore.getState().tool).toBe("token");
  });

  it("drops a new token even onto one already standing there", async () => {
    openWith([tokenAt("a", 100, 100)]);
    const { result } = await renderEditor();

    act(() => result.current.onPaletteDragStart(scout));
    act(() => result.current.onPaletteDrop({ x: 100, y: 100 }));

    expect(elements()).toHaveLength(2);
    expect(elements()[1]).toMatchObject({ label: "Trinh sát", x: 100, y: 100 });
  });

  it("ignores a drop with no palette drag behind it - a file, or a drag from another tab", async () => {
    const { result } = await renderEditor();

    expect(result.current.isDraggingPaletteToken()).toBe(false);
    act(() => result.current.onPaletteDrop({ x: 100, y: 100 }));

    expect(elements()).toHaveLength(0);
  });

  it("forgets a drag cancelled without a drop", async () => {
    const { result } = await renderEditor();

    act(() => result.current.onPaletteDragStart(scout));
    act(() => result.current.onPaletteDragEnd());
    act(() => result.current.onPaletteDrop({ x: 100, y: 100 }));

    expect(result.current.isDraggingPaletteToken()).toBe(false);
    expect(elements()).toHaveLength(0);
  });

  it("refuses a drop onto a full stage and says so", async () => {
    openWith(
      Array.from({ length: TACTIC_LIMITS.elementsPerStage }, (_, index) =>
        tokenAt(`tk${index}`, 10, 10)
      )
    );
    const { result } = await renderEditor();

    act(() => result.current.onPaletteDragStart(scout));
    act(() => result.current.onPaletteDrop({ x: 500, y: 500 }));

    expect(elements()).toHaveLength(TACTIC_LIMITS.elementsPerStage);
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining("đã đủ 400 phần tử")
    );
  });

  it("writes nothing for a member", async () => {
    const { result } = await renderEditor(false);

    act(() => result.current.onPaletteDragStart(scout));
    act(() => result.current.onPaletteDrop({ x: 100, y: 100 }));

    expect(elements()).toHaveLength(0);
  });
});
