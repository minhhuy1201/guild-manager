// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceStatus } from "@guild/shared/enums";
import type { AttendanceRecord, FormationWeek } from "@guild/shared/schemas";

import {
  fetchAttendanceRecords,
  fetchCharacters,
} from "@/features/attendance/api/attendance-api";
import {
  fetchFormations,
  fetchFormationWeeks,
} from "../../api/team-builder-api";
import { useFormationWeek } from "../use-formation-week";
import { makeSession, renderFormationHook } from "./render-formation-hook";

vi.mock("../../api/team-builder-api", () => ({
  fetchFormationWeeks: vi.fn(),
  fetchFormations: vi.fn(),
  saveFormation: vi.fn(),
}));

// The attendance barrel reaches a server action, and that file imports
// "server-only" — harmless here, since the test never runs the action.
vi.mock("server-only", () => ({}));

vi.mock("@/features/attendance/api/attendance-api", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/features/attendance/api/attendance-api")
  >()),
  fetchCharacters: vi.fn(),
  fetchAttendanceRecords: vi.fn(),
}));

const fetchWeeksMock = vi.mocked(fetchFormationWeeks);
const fetchFormationsMock = vi.mocked(fetchFormations);
const fetchCharactersMock = vi.mocked(fetchCharacters);
const fetchRecordsMock = vi.mocked(fetchAttendanceRecords);

const NEXT_WEEK = "2026-08-24T00:00:00.000Z";
const OPEN_WEEK = "2026-08-17T00:00:00.000Z";
const PAST_WEEK = "2026-08-10T00:00:00.000Z";

/**
 * Build one entry of the week list the API returns.
 * @param weekStart - Monday of the week
 * @param isActive - Whether this is the open attendance week
 * @returns A FormationWeek fixture
 */
function week(weekStart: string, isActive: boolean): FormationWeek {
  return { weekStart, weekEnd: weekStart, isActive };
}

// Newest first, reaching into next week — the shape the endpoint really returns.
const WEEKS = [week(NEXT_WEEK, false), week(OPEN_WEEK, true), week(PAST_WEEK, false)];

const RECORD: AttendanceRecord = {
  characterId: "char-1",
  sessionId: "thu-7",
  status: AttendanceStatus.PRESENT,
  markedAt: "2026-08-17T10:00:00.000Z",
};

beforeEach(() => {
  fetchWeeksMock.mockResolvedValue(WEEKS);
  fetchFormationsMock.mockResolvedValue([makeSession("thu-7")]);
  fetchCharactersMock.mockResolvedValue([]);
  fetchRecordsMock.mockResolvedValue({ "char-1__thu-7": RECORD });
});

describe("useFormationWeek", () => {
  it("chưa chọn tuần thì mở tuần điểm danh đang mở, không phải tuần đầu mảng", async () => {
    const { result } = renderFormationHook(() => useFormationWeek());

    await waitFor(() => expect(result.current.weekStart).toBe(OPEN_WEEK));
    expect(result.current.isEditableWeek).toBe(true);
  });

  it("tuần đã qua thì khoá sửa", async () => {
    const { result } = renderFormationHook(() => useFormationWeek(), {
      formation: { selectedWeekStart: PAST_WEEK },
    });

    await waitFor(() => expect(result.current.weeks).toHaveLength(3));
    expect(result.current.weekStart).toBe(PAST_WEEK);
    expect(result.current.isEditableWeek).toBe(false);
  });

  it("tuần kế tiếp vẫn sửa được", async () => {
    const { result } = renderFormationHook(() => useFormationWeek(), {
      formation: { selectedWeekStart: NEXT_WEEK },
    });

    await waitFor(() => expect(result.current.weeks).toHaveLength(3));
    expect(result.current.isEditableWeek).toBe(true);
  });

  it("đổi tuần thì tải lại đội hình của tuần đó", async () => {
    const { result } = renderFormationHook(() => useFormationWeek());

    await waitFor(() => expect(result.current.weekStart).toBe(OPEN_WEEK));

    act(() => {
      result.current.setWeek(PAST_WEEK);
    });

    await waitFor(() =>
      expect(fetchFormationsMock).toHaveBeenCalledWith(PAST_WEEK)
    );
  });

  it("tải xong thì hết pending và mang theo dữ liệu của tuần", async () => {
    const { result } = renderFormationHook(() => useFormationWeek());

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.sessions).toHaveLength(1);
    // useAttendanceRecords keys its records; the hook hands downstream a flat list.
    expect(result.current.records).toEqual([RECORD]);
  });

  it("query đội hình lỗi thì hiện thông báo của backend", async () => {
    fetchFormationsMock.mockRejectedValue(new Error("Tuần này đã bị khoá."));

    const { result } = renderFormationHook(() => useFormationWeek());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBe("Tuần này đã bị khoá.");
  });

  it("lỗi không có thông báo riêng thì dùng câu mặc định", async () => {
    fetchCharactersMock.mockRejectedValue(new Error("boom"));

    const { result } = renderFormationHook(() => useFormationWeek());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBe("Không tải được dữ liệu đội hình.");
  });
});
