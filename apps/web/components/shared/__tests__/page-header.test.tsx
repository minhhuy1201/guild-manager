// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The scene is next/image behind the text; what is under test is the strip's own classes.
vi.mock("@/components/shared/banner-image", () => ({ BannerImage: () => null }));

import { PageHeader } from "../page-header";

afterEach(cleanup);

/**
 * Render a header and hand back its outer strip.
 * @param isPlainOnPhone - Whether a phone gets plain text
 * @returns The strip element
 */
function renderStrip(isPlainOnPhone?: boolean): HTMLElement {
  const { container } = render(
    <PageHeader
      banner="history"
      isPlainOnPhone={isPlainOnPhone}
      title="Lịch sử điểm danh"
      description="Câu trả lời của cả bang."
    />
  );

  return container.firstElementChild as HTMLElement;
}

describe("PageHeader", () => {
  // A page used every day should not spend nearly a third of a phone screen on decoration.
  it("dải thấp cho mọi trang", () => {
    const strip = renderStrip();

    expect(strip.className).toContain("min-h-24");
    expect(strip.className).not.toContain("min-h-44");
  });

  it("giữ cảnh trên điện thoại khi không đặt isPlainOnPhone", () => {
    const strip = renderStrip();

    expect(strip.className).not.toContain("max-sm:bg-transparent");
    expect(strip.querySelector(".max-sm\\:hidden")).toBeNull();
  });

  it("isPlainOnPhone ẩn cảnh và lớp phủ dưới sm", () => {
    const strip = renderStrip(true);

    expect(strip.className).toContain("max-sm:bg-transparent");
    expect(strip.querySelectorAll(".max-sm\\:hidden")).toHaveLength(4);
  });

  it("isPlainOnPhone vẫn có tiêu đề và mô tả", () => {
    renderStrip(true);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Lịch sử điểm danh"
    );
    expect(screen.getByText("Câu trả lời của cả bang.")).toBeTruthy();
  });
});
