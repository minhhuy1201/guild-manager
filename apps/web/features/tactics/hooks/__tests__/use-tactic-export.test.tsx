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
import { useTacticExport } from "../use-tactic-export";
import { renderTacticHook } from "./render-tactic-hook";

const stages: TacticStage[] = [
  { id: "s1", name: "Giai đoạn 1", elements: [] },
  { id: "s2", name: "Giai đoạn 2", elements: [] },
];

/** A Konva stage double that reports which stage was on screen when it was captured. */
function fakeStage() {
  return {
    toDataURL: vi.fn(() => {
      const openStage = useTacticEditorStore.getState().activeStageId;

      return `data:image/png;base64,${openStage}`;
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
  it("saves the open stage as one PNG, named after it", () => {
    const stage = fakeStage();
    const { result } = renderTacticHook(() =>
      useTacticExport("Thủ cổng tây", stages, { current: stage } as never)
    );
    // The render helper resets the store, so the scene is loaded after it, not before.
    act(() =>
      useTacticEditorStore.getState().loadScene({ schemaVersion: TACTIC_SCHEMA_VERSION, stages })
    );

    act(() => result.current.exportActiveStage());

    expect(downloadDataUrl).toHaveBeenCalledWith(
      "data:image/png;base64,s1",
      "Thủ cổng tây-1-Giai đoạn 1.png"
    );
  });

  it("does nothing when there is no canvas to capture", () => {
    const { result } = renderTacticHook(() =>
      useTacticExport("Thủ cổng tây", stages, { current: null } as never)
    );
    act(() =>
      useTacticEditorStore.getState().loadScene({ schemaVersion: TACTIC_SCHEMA_VERSION, stages })
    );

    act(() => result.current.exportActiveStage());

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
