// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { TeamColor } from "@guild/shared/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAttendanceRecords,
  fetchCharacters,
} from "@/features/attendance/api/attendance-api";
import {
  fetchFormations,
  fetchFormationWeeks,
  fetchTeamSettings,
} from "../../api/team-builder-api";
import { useTeamSettingsStore } from "../../store/team-settings-store";
import { useFormationScreen } from "../use-formation-screen";
import { makeSession, renderFormationHook } from "./render-formation-hook";

vi.mock("../../api/team-builder-api", () => ({
  fetchFormationWeeks: vi.fn(),
  fetchFormations: vi.fn(),
  fetchTeamSettings: vi.fn(),
  saveFormation: vi.fn(),
  saveTeamSettings: vi.fn(),
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

const fetchTeamSettingsMock = vi.mocked(fetchTeamSettings);

beforeEach(() => {
  vi.mocked(fetchFormationWeeks).mockResolvedValue({ ok: true, data: [
    { weekStart: "2026-08-17T00:00:00.000Z", weekEnd: "x", isActive: true },
  ] });
  vi.mocked(fetchFormations).mockResolvedValue({ ok: true, data: [makeSession("thu-7")] });
  vi.mocked(fetchCharacters).mockResolvedValue({ ok: true, data: [] });
  vi.mocked(fetchAttendanceRecords).mockResolvedValue({ ok: true, data: {} });
});

describe("useFormationScreen - tên đội", () => {
  // A draft started from the empty fallback (version 0) would pass the lock and wipe other names.
  it("chưa tải xong tên đội thì chưa cho sửa, không dựng nháp", async () => {
    fetchTeamSettingsMock.mockReturnValue(new Promise(() => undefined));
    const { result } = renderFormationHook(() => useFormationScreen());
    await waitFor(() => expect(result.current.week.isPending).toBe(false));

    act(() => result.current.teamSettings.setName(1, "Xung kích"));

    expect(useTeamSettingsStore.getState().draft).toBeNull();
  });

  it("chưa tải xong thì chưa cho đổi màu, không dựng nháp", async () => {
    fetchTeamSettingsMock.mockReturnValue(new Promise(() => undefined));
    const { result } = renderFormationHook(() => useFormationScreen());
    await waitFor(() => expect(result.current.week.isPending).toBe(false));

    act(() => result.current.teamSettings.setColor(1, TeamColor.RED));

    expect(useTeamSettingsStore.getState().draft).toBeNull();
  });

  it("tải xong tên đội thì sửa được, nháp mang version đã tải", async () => {
    fetchTeamSettingsMock.mockResolvedValue({ ok: true, data: {
      names: { "2": "Thủ nhà" },
      colors: {},
      version: 4,
    } });
    const { result } = renderFormationHook(() => useFormationScreen());
    await waitFor(() =>
      expect(result.current.teamSettings.names).toEqual({ "2": "Thủ nhà" })
    );

    act(() => result.current.teamSettings.setName(1, "Xung kích"));

    expect(useTeamSettingsStore.getState().baseVersion).toBe(4);
    expect(result.current.teamSettings.names["1"]).toBe("Xung kích");
  });
});
