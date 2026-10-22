// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SectionTitle } from "../section-title";

afterEach(cleanup);

describe("SectionTitle", () => {
  it("là một h2 mang đúng text truyền vào", () => {
    render(<SectionTitle>Điểm danh theo ngày đánh</SectionTitle>);
    expect(
      screen.getByRole("heading", { level: 2 }).textContent
    ).toBe("Điểm danh theo ngày đánh");
  });

  it("có divider nét cọ, ẩn khỏi trình đọc màn hình", () => {
    const { container } = render(<SectionTitle>Tuần này</SectionTitle>);
    const divider = container.querySelector("[data-stroke='brush']");
    expect(divider?.getAttribute("aria-hidden")).toBe("true");
  });

  it("nhận nội dung phức hợp, không chỉ chuỗi", () => {
    render(
      <SectionTitle>
        Lịch sử <span>(12)</span>
      </SectionTitle>
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Lịch sử (12)"
    );
  });

  it("ghi số đếm trong ngoặc, đúng text cũ", () => {
    render(<SectionTitle count={12}>Lịch sử điểm danh</SectionTitle>);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Lịch sử điểm danh (12)"
    );
  });

  it("giữ số đếm ở font sans, không phải serif của tiêu đề", () => {
    render(<SectionTitle count={12}>Lịch sử điểm danh</SectionTitle>);
    const count = screen.getByText("(12)");
    expect(count.classList.contains("font-sans")).toBe(true);
  });

  it("tiêu đề là dữ liệu (tên trận) thì cả h2 dùng sans", () => {
    render(<SectionTitle isData>Thứ 7 · 20:00</SectionTitle>);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.classList.contains("font-sans")).toBe(true);
    expect(heading.classList.contains("font-heading")).toBe(false);
  });

  it("tiêu đề chữ thường vẫn là serif", () => {
    render(<SectionTitle>Tuần này của bạn</SectionTitle>);
    expect(
      screen.getByRole("heading", { level: 2 }).classList.contains("font-heading")
    ).toBe(true);
  });
});
