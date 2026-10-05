// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAttendanceRecords,
  fetchCharacters,
} from "@/features/attendance/api/attendance-api";
import {
  fetchFormations,
  fetchFormationWeeks,
  fetchTeamNames,
} from "../../api/team-builder-api";
import { useTeamNameStore } from "../../store/team-name-store";
import { useFormationScreen } from "../use-formation-screen";
import { makeSession, renderFormationHook } from "./render-formation-hook";

vi.mock("../../api/team-builder-api", () => ({
  fetchFormationWeeks: vi.fn(),
  fetchFormations: vi.fn(),
  fetchTeamNames: vi.fn(),
  saveFormation: vi.fn(),
  saveTeamNames: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/attendance/api/attendance-api", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/features/attendance/api/attendance-api")
  >()),
  fetchCharacters: vi.fn(),
  fetchAttendanceRecords: vi.fn(),
}));

vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));

const fetchTeamNamesMock = vi.mocked(fetchTeamNames);

beforeEach(() => {
  vi.mocked(fetchFormationWeeks).mockResolvedValue([
    { weekStart: "2026-08-17T00:00:00.000Z", weekEnd: "x", isActive: true },
  ]);
  vi.mocked(fetchFormations).mockResolvedValue([makeSession("thu-7")]);
  vi.mocked(fetchCharacters).mockResolvedValue([]);
  vi.mocked(fetchAttendanceRecords).mockResolvedValue({});
});

describe("useFormationScreen - tên đội", () => {
  // A draft started from the empty fallback (version 0) would pass the lock and wipe other names.
  it("chưa tải xong tên đội thì chưa cho sửa, không dựng nháp", async () => {
    fetchTeamNamesMock.mockReturnValue(new Promise(() => undefined));
    const { result } = renderFormationHook(() => useFormationScreen());
    await waitFor(() => expect(result.current.week.isPending).toBe(false));

    act(() => result.current.teamNames.setName(1, "Xung kích"));

    expect(useTeamNameStore.getState().draft).toBeNull();
  });

  it("tải xong tên đội thì sửa được, nháp mang version đã tải", async () => {
    fetchTeamNamesMock.mockResolvedValue({
      names: { "2": "Thủ nhà" },
      version: 4,
    });
    const { result } = renderFormationHook(() => useFormationScreen());
    await waitFor(() =>
      expect(result.current.teamNames.names).toEqual({ "2": "Thủ nhà" })
    );

    act(() => result.current.teamNames.setName(1, "Xung kích"));

    expect(useTeamNameStore.getState().baseVersion).toBe(4);
    expect(result.current.teamNames.names["1"]).toBe("Xung kích");
  });
});
