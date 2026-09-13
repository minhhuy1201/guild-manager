// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ROUTES } from "@/config/routes";
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
});
