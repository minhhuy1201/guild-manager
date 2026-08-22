import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api-client";
import { combineQueries, type CombinableQuery } from "../query-group";

const FALLBACK = "Không tải được dữ liệu.";

/**
 * Build a stand-in query with just the four fields combineQueries reads.
 * @param overrides - Fields to override on the resolved-and-successful default
 * @returns A query-shaped object usable as a combineQueries input
 */
function query(overrides: Partial<CombinableQuery> = {}): CombinableQuery {
  return {
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(() => Promise.resolve(null)),
    ...overrides,
  };
}

describe("combineQueries", () => {
  it("không query nào hỏng thì errorMessage rỗng", () => {
    const state = combineQueries([query(), query()], FALLBACK);

    expect(state.isError).toBe(false);
    expect(state.errorMessage).toBe("");
  });

  it("một query còn chạy thì cả nhóm còn pending", () => {
    expect(combineQueries([query(), query({ isPending: true })], FALLBACK).isPending).toBe(true);
    expect(combineQueries([query(), query()], FALLBACK).isPending).toBe(false);
  });

  it("query thứ hai hỏng vẫn lấy đúng message của nó", () => {
    const state = combineQueries(
      [query(), query({ isError: true, error: new ApiError("Tuần này đã bị khoá.", 409) })],
      FALLBACK
    );

    expect(state.isError).toBe(true);
    expect(state.errorMessage).toBe("Tuần này đã bị khoá.");
  });

  it("nhiều query cùng hỏng thì lấy cái đầu tiên theo thứ tự mảng", () => {
    const state = combineQueries(
      [
        query({ isError: true, error: new ApiError("Lỗi đầu.", 500) }),
        query({ isError: true, error: new ApiError("Lỗi sau.", 500) }),
      ],
      FALLBACK
    );

    expect(state.errorMessage).toBe("Lỗi đầu.");
  });

  it("lỗi không phải ApiError thì dùng fallbackMessage", () => {
    const state = combineQueries(
      [query({ isError: true, error: new Error("Failed to fetch") })],
      FALLBACK
    );

    expect(state.errorMessage).toBe(FALLBACK);
  });

  it("query hỏng mà không mang error thì vẫn báo lỗi, kèm câu fallback", () => {
    const state = combineQueries([query({ isError: true })], FALLBACK);

    expect(state.isError).toBe(true);
    expect(state.errorMessage).toBe(FALLBACK);
  });

  it("refetch chạm mọi query trong nhóm", () => {
    const queries = [query(), query(), query()];

    combineQueries(queries, FALLBACK).refetch();

    for (const item of queries) {
      expect(item.refetch).toHaveBeenCalledTimes(1);
    }
  });
});
