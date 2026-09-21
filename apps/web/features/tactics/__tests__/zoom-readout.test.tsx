// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ZoomReadout } from "../components/zoom-readout";

afterEach(cleanup);

describe("ZoomReadout", () => {
  it("reads the zoom as a percentage", () => {
    render(<ZoomReadout zoom={1.5} onStep={vi.fn()} onReset={vi.fn()} />);

    expect(screen.getByText("150%")).toBeTruthy();
  });

  it("steps in and out, and puts the map back to fitting", () => {
    const onStep = vi.fn();
    const onReset = vi.fn();
    render(<ZoomReadout zoom={1} onStep={onStep} onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: "Phóng to" }));
    expect(onStep).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "Thu nhỏ" }));
    expect(onStep).toHaveBeenCalledWith(-1);

    fireEvent.click(screen.getByRole("button", { name: "Vừa khung" }));
    expect(onReset).toHaveBeenCalled();
  });
});
