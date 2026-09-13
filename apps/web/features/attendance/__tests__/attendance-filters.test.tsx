// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AttendanceFilters } from "../components/attendance-filters";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";

afterEach(cleanup);

beforeEach(() => {
  useAttendanceFilterStore.setState({ unansweredOnly: false });
});

/**
 * The quick filter chip of the attendance screen.
 * @returns The chip button
 */
function chip(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Chưa điểm danh" }) as HTMLButtonElement;
}

describe("AttendanceFilters - chip Chưa điểm danh", () => {
  it("bấm chip thì bật lọc, bấm lần nữa thì tắt", () => {
    render(<AttendanceFilters scope="attendance" />);

    fireEvent.click(chip());
    expect(useAttendanceFilterStore.getState().unansweredOnly).toBe(true);
    expect(chip().getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(chip());
    expect(useAttendanceFilterStore.getState().unansweredOnly).toBe(false);
    expect(chip().getAttribute("aria-pressed")).toBe("false");
  });

  // Lọc này thuộc bảng điểm danh; màn Lịch sử có bộ lọc trạng thái riêng.
  it("màn Lịch sử không có chip", () => {
    render(<AttendanceFilters scope="history" />);

    expect(screen.queryByRole("button", { name: "Chưa điểm danh" })).toBeNull();
  });
});
