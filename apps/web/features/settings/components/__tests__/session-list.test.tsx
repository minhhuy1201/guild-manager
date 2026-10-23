// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BattleSession } from "@guild/shared/schemas";

import { SessionList } from "../session-list";

// The attendance barrel drags in server-only code; the list needs only its clock and subtitle.
vi.mock("@/features/attendance", () => ({
  getSessionSubtitle: () => null,
  useBattleClock: () => new Date("2026-09-02T00:00:00.000Z"),
}));
vi.mock("../reopen-attendance-action", () => ({
  ReopenAttendanceAction: () => null,
}));

afterEach(cleanup);

/**
 * A scrim as the API returns it.
 * @param id - Session id
 * @param dateTime - Battle time, ISO
 * @returns The session fixture
 */
function scrim(id: string, dateTime: string): BattleSession {
  return {
    id,
    label: id,
    dateTime,
    deadline: dateTime,
    isAttendanceClosed: false,
    canReopenAttendance: false,
    isGuildWar: false,
    opponent: null,
    weekStart: "2026-08-30T17:00:00.000Z",
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
  };
}

describe("SessionList", () => {
  it("chỉ scrim đã qua giờ đánh bị disable nút Sửa và Xoá", () => {
    render(
      <SessionList
        sessions={[
          scrim("past", "2026-09-01T13:30:00.000Z"),
          scrim("future", "2026-09-03T13:30:00.000Z"),
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const disabled = screen
      .getAllByText("Sửa")
      .map((node) => node.closest("button")?.hasAttribute("disabled"));

    expect(disabled).toEqual([true, false]);
  });
});
