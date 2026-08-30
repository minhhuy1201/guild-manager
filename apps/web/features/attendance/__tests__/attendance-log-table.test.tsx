// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "@guild/shared/schemas";

import { recordKey } from "../lib/record-key";

const CHARACTERS: Character[] = [
  { id: "char-1", name: "Mèo Mập", guildClass: GuildClass.CUU_LINH },
  { id: "char-2", name: "Mèo Gầy", guildClass: GuildClass.HUYET_HA },
];

/**
 * Build a battle session; only id and label reach the table.
 * @param id - Session id, also used to build its label
 * @returns A battle session shaped for the table
 */
function makeSession(id: string): BattleSession {
  return {
    id,
    label: `Trận ${id}`,
    dateTime: "2026-08-24T20:00:00.000Z",
    deadline: "2026-08-24T03:00:00.000Z",
    isDeadlinePassed: false,
    isGuildWar: false,
    opponent: null,
    weekStart: "2026-08-24T00:00:00.000Z",
    attendanceCount: 0,
    hasFormation: false,
  };
}

const SESSIONS = [makeSession("sess-1"), makeSession("sess-2")];

/**
 * Build the record map the API returns, keyed the same way the app keys it.
 * @param entries - Character/session pairs with their answer
 * @returns The records keyed by `recordKey`
 */
function makeRecords(
  entries: Array<
    Pick<AttendanceRecord, "characterId" | "sessionId" | "isPresent"> & {
      reason?: string | null;
    }
  >
): Record<string, AttendanceRecord> {
  return Object.fromEntries(
    entries.map((entry) => [
      recordKey(entry.characterId, entry.sessionId),
      {
        ...entry,
        markedAt: "2026-08-24T10:00:00.000Z",
        reason: entry.reason ?? null,
      },
    ])
  );
}

/** Two members × two sessions, one "Có" and one "Không" each. */
const RECORDS = makeRecords([
  { characterId: "char-1", sessionId: "sess-1", isPresent: true },
  { characterId: "char-1", sessionId: "sess-2", isPresent: false },
  { characterId: "char-2", sessionId: "sess-1", isPresent: false },
  { characterId: "char-2", sessionId: "sess-2", isPresent: true },
]);

// The queries are real; only the server actions they call are stubbed, so the store, the filter
// hooks and the table all run the way they do in the app.
vi.mock("../api/attendance-api", () => ({
  fetchCharacters: async () => CHARACTERS,
  fetchBattleSessions: async () => SESSIONS,
  fetchAttendanceRecords: async () => RECORDS,
  fetchCurrentWeek: async () => ({
    weekStart: "2026-08-24T00:00:00.000Z",
    weekEnd: "2026-08-29T16:59:59.000Z",
    isActive: true,
  }),
  fetchAttendanceSummary: async () => [],
  markAttendance: async () => undefined,
}));

import { AttendanceLogTable } from "../components/attendance-log-table";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";

/**
 * Render the table with its own query client, then wait for the first rows.
 * @returns The number of body rows currently rendered
 */
async function renderTable(): Promise<() => number> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <AttendanceLogTable />
    </QueryClientProvider>
  );

  // The title only carries a count once every query resolved, so this waits past the skeleton rows.
  await waitFor(() =>
    expect(screen.getByText(/Lịch sử điểm danh \(\d+\)/)).toBeTruthy()
  );
  return () => container.querySelectorAll("tbody tr").length;
}

afterEach(cleanup);

describe("AttendanceLogTable", () => {
  beforeEach(() => {
    useAttendanceFilterStore.setState({
      filters: {
        attendance: { search: "", guildClasses: [] },
        history: { search: "", guildClasses: [] },
      },
      presence: "all",
      sessionId: null,
    });
  });

  it("không lọc gì thì hiện đủ mọi lượt điểm danh", async () => {
    const rowCount = await renderTable();

    expect(rowCount()).toBe(4);
  });

  it('lọc "Có" chỉ giữ lại lượt điểm danh có mặt', async () => {
    useAttendanceFilterStore.setState({ presence: "present" });

    const rowCount = await renderTable();

    expect(rowCount()).toBe(2);
    expect(screen.getAllByText("Trận sess-1")).toHaveLength(1);
    expect(screen.getAllByText("Trận sess-2")).toHaveLength(1);
  });

  it("lọc theo một ngày đánh chỉ giữ lại lượt của trận đó", async () => {
    useAttendanceFilterStore.setState({ sessionId: "sess-1" });

    const rowCount = await renderTable();

    expect(rowCount()).toBe(2);
    expect(screen.queryByText("Trận sess-2")).toBeNull();
  });

  it("hai bộ lọc cùng lúc thì giao nhau", async () => {
    useAttendanceFilterStore.setState({
      presence: "absent",
      sessionId: "sess-1",
    });

    const rowCount = await renderTable();

    expect(rowCount()).toBe(1);
    expect(screen.getByText("Mèo Gầy")).toBeTruthy();
  });

  it("ngày đánh đã bị xoá thì coi như không lọc, không phải bảng rỗng", async () => {
    useAttendanceFilterStore.setState({ sessionId: "sess-deleted" });

    const rowCount = await renderTable();

    expect(rowCount()).toBe(4);
  });
});
