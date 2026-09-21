// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The scene is next/image behind the text; what is under test is the strip's own size.
vi.mock("@/components/shared/banner-image", () => ({ BannerImage: () => null }));

import { PageHeader } from "../page-header";

afterEach(cleanup);

/**
 * Render a header of the given size and hand back its outer strip.
 * @param size - Size of the strip
 * @returns The strip element
 */
function renderStrip(size: "tall" | "compact"): HTMLElement {
  const { container } = render(
    <PageHeader
      banner="history"
      size={size}
      title="Lịch sử điểm danh"
      description="Câu trả lời của cả bang."
    />
  );

  return container.firstElementChild as HTMLElement;
}

describe("PageHeader", () => {
  it("cỡ tall giữ chiều cao của trang Điểm danh", () => {
    expect(renderStrip("tall").className).toContain("min-h-44");
  });

  // A page used every day should not spend nearly a third of a phone screen on decoration.
  it("cỡ compact thấp hơn tall", () => {
    const strip = renderStrip("compact");

    expect(strip.className).toContain("min-h-24");
    expect(strip.className).not.toContain("min-h-44");
  });

  it("đặt breadcrumb lên trên tiêu đề, trong cùng lớp scrim", () => {
    render(
      <PageHeader
        banner="tactics"
        size="compact"
        breadcrumb={<nav aria-label="breadcrumb" />}
        title="Thủ cổng tây"
      />
    );

    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" });
    const heading = screen.getByRole("heading", { level: 1 });

    expect(
      breadcrumb.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("cỡ compact vẫn có tiêu đề và mô tả", () => {
    renderStrip("compact");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Lịch sử điểm danh"
    );
    expect(screen.getByText("Câu trả lời của cả bang.")).toBeTruthy();
  });
});
