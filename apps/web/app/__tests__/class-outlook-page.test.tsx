import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import ClassOutlookPage from "../luu-phai/page";

describe("Trang lưu phái", () => {
  it("đang ẩn với mọi người nên trả 404", () => {
    expect(() => ClassOutlookPage()).toThrow("NEXT_NOT_FOUND");
  });
});
