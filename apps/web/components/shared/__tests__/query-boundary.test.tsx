// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QueryGroupState } from "@/lib/query-group";
import { QueryBoundary } from "../query-boundary";

afterEach(cleanup);

/**
 * Build a query group state with only the fields a case cares about.
 * @param overrides - Fields this case sets
 * @returns A full QueryGroupState
 */
function makeState(overrides: Partial<QueryGroupState> = {}): QueryGroupState {
  return {
    isPending: false,
    isError: false,
    errorMessage: "",
    refetch: vi.fn(),
    ...overrides,
  };
}

/**
 * Render the boundary with a marked skeleton and a marked child.
 * @param state - Query group state for this case
 * @returns The testing-library render result
 */
function renderBoundary(state: QueryGroupState) {
  return render(
    <QueryBoundary state={state} skeleton={<div>Đang tải</div>}>
      <div>Nội dung</div>
    </QueryBoundary>
  );
}

describe("QueryBoundary", () => {
  it("tải xong và không lỗi thì hiện nội dung", () => {
    renderBoundary(makeState());

    expect(screen.queryByText("Nội dung")).not.toBeNull();
  });

  it("đang tải thì hiện skeleton", () => {
    renderBoundary(makeState({ isPending: true }));

    expect(screen.queryByText("Đang tải")).not.toBeNull();
    expect(screen.queryByText("Nội dung")).toBeNull();
  });

  it("vừa lỗi vừa đang tải thì hiện lỗi, không hiện skeleton", () => {
    // Đây chính là hình dạng của /xep-team khi query tuần lỗi: query đội hình bị
    // park nên isPending không bao giờ tắt. Đảo thứ tự hai nhánh trong component
    // là kẹt skeleton vĩnh viễn, và không màn hình nào tự bắt được điều đó.
    renderBoundary(
      makeState({ isPending: true, isError: true, errorMessage: "Hỏng rồi." })
    );

    expect(screen.queryByText("Hỏng rồi.")).not.toBeNull();
    expect(screen.queryByText("Đang tải")).toBeNull();
  });
});
