// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
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

/**
 * Render a strip of real tabs the hook can carry the focus between.
 * @param onSelect - Called with the stage an arrow lands on
 * @param activeStageId - Stage whose tab is selected
 * @returns The rendered strip
 */
function TabStrip({
  onSelect,
  activeStageId,
}: {
  onSelect: (stageId: string) => void;
  activeStageId: string;
}) {
  const tablistRef = useStageArrows(stages, activeStageId, onSelect);

  return (
    <div ref={tablistRef} role="tablist" aria-label="Giai đoạn">
      {stages.map((stage) => (
        <button
          key={stage.id}
          type="button"
          role="tab"
          aria-selected={stage.id === activeStageId}
          tabIndex={stage.id === activeStageId ? 0 : -1}
        >
          {stage.name}
        </button>
      ))}
    </div>
  );
}

describe("useStageArrows", () => {
  it("carries the focus along when the walk started on a tab", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <TabStrip onSelect={onSelect} activeStageId="s1" />
    );

    const first = screen.getByRole("tab", { name: "Giai đoạn 1" });
    first.focus();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onSelect).toHaveBeenCalledWith("s2");

    // The screen answers the callback by selecting the next stage; the focus follows it.
    rerender(<TabStrip onSelect={onSelect} activeStageId="s2" />);
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Giai đoạn 2" })
    );
  });

  it("leaves the focus where it is when the walk started off the strip", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Trên bản vẽ</button>
        <TabStrip onSelect={onSelect} activeStageId="s1" />
      </>
    );

    const outside = screen.getByRole("button", { name: "Trên bản vẽ" });
    outside.focus();
    fireEvent.keyDown(window, { key: "ArrowRight" });

    rerender(
      <>
        <button type="button">Trên bản vẽ</button>
        <TabStrip onSelect={onSelect} activeStageId="s2" />
      </>
    );
    expect(document.activeElement).toBe(outside);
  });

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
