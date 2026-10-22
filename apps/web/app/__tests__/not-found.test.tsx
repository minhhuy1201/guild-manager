// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";
// Link's `transitionTypes` never reaches the DOM, so the stub exposes it for the tests to read.
vi.mock("next/link", () => ({
  default: ({
    transitionTypes,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    transitionTypes?: string[];
  }) => (
    <a {...rest} data-transition-types={transitionTypes?.join(" ")}>
      {children}
    </a>
  ),
}));

import NotFound from "../not-found";

afterEach(cleanup);

describe("Trang 404", () => {
  it("nói ngắn gọn là không có trang này", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Không tìm thấy trang này"
    );
  });

  it("có lối về trang Điểm danh", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("link", { name: /Về trang Điểm danh/ }).getAttribute("href")
    ).toBe(ROUTES.attendance);
  });

  it("lối về mang kiểu page-nav để chuyển trang có hiệu ứng", () => {
    render(<NotFound />);

    expect(
      screen
        .getByRole("link", { name: /Về trang Điểm danh/ })
        .getAttribute("data-transition-types")
    ).toBe("page-nav");
  });
});
