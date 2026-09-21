// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useStageSize } from "../hooks/use-stage-size";

afterEach(cleanup);

/** Every element a ResizeObserver was pointed at, with the callback that watches it. */
const watched: { element: Element; notify: (width: number) => void }[] = [];

beforeEach(() => {
  watched.length = 0;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(
        private readonly callback: (
          entries: { contentRect: { width: number } }[]
        ) => void
      ) {}

      observe(element: Element) {
        watched.push({
          element,
          notify: (width: number) =>
            this.callback([{ contentRect: { width } }]),
        });
      }

      unobserve() {}
      disconnect() {}
    }
  );
});

/**
 * A screen that mounts its canvas box only after a toggle, the way the editor only renders the
 * canvas once it knows the screen is wide enough to draw on.
 * @returns The harness
 */
function LateBox() {
  const { ref, width } = useStageSize();
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setMounted(true)}>
        mount
      </button>
      <span data-testid="width">{width}</span>
      {mounted ? <div ref={ref} data-testid="box" /> : null}
    </>
  );
}

describe("useStageSize", () => {
  it("measures a box that only appears later — the canvas must not stay 0 wide", () => {
    render(<LateBox />);

    expect(screen.getByTestId("width").textContent).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "mount" }));

    expect(watched).toHaveLength(1);
    expect(watched[0].element).toBe(screen.getByTestId("box"));
  });

  it("follows the box as it is resized", () => {
    render(<LateBox />);
    fireEvent.click(screen.getByRole("button", { name: "mount" }));

    act(() => watched[0].notify(1280));

    expect(screen.getByTestId("width").textContent).toBe("1280");
  });
});
