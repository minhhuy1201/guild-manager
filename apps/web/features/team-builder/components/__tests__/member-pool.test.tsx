// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { over } = vi.hoisted(() => ({ over: { value: false } }));

vi.mock("@dnd-kit/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@dnd-kit/core")>()),
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: over.value }),
}));
vi.mock("../draggable-member", () => ({ DraggableMember: () => null }));
vi.mock("../pool-filters", () => ({ PoolFilters: () => null }));

import { MemberPool } from "../member-pool";

afterEach(() => {
  cleanup();
  over.value = false;
});

/**
 * Render an empty pool and return the drop area that holds the empty message.
 * @returns The drop area element
 */
function renderPool(
  readOnly = false,
  layout?: "card" | "column"
): HTMLElement | null {
  render(
    <MemberPool
      layout={layout}
      pool={[]}
      classCounts={[]}
      readOnly={readOnly}
      otherMatchIds={new Set()}
      activeMatchIndex={0}
    />
  );
  return screen.queryByText("Không còn ai để xếp cho trận này.")?.closest("div.border-dashed, div.border-solid") ?? null;
}

describe("MemberPool - vùng thả", () => {
  it("nói hết người để xếp khi không có bộ lọc", () => {
    expect(renderPool()).not.toBeNull();
  });

  it("thẻ đang được kéo qua thì vùng thả sáng lên viền liền", () => {
    over.value = true;

    const area = renderPool();

    expect(area?.className).toContain("border-solid");
    expect(area?.className).not.toContain("border-dashed");
  });

  it("chưa có thẻ kéo qua thì viền đứt nét", () => {
    expect(renderPool()?.className).toContain("border-dashed");
  });

  it("chỉ xem thì không dựng gì", () => {
    expect(renderPool(true)).toBeNull();
  });
});

describe("MemberPool - layout column", () => {
  it("không bọc trong thẻ, khác layout mặc định", () => {
    renderPool(false, "column");
    expect(document.querySelector("[data-slot=card]")).toBeNull();
    cleanup();

    renderPool();
    expect(document.querySelector("[data-slot=card]")).not.toBeNull();
  });

  it("vẫn có tiêu đề, và vùng thả bao phần danh sách", () => {
    const area = renderPool(false, "column");

    expect(screen.getByText("Thành viên chưa xếp")).toBeTruthy();
    expect(area).not.toBeNull();
  });

  it("thẻ đang được kéo qua thì vùng thả sáng lên viền liền", () => {
    over.value = true;

    expect(renderPool(false, "column")?.className).toContain("border-solid");
  });

  it("chỉ xem thì không dựng gì", () => {
    expect(renderPool(true, "column")).toBeNull();
  });
});
