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
import { useTacticEditorStore } from "../../store/editor-store";
import { useTacticEditor } from "../use-tactic-editor";
import { makeScene, makeTactic, renderTacticHook } from "./render-tactic-hook";

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

  it("drops nothing while no palette entry is picked", async () => {
    const { result } = await renderEditor();

    act(() => result.current.onPointerDown({ x: 10, y: 10 }));

    expect(elements()).toHaveLength(0);
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
    expect(result.current.selectedTokenSize).toBe("md");

    act(() => result.current.onTokenSizeChange("lg"));
    expect(elements()[0]).toMatchObject({ size: "lg" });

    act(() => result.current.onDeleteSelected());
    expect(elements()).toHaveLength(0);
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
    act(() => result.current.onSave());

    expect(elements()).toHaveLength(0);
    expect(saveTacticStages).not.toHaveBeenCalled();
  });

  it("saves the whole scene and marks the draft clean", async () => {
    const { result } = await renderEditor();

    act(() => useTacticEditorStore.getState().setTool("arrow"));
    act(() => result.current.onPointerDown({ x: 1, y: 1 }));
    expect(useTacticEditorStore.getState().dirty).toBe(true);

    await act(async () => {
      result.current.onSave();
    });

    await waitFor(() =>
      expect(useTacticEditorStore.getState().dirty).toBe(false)
    );
    expect(vi.mocked(saveTacticStages).mock.calls[0][0].id).toBe("t1");
  });

  it("keeps the draft and shows the backend's sentence when a save fails", async () => {
    vi.mocked(saveTacticStages).mockRejectedValue(
      new Error("Một chiến thuật tối đa 20 giai đoạn.")
    );
    const { result } = await renderEditor();

    act(() => useTacticEditorStore.getState().setTool("arrow"));
    act(() => result.current.onPointerDown({ x: 1, y: 1 }));

    await act(async () => {
      result.current.onSave();
    });

    await waitFor(() =>
      expect(result.current.saveError).toBe(
        "Một chiến thuật tối đa 20 giai đoạn."
      )
    );
    expect(useTacticEditorStore.getState().dirty).toBe(true);
    expect(elements()).toHaveLength(1);
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
