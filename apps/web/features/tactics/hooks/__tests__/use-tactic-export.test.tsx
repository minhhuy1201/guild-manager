// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TACTIC_SCHEMA_VERSION,
  type TacticStage,
} from "@guild/shared/schemas";

const downloadDataUrl = vi.fn();
const downloadBlob = vi.fn();
const buildStagesZip = vi.fn();
const toastError = vi.fn();

vi.mock("@/components/shared/toast", () => ({
  toastError: (message: string) => toastError(message),
}));

vi.mock("../../lib/export-image", async () => {
  const actual = await vi.importActual<
    typeof import("../../lib/export-image")
  >("../../lib/export-image");

  return {
    ...actual,
    downloadDataUrl: (dataUrl: string, name: string) =>
      downloadDataUrl(dataUrl, name),
    downloadBlob: (blob: Blob, name: string) => downloadBlob(blob, name),
    buildStagesZip: (files: unknown) => buildStagesZip(files),
  };
});

import { useTacticEditorStore } from "../../store/editor-store";
import { mapExportRegion } from "../../lib/export-image";
import { useTacticExport } from "../use-tactic-export";
import { renderTacticHook } from "./render-tactic-hook";

const stages: TacticStage[] = [
  { id: "s1", name: "Giai đoạn 1", elements: [] },
  { id: "s2", name: "Giai đoạn 2", elements: [] },
];

/**
 * A Konva stage double, zoomed and panned, that reports which stage was on screen when it was
 * captured and whether anything was still selected.
 */
function fakeStage() {
  const selectedAtCapture: (string | null)[] = [];

  return {
    selectedAtCapture,
    scaleX: () => 1.5,
    x: () => -200,
    y: () => -100,
    toDataURL: vi.fn(() => {
      const state = useTacticEditorStore.getState();
      selectedAtCapture.push(state.selectedElementId);

      return `data:image/png;base64,${state.activeStageId}`;
    }),
  };
}

beforeEach(() => {
  downloadDataUrl.mockReset();
  downloadBlob.mockReset();
  buildStagesZip.mockReset().mockResolvedValue(new Blob(["zip"]));
  toastError.mockReset();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    callback();

    return 0;
  });
});

describe("useTacticExport", () => {
  it("saves the open stage as one PNG, named after it", async () => {
    const stage = fakeStage();
    const { result } = renderTacticHook(() =>
      useTacticExport("Thủ cổng tây", stages, { current: stage } as never)
    );
    // The render helper resets the store, so the scene is loaded after it, not before.
    act(() =>
      useTacticEditorStore.getState().loadScene({ schemaVersion: TACTIC_SCHEMA_VERSION, stages })
    );

    await act(() => result.current.exportActiveStage());

    expect(downloadDataUrl).toHaveBeenCalledWith(
      "data:image/png;base64,s1",
      "Thủ cổng tây-1-Giai đoạn 1.png"
    );
  });

  it("captures the whole map, not the zoomed view, and leaves the selection ring out", async () => {
    const stage = fakeStage();
    const { result } = renderTacticHook(() =>
      useTacticExport("Thủ cổng tây", stages, { current: stage } as never)
    );
    act(() => {
      useTacticEditorStore.getState().loadScene({ schemaVersion: TACTIC_SCHEMA_VERSION, stages });
      useTacticEditorStore.getState().selectElement("tok1");
    });

    await act(() => result.current.exportActiveStage());

    expect(stage.toDataURL).toHaveBeenCalledWith(
      mapExportRegion({ scale: 1.5, x: -200, y: -100 })
    );
    expect(stage.selectedAtCapture).toEqual([null]);
  });

  it("raises the export flag before it captures, so a running move is frozen out", async () => {
    // Frames are held back rather than run inline, so the export can be caught mid-flight: this is
    // the window in which `enabled: !exporting` has to have already frozen the canvas.
    const frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
      frames.push(callback);

      return 0;
    });

    const stage = fakeStage();
    const { result } = renderTacticHook(() =>
      useTacticExport("Thủ cổng tây", stages, { current: stage } as never)
    );
    act(() =>
      useTacticEditorStore.getState().loadScene({ schemaVersion: TACTIC_SCHEMA_VERSION, stages })
    );

    let running!: Promise<void>;
    act(() => {
      running = result.current.exportActiveStage();
    });

    expect(result.current.exporting).toBe(true);
    expect(stage.toDataURL).not.toHaveBeenCalled();

    await act(async () => {
      while (frames.length) frames.shift()?.();
      await running;
    });

    expect(stage.toDataURL).toHaveBeenCalledOnce();
    expect(result.current.exporting).toBe(false);
  });

  it("says so in a toast when the open stage cannot be captured", async () => {
    const stage = fakeStage();
    stage.toDataURL.mockImplementation(() => {
      throw new Error("Canvas bị khoá.");
    });
    const { result } = renderTacticHook(() =>
      useTacticExport("Thủ cổng tây", stages, { current: stage } as never)
    );
    act(() =>
      useTacticEditorStore.getState().loadScene({ schemaVersion: TACTIC_SCHEMA_VERSION, stages })
    );

    await act(async () => {
      await expect(result.current.exportActiveStage()).resolves.toBeUndefined();
    });

    expect(toastError).toHaveBeenCalledWith("Canvas bị khoá.");
    expect(downloadDataUrl).not.toHaveBeenCalled();
  });

  it("does nothing when there is no canvas to capture", async () => {
    const { result } = renderTacticHook(() =>
      useTacticExport("Thủ cổng tây", stages, { current: null } as never)
    );
    act(() =>
      useTacticEditorStore.getState().loadScene({ schemaVersion: TACTIC_SCHEMA_VERSION, stages })
    );

    await act(() => result.current.exportActiveStage());

    expect(downloadDataUrl).not.toHaveBeenCalled();
  });

  it("walks every stage into one zip and puts the open stage back", async () => {
    const stage = fakeStage();
    const { result } = renderTacticHook(() =>
      useTacticExport("Thủ cổng tây", stages, { current: stage } as never)
    );
    act(() => {
      useTacticEditorStore.getState().loadScene({ schemaVersion: TACTIC_SCHEMA_VERSION, stages });
      useTacticEditorStore.getState().setActiveStage("s2");
    });

    await act(async () => {
      await result.current.exportAllStages();
    });

    expect(buildStagesZip).toHaveBeenCalledWith([
      { name: "Thủ cổng tây-1-Giai đoạn 1.png", dataUrl: "data:image/png;base64,s1" },
      { name: "Thủ cổng tây-2-Giai đoạn 2.png", dataUrl: "data:image/png;base64,s2" },
    ]);
    expect(downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      "Thủ cổng tây.zip"
    );
    expect(useTacticEditorStore.getState().activeStageId).toBe("s2");
    expect(result.current.exporting).toBe(false);
  });

  it("says so in a toast when an export fails, and stops reporting one", async () => {
    const stage = fakeStage();
    buildStagesZip.mockRejectedValue(new Error("hỏng"));
    const { result } = renderTacticHook(() =>
      useTacticExport("Thủ cổng tây", stages, { current: stage } as never)
    );
    act(() =>
      useTacticEditorStore.getState().loadScene({ schemaVersion: TACTIC_SCHEMA_VERSION, stages })
    );

    // The screen fires this without awaiting it, so a rejection would reach no one.
    await act(async () => {
      await expect(result.current.exportAllStages()).resolves.toBeUndefined();
    });

    expect(toastError).toHaveBeenCalledWith("hỏng");
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });
});
