// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AttendanceFilters } from "../components/attendance-filters";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";

afterEach(cleanup);

beforeEach(() => {
  useAttendanceFilterStore.setState({ unansweredOnly: false, showFought: false });
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

  // This filter belongs to the attendance table; the history screen has its own status filter.
  it("màn Lịch sử không có chip", () => {
    render(<AttendanceFilters scope="history" />);

    expect(screen.queryByRole("button", { name: "Chưa điểm danh" })).toBeNull();
  });
});

/**
 * The toggle that brings the fought battles' columns back.
 * @returns The toggle button, or null when it is not on screen
 */
function foughtToggle(): HTMLButtonElement | null {
  return screen.queryByRole("button", {
    name: /^Đã đánh/,
  }) as HTMLButtonElement | null;
}

describe("AttendanceFilters - nút Đã đánh", () => {
  it("ghi số trận đang ẩn, bấm thì bật rồi tắt", () => {
    render(<AttendanceFilters scope="attendance" foughtCount={2} />);

    expect(foughtToggle()?.textContent).toContain("Đã đánh (2)");
    expect(foughtToggle()?.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(foughtToggle() as HTMLButtonElement);
    expect(useAttendanceFilterStore.getState().showFought).toBe(true);
    expect(foughtToggle()?.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(foughtToggle() as HTMLButtonElement);
    expect(useAttendanceFilterStore.getState().showFought).toBe(false);
  });

  it("chưa có trận nào đã đánh thì không có nút", () => {
    render(<AttendanceFilters scope="attendance" foughtCount={0} />);

    expect(foughtToggle()).toBeNull();
  });

  it("không truyền số trận thì không có nút", () => {
    render(<AttendanceFilters scope="attendance" />);

    expect(foughtToggle()).toBeNull();
  });

  it("màn Lịch sử không có nút", () => {
    render(<AttendanceFilters scope="history" foughtCount={2} />);

    expect(foughtToggle()).toBeNull();
  });

  // Hiding columns must not change who counts as unanswered.
  it("bật nút Đã đánh không đổi chip Chưa điểm danh", () => {
    useAttendanceFilterStore.setState({ unansweredOnly: true });
    render(<AttendanceFilters scope="attendance" foughtCount={2} />);

    fireEvent.click(foughtToggle() as HTMLButtonElement);

    expect(useAttendanceFilterStore.getState().unansweredOnly).toBe(true);
  });
});
