// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbsentBanner } from "../absent-banner";

afterEach(cleanup);

describe("AbsentBanner", () => {
  it("không ai báo nghỉ thì không hiện gì", () => {
    const { container } = render(<AbsentBanner count={0} onRemove={vi.fn()} />);

    expect(container.childElementCount).toBe(0);
  });

  it("nói có bao nhiêu người đã báo nghỉ còn đứng trong đội hình", () => {
    render(<AbsentBanner count={2} onRemove={vi.fn()} />);

    expect(
      screen.getByText(/2 người đã báo nghỉ còn trong đội hình/)
    ).toBeTruthy();
  });

  it("bấm Gỡ ra thì gọi onRemove", () => {
    const onRemove = vi.fn();
    render(<AbsentBanner count={2} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: /Gỡ ra/ }));

    expect(onRemove).toHaveBeenCalledOnce();
  });
});
