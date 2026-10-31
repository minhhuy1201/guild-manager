// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamColor, TeamIcon } from "@guild/shared/enums";
import type { TeamSettings, TeamSettingsState } from "@guild/shared/schemas";

import { toastSuccess } from "@/components/shared/toast";
import { saveTeamSettings } from "../../api/team-builder-api";
import { useTeamSettingsDraft } from "../use-team-settings-draft";
import { renderFormationHook } from "./render-formation-hook";

vi.mock("../../api/team-builder-api", () => ({
  fetchTeamSettings: vi.fn(),
  saveTeamSettings: vi.fn(),
}));

/** `useSessionRecovery` needs a router; the save path's contract is only "hand a 401 over". */
const recoverSessionMock = vi.fn<(error: unknown) => boolean>(() => false);

vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => recoverSessionMock,
}));

vi.mock("@/components/shared/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const saveTeamSettingsMock = vi.mocked(saveTeamSettings);

/** The saved copy the hook reads, standing in for the query's data. */
const SAVED: TeamSettingsState = {
  names: { "1": "Thủ nhà" },
  colors: { "1": TeamColor.RED },
  icons: { "1": TeamIcon.SHIELD },
  version: 5,
};

/** Stand-in for the names query's refetch. */
const refetchMock = vi.fn<() => Promise<TeamSettingsState>>();

/**
 * Render `useTeamSettingsDraft` over a saved map.
 * @param saved - The names as the server has them
 * @param draft - Unsaved names to seed the store with
 * @returns The testing-library render result
 */
function renderNames(
  saved: TeamSettingsState = SAVED,
  draft: TeamSettings | null = null,
  baseVersion: number | null = draft ? saved.version : null
) {
  return renderFormationHook(() => useTeamSettingsDraft(saved, refetchMock), {
    teamSettingsDraft: draft,
    teamSettingsBaseVersion: baseVersion,
  });
}

beforeEach(() => {
  saveTeamSettingsMock.mockReset();
  saveTeamSettingsMock.mockResolvedValue({ ok: true, data: { names: {}, colors: {}, icons: {}, version: 6 } });
  refetchMock.mockReset();
  recoverSessionMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTeamSettingsDraft — đọc", () => {
  it("chưa sửa gì thì đọc bản đã lưu và không dirty", () => {
    const { result } = renderNames();

    expect(result.current.names).toEqual(SAVED.names);
    expect(result.current.dirty).toBe(false);
  });

  it("có nháp thì nháp che bản đã lưu", () => {
    const { result } = renderNames(SAVED, { names: { "1": "Xung kích" }, colors: SAVED.colors, icons: SAVED.icons });

    expect(result.current.names).toEqual({ "1": "Xung kích" });
    expect(result.current.dirty).toBe(true);
  });

  it("gõ lại đúng tên cũ thì hết dirty", () => {
    const { result } = renderNames();

    act(() => result.current.setName(1, "Thủ nhà"));

    expect(result.current.dirty).toBe(false);
  });

  it("sửa tên một đội thì dirty", () => {
    const { result } = renderNames();

    act(() => result.current.setName(2, "Hậu cần"));

    expect(result.current.names["2"]).toBe("Hậu cần");
    expect(result.current.dirty).toBe(true);
  });

  it("đổi màu thì dirty, đặt lại màu đã lưu thì hết", () => {
    const { result } = renderNames();

    act(() => result.current.setColor(1, TeamColor.SKY));
    expect(result.current.colors["1"]).toBe(TeamColor.SKY);
    expect(result.current.dirty).toBe(true);

    act(() => result.current.setColor(1, TeamColor.RED));
    expect(result.current.dirty).toBe(false);
  });

  it("đổi icon thì dirty, đặt lại icon đã lưu thì hết, null xoá key", () => {
    const { result } = renderNames();

    act(() => result.current.setIcon(1, TeamIcon.EYE));
    expect(result.current.icons["1"]).toBe(TeamIcon.EYE);
    expect(result.current.dirty).toBe(true);

    act(() => result.current.setIcon(1, TeamIcon.SHIELD));
    expect(result.current.dirty).toBe(false);

    act(() => result.current.setIcon(1, null));
    expect(result.current.icons).toEqual({});
    expect(result.current.changeCount).toBe(1);
  });

  it("setColor null xoá màu đã chọn", () => {
    const { result } = renderNames();

    act(() => result.current.setColor(1, null));

    expect(result.current.colors).toEqual({});
    expect(result.current.dirty).toBe(true);
  });

  it("changeCount đếm số đội đổi tên", () => {
    const { result } = renderNames();
    expect(result.current.changeCount).toBe(0);

    act(() => result.current.setName(2, "Hậu cần"));
    act(() => result.current.setName(3, "Du kích"));

    expect(result.current.changeCount).toBe(2);
  });

  it("reset bỏ nháp, trả về bản đã lưu", () => {
    const { result } = renderNames(SAVED, { names: { "1": "Xung kích" }, colors: SAVED.colors, icons: SAVED.icons });

    act(() => result.current.reset());

    expect(result.current.names).toEqual(SAVED.names);
    expect(result.current.dirty).toBe(false);
  });
});

describe("useTeamSettingsDraft — lưu", () => {
  it("không bẩn thì không gọi API", async () => {
    const { result } = renderNames();

    await act(async () => {
      await result.current.save();
    });

    expect(saveTeamSettingsMock).not.toHaveBeenCalled();
  });

  it("gửi cả màu cùng tên trong một lần lưu", async () => {
    const { result } = renderNames();

    act(() => result.current.setColor(3, TeamColor.ORANGE));
    await act(async () => {
      await result.current.save();
    });

    expect(saveTeamSettingsMock).toHaveBeenCalledTimes(1);
    expect(saveTeamSettingsMock.mock.calls[0][0]).toEqual({
      names: { "1": "Thủ nhà" },
      colors: { "1": TeamColor.RED, "3": TeamColor.ORANGE },
      icons: { "1": TeamIcon.SHIELD },
      version: 5,
    });
  });

  it("gửi đúng map đang hiện trên màn hình", async () => {
    const { result } = renderNames();

    act(() => result.current.setName(2, "Hậu cần"));
    await act(async () => {
      await result.current.save();
    });

    // TanStack hands the mutation function a context object as a second
    // argument; only the payload matters here.
    expect(saveTeamSettingsMock.mock.calls[0][0]).toEqual({
      names: { "1": "Thủ nhà", "2": "Hậu cần" },
      colors: { "1": TeamColor.RED },
      icons: { "1": TeamIcon.SHIELD },
      version: 5,
    });
  });

  it("lưu xong thì bỏ nháp", async () => {
    const { result } = renderNames();

    act(() => result.current.setName(2, "Hậu cần"));
    await act(async () => {
      await result.current.save();
    });

    await waitFor(() => expect(result.current.dirty).toBe(false));
    expect(toastSuccess).toHaveBeenCalledWith("Đã lưu tên, màu và biểu tượng đội.");
  });

  it("lưu lỗi thì giữ nguyên nháp và hiện message của backend", async () => {
    saveTeamSettingsMock.mockResolvedValue({ ok: false, message: "Tên đội quá dài.", statusCode: 400 });
    const { result } = renderNames();

    act(() => result.current.setName(2, "Hậu cần"));
    await act(async () => {
      await result.current.save();
    });

    await waitFor(() =>
      expect(result.current.saveErrorMessage).toBe("Tên đội quá dài.")
    );
    expect(result.current.names["2"]).toBe("Hậu cần");
    expect(result.current.dirty).toBe(true);
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

/** An unsaved rename of team 1, based on version 3. */
const DRAFT: TeamSettings = {
  names: { "1": "Xung kích" },
  colors: SAVED.colors,
  icons: SAVED.icons,
};

describe("useTeamSettingsDraft — xung đột phiên bản", () => {
  

  it("lưu gửi baseVersion của nháp, không phải version của bản đã lưu", async () => {
    const { result } = renderNames(SAVED, DRAFT, 3);

    await act(async () => {
      await result.current.save();
    });

    expect(saveTeamSettingsMock.mock.calls[0][0]).toEqual({
      ...DRAFT,
      version: 3,
    });
  });

  it("401: giao cho recoverSession, giữ nháp, không hiện message riêng", async () => {
    saveTeamSettingsMock.mockResolvedValue({ ok: false, message: "Hết phiên.", statusCode: 401 });
    const { result } = renderNames(SAVED, DRAFT, 3);

    await act(async () => {
      await result.current.save();
    });

    expect(recoverSessionMock).toHaveBeenCalledOnce();
    expect(result.current.dirty).toBe(true);
    expect(result.current.isStale).toBe(false);
    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(result.current.saveErrorMessage).toBeUndefined();
  });

  it("412: isStale = true, nháp còn, không hiện message riêng", async () => {
    saveTeamSettingsMock.mockResolvedValue({ ok: false, message: "Cũ rồi.", statusCode: 412 });
    const { result } = renderNames(SAVED, DRAFT, 3);

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.isStale).toBe(true);
    expect(result.current.dirty).toBe(true);
    expect(result.current.saveErrorMessage).toBeUndefined();
  });

  it("discardStale: xoá nháp, isStale = false, tải lại bản đã lưu", async () => {
    saveTeamSettingsMock.mockResolvedValue({ ok: false, message: "Cũ rồi.", statusCode: 412 });
    refetchMock.mockResolvedValue({ names: {}, colors: {}, icons: {}, version: 6 });
    const { result } = renderNames(SAVED, DRAFT, 3);
    await act(async () => {
      await result.current.save();
    });

    act(() => result.current.discardStale());

    expect(result.current.isStale).toBe(false);
    expect(result.current.dirty).toBe(false);
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it("dismissStale giữ nháp, isStale = false", async () => {
    saveTeamSettingsMock.mockResolvedValue({ ok: false, message: "Cũ rồi.", statusCode: 412 });
    const { result } = renderNames(SAVED, DRAFT, 3);
    await act(async () => {
      await result.current.save();
    });

    act(() => result.current.dismissStale());

    expect(result.current.isStale).toBe(false);
    expect(result.current.dirty).toBe(true);
  });

  it("overwriteStale: rebase lên version mới nhất rồi lưu với nó", async () => {
    saveTeamSettingsMock.mockResolvedValueOnce({ ok: false, message: "Cũ rồi.", statusCode: 412 });
    saveTeamSettingsMock.mockResolvedValueOnce({ ok: true, data: { ...DRAFT, version: 7 } });
    refetchMock.mockResolvedValue({ names: { "1": "Khác" }, colors: {}, icons: {}, version: 6 });
    const { result } = renderNames(SAVED, DRAFT, 3);
    await act(async () => {
      await result.current.save();
    });

    await act(async () => {
      await result.current.overwriteStale();
    });

    expect(saveTeamSettingsMock.mock.calls.at(-1)?.[0]).toEqual({
      ...DRAFT,
      version: 6,
    });
    expect(result.current.isStale).toBe(false);
  });

  it("overwriteStale gặp 412 lần nữa: isStale vẫn true, nháp còn", async () => {
    saveTeamSettingsMock.mockResolvedValue({ ok: false, message: "Cũ rồi.", statusCode: 412 });
    refetchMock.mockResolvedValue({ names: {}, colors: {}, icons: {}, version: 6 });
    const { result } = renderNames(SAVED, DRAFT, 3);

    await act(async () => {
      await result.current.overwriteStale();
    });

    expect(result.current.isStale).toBe(true);
    expect(result.current.dirty).toBe(true);
  });

  it("overwriteStale gặp lỗi 500: hết isStale, thông báo hiện ở thanh công cụ", async () => {
    saveTeamSettingsMock.mockResolvedValue({ ok: false, message: "Máy chủ bận.", statusCode: 500 });
    refetchMock.mockResolvedValue({ names: {}, colors: {}, icons: {}, version: 6 });
    const { result } = renderNames(SAVED, DRAFT, 3);

    await act(async () => {
      await result.current.overwriteStale();
    });

    expect(result.current.isStale).toBe(false);
    await waitFor(() =>
      expect(result.current.saveErrorMessage).toBe("Máy chủ bận.")
    );
  });
});
