// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ZoomReadout } from "../components/zoom-readout";
import { ZOOM_MAX, ZOOM_MIN } from "../lib/zoom";

afterEach(cleanup);

describe("ZoomReadout", () => {
  it("reads the zoom as a percentage", () => {
    render(<ZoomReadout zoom={1.5} onStep={vi.fn()} onReset={vi.fn()} />);

    expect(screen.getByText("150%")).toBeTruthy();
  });

  it("steps in and out, and puts the map back to 100%", () => {
    const onStep = vi.fn();
    const onReset = vi.fn();
    render(<ZoomReadout zoom={2} onStep={onStep} onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: "Phóng to" }));
    expect(onStep).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "Thu nhỏ" }));
    expect(onStep).toHaveBeenCalledWith(-1);

    fireEvent.click(screen.getByRole("button", { name: "Đặt lại zoom 100%" }));
    expect(onReset).toHaveBeenCalled();
  });

  it("goes dead at each end of the range and says where the end is", () => {
    const onStep = vi.fn();
    const { unmount } = render(
      <ZoomReadout zoom={ZOOM_MIN} onStep={onStep} onReset={vi.fn()} />
    );

    const out = screen.getByRole("button", { name: "Thu nhỏ" });
    expect(out.hasAttribute("disabled")).toBe(true);
    expect(out.getAttribute("title")).toBe("Nhỏ nhất là 87%");
    fireEvent.click(out);
    expect(onStep).not.toHaveBeenCalled();

    unmount();
    render(<ZoomReadout zoom={ZOOM_MAX} onStep={onStep} onReset={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Phóng to" }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("says how the map is dragged", () => {
    render(<ZoomReadout zoom={1} onStep={vi.fn()} onReset={vi.fn()} />);

    expect(screen.getByTitle("Giữ chuột giữa để kéo bản đồ")).toBeTruthy();
  });

  it("offers the reset even while the map already sits at 100%", () => {
    const onReset = vi.fn();
    render(<ZoomReadout zoom={1} onStep={vi.fn()} onReset={onReset} />);

    // A pan moves the map without changing the zoom, so this is the way back to the middle.
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại zoom 100%" }));
    expect(onReset).toHaveBeenCalled();
  });
});
