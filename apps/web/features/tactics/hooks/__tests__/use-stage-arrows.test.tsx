// @vitest-environment jsdom
import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TacticStage } from "@guild/shared/schemas";

import { useStageArrows } from "../use-stage-arrows";

afterEach(cleanup);

const stages: TacticStage[] = [
  { id: "s1", name: "Giai đoạn 1", elements: [] },
  { id: "s2", name: "Giai đoạn 2", elements: [] },
];

/**
 * Listen for the arrow walk over the two stages above.
 * @param activeStageId - Stage the walk starts from
 * @returns The select spy the hook calls
 */
function renderArrows(activeStageId: string | null) {
  const onSelect = vi.fn();
  renderHook(() => useStageArrows(stages, activeStageId, onSelect));

  return onSelect;
}

describe("useStageArrows", () => {
  it("leaves a shortcut chord alone", () => {
    const onSelect = renderArrows("s1");

    fireEvent.keyDown(window, { key: "ArrowRight", ctrlKey: true });
    fireEvent.keyDown(window, { key: "ArrowRight", metaKey: true });
    fireEvent.keyDown(window, { key: "ArrowRight", altKey: true });
    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("walks nowhere from a stage that is not in the list", () => {
    const onSelect = renderArrows("gone");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("stops listening once the tabs are gone", () => {
    const onSelect = vi.fn();
    const { unmount } = renderHook(() =>
      useStageArrows(stages, "s1", onSelect)
    );

    unmount();
    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("never listens for a tactic of one stage", () => {
    const onSelect = vi.fn();
    renderHook(() => useStageArrows([stages[0]], "s1", onSelect));

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(onSelect).not.toHaveBeenCalled();
  });
});
