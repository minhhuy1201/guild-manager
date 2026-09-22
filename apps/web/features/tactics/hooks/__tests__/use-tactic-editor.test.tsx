// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TACTIC_LIMITS } from "@guild/shared/schemas";
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
    act(() => result.current.onTokenMoved(tokenId, 400, 500));
    expect(elements()[0]).toMatchObject({ x: 400, y: 500 });

    act(() => result.current.onElementClick(tokenId));
    // The whole element, not just its size: the action bar is drawn where the element is.
    expect(result.current.selectedElement).toMatchObject({
      id: tokenId,
      kind: "token",
      size: "md",
    });

    act(() => result.current.onTokenSizeChange("lg"));
    expect(elements()[0]).toMatchObject({ size: "lg" });

    act(() => result.current.onDeleteSelected());
    expect(elements()).toHaveLength(0);
    expect(result.current.selectedElement).toBeNull();
  });

  it("picks up the element under the pointer with the select tool", async () => {
    const { result } = await renderEditor();

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    const tokenId = elements()[0].id;

    act(() => useTacticEditorStore.getState().setTool("select"));
    act(() => result.current.onPointerDown({ x: 104, y: 98 }));

    expect(useTacticEditorStore.getState().selectedElementId).toBe(tokenId);
    // Selecting draws nothing, so the stage still holds the one token.
    expect(elements()).toHaveLength(1);

    act(() => result.current.onPointerDown({ x: 900, y: 900 }));
    expect(useTacticEditorStore.getState().selectedElementId).toBeNull();
  });

  // The complaint this answers: a click on a placed piece used to stack another one on top of it.
  it("selects a placed token instead of dropping a second one on it", async () => {
    const { result } = await renderEditor();

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));
    const tokenId = elements()[0].id;

    act(() => result.current.onPointerDown({ x: 100, y: 100 }));

    expect(elements()).toHaveLength(1);
    expect(useTacticEditorStore.getState().selectedElementId).toBe(tokenId);
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
