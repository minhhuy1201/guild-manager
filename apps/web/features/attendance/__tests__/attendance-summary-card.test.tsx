// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { BattleSession } from "@guild/shared/schemas";

import { AttendanceSummaryCard } from "../components/attendance-summary-card";
import type { ClassAttendanceSummary } from "../lib/attendance-summary";

// recharts sizes its chart through a ResizeObserver, which jsdom does not ship.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

const SESSION: BattleSession = {
  id: "sess-1",
  label: "Thứ 7 · 20:00",
  dateTime: "2026-08-24T20:00:00.000Z",
  deadline: "2026-08-24T03:00:00.000Z",
  isAttendanceClosed: false,
  isGuildWar: false,
  opponent: null,
  weekStart: "2026-08-24T00:00:00.000Z",
  attendanceCount: 0,
  matchCount: 2,
  formationMatchCount: 0,
};

const ROWS: ClassAttendanceSummary[] = [
  { guildClass: GuildClass.CUU_LINH, co: 2, khong: 1, chuaTraLoi: 0, total: 3 },
  { guildClass: GuildClass.TO_VAN, co: 1, khong: 0, chuaTraLoi: 2, total: 3 },
];

describe("AttendanceSummaryCard", () => {
  // Biểu đồ phải hover mới đọc được số; header nói thẳng ba con số của trận.
  it("header ghi rõ số Có, Không và Chưa của cả trận", () => {
    render(<AttendanceSummaryCard session={SESSION} rows={ROWS} domainMax={3} />);

    expect(screen.getByText(/Có 3 · Không 1 · Chưa 2/)).toBeTruthy();
  });
});
