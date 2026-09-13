// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const loaded = { isPending: false, isError: false, error: null, refetch: vi.fn() };

vi.mock("../../hooks/use-week-sessions", () => ({
  useSettingsWeeks: () => ({ ...loaded, data: [] }),
  useWeekSessions: () => ({ ...loaded, data: [] }),
}));
// The children fetch or open dialogs; what is under test is the card's own heading.
vi.mock("../session-list", () => ({ SessionList: () => null }));
vi.mock("../week-selector", () => ({ WeekSelector: () => null }));
vi.mock("../session-form-dialog", () => ({ SessionFormDialog: () => null }));
vi.mock("../delete-session-dialog", () => ({ DeleteSessionDialog: () => null }));

import { SettingsScreen } from "../settings-screen";

afterEach(cleanup);

describe("SettingsScreen", () => {
  // Tên tab đứng ngay phía trên; lặp nó thành tiêu đề trong card chỉ tốn một dòng.
  it("không lặp tên tab thành tiêu đề, vẫn giữ dòng mô tả", () => {
    render(<SettingsScreen />);

    expect(
      screen.queryByRole("heading", { name: "Thiết lập lịch đánh" })
    ).toBeNull();
    expect(screen.getByText(/Sửa được lịch của tuần này và tuần sau/)).toBeTruthy();
  });
});
