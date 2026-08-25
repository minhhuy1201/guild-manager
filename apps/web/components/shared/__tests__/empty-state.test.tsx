// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EmptyState } from "../empty-state";

afterEach(cleanup);

describe("EmptyState", () => {
  it("hiện câu mô tả", () => {
    render(<EmptyState message="Tuần này chưa có trận nào." />);
    expect(screen.getByText("Tuần này chưa có trận nào.")).toBeTruthy();
  });

  it("render hành động gợi ý khi được truyền vào", () => {
    render(
      <EmptyState
        message="Bang chưa có thành viên nào."
        action={<button type="button">Thêm thành viên</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Thêm thành viên" })).toBeTruthy();
  });

  it("dùng đúng một khung với ErrorState", () => {
    const { container } = render(<EmptyState message="Chưa có gì." />);
    const frame = container.firstElementChild;
    for (const className of [
      "flex",
      "flex-col",
      "items-center",
      "gap-3",
      "py-8",
      "text-center",
    ]) {
      expect(frame?.classList.contains(className)).toBe(true);
    }
  });
});
