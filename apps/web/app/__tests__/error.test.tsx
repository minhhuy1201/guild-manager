// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";
import ErrorPage from "../error";

afterEach(cleanup);

describe("Trang lỗi", () => {
  it("bấm Thử lại thì gọi reset để render lại đoạn vừa hỏng", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("boom")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: /Thử lại/ }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("có lối về trang Điểm danh", () => {
    render(<ErrorPage error={new Error("boom")} reset={vi.fn()} />);

    expect(
      screen.getByRole("link", { name: /Về trang Điểm danh/ }).getAttribute("href")
    ).toBe(ROUTES.attendance);
  });

  // A technical error sentence means nothing to a guild member.
  it("không in câu lỗi kỹ thuật ra màn hình", () => {
    const { container } = render(
      <ErrorPage error={new Error("TypeError: x is undefined")} reset={vi.fn()} />
    );

    expect(container.textContent).not.toContain("x is undefined");
  });
});
