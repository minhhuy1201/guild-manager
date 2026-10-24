// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamNames, TeamNamesState } from "@guild/shared/schemas";

import { toastSuccess } from "@/components/shared/toast";
import { saveTeamNames } from "../../api/team-builder-api";
import { useTeamNameDraft } from "../use-team-name-draft";
import { renderFormationHook } from "./render-formation-hook";

vi.mock("../../api/team-builder-api", () => ({
  fetchTeamNames: vi.fn(),
  saveTeamNames: vi.fn(),
}));

vi.mock("@/components/shared/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const saveTeamNamesMock = vi.mocked(saveTeamNames);

/** The saved copy the hook reads, standing in for the query's data. */
const SAVED: TeamNamesState = { names: { "1": "Thủ nhà" }, version: 5 };

/** Stand-in for the names query's refetch. */
const refetchMock = vi.fn<() => Promise<TeamNamesState>>();

/**
 * Render `useTeamNameDraft` over a saved map.
 * @param saved - The names as the server has them
 * @param draft - Unsaved names to seed the store with
 * @returns The testing-library render result
 */
function renderNames(
  saved: TeamNamesState = SAVED,
  draft: TeamNames | null = null,
  baseVersion: number | null = draft ? saved.version : null
) {
  return renderFormationHook(() => useTeamNameDraft(saved, refetchMock), {
    teamNameDraft: draft,
    teamNameBaseVersion: baseVersion,
  });
}

beforeEach(() => {
  saveTeamNamesMock.mockReset();
  saveTeamNamesMock.mockResolvedValue({ ok: true, data: { names: {}, version: 6 } });
  refetchMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTeamNameDraft — đọc", () => {
  it("chưa sửa gì thì đọc bản đã lưu và không dirty", () => {
    const { result } = renderNames();

    expect(result.current.names).toEqual(SAVED.names);
    expect(result.current.dirty).toBe(false);
  });

  it("có nháp thì nháp che bản đã lưu", () => {
    const { result } = renderNames(SAVED, { "1": "Xung kích" });

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

  it("changeCount đếm số đội đổi tên", () => {
    const { result } = renderNames();
    expect(result.current.changeCount).toBe(0);

    act(() => result.current.setName(2, "Hậu cần"));
    act(() => result.current.setName(3, "Du kích"));

    expect(result.current.changeCount).toBe(2);
  });

  it("reset bỏ nháp, trả về bản đã lưu", () => {
    const { result } = renderNames(SAVED, { "1": "Xung kích" });

    act(() => result.current.reset());

    expect(result.current.names).toEqual(SAVED.names);
    expect(result.current.dirty).toBe(false);
  });
});

describe("useTeamNameDraft — lưu", () => {
  it("không bẩn thì không gọi API", async () => {
    const { result } = renderNames();

    await act(async () => {
      await result.current.save();
    });

    expect(saveTeamNamesMock).not.toHaveBeenCalled();
  });

  it("gửi đúng map đang hiện trên màn hình", async () => {
    const { result } = renderNames();

    act(() => result.current.setName(2, "Hậu cần"));
    await act(async () => {
      await result.current.save();
    });

    // TanStack hands the mutation function a context object as a second
    // argument; only the payload matters here.
    expect(saveTeamNamesMock.mock.calls[0][0]).toEqual({
      names: { "1": "Thủ nhà", "2": "Hậu cần" },
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
    expect(toastSuccess).toHaveBeenCalledWith("Đã lưu tên đội.");
  });

  it("lưu lỗi thì giữ nguyên nháp và hiện message của backend", async () => {
    saveTeamNamesMock.mockResolvedValue({ ok: false, message: "Tên đội quá dài.", statusCode: 400 });
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

describe("useTeamNameDraft — xung đột phiên bản", () => {
  const DRAFT = { "1": "Xung kích" };

  it("lưu gửi baseVersion của nháp, không phải version của bản đã lưu", async () => {
    const { result } = renderNames(SAVED, DRAFT, 3);

    await act(async () => {
      await result.current.save();
    });

    expect(saveTeamNamesMock.mock.calls[0][0]).toEqual({
      names: DRAFT,
      version: 3,
    });
  });

  it("412: isStale = true, nháp còn, không hiện message riêng", async () => {
    saveTeamNamesMock.mockResolvedValue({ ok: false, message: "Cũ rồi.", statusCode: 412 });
    const { result } = renderNames(SAVED, DRAFT, 3);

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.isStale).toBe(true);
    expect(result.current.dirty).toBe(true);
    expect(result.current.saveErrorMessage).toBeUndefined();
  });

  it("discardStale: xoá nháp, isStale = false, tải lại bản đã lưu", async () => {
    saveTeamNamesMock.mockResolvedValue({ ok: false, message: "Cũ rồi.", statusCode: 412 });
    refetchMock.mockResolvedValue({ names: {}, version: 6 });
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
    saveTeamNamesMock.mockResolvedValue({ ok: false, message: "Cũ rồi.", statusCode: 412 });
    const { result } = renderNames(SAVED, DRAFT, 3);
    await act(async () => {
      await result.current.save();
    });

    act(() => result.current.dismissStale());

    expect(result.current.isStale).toBe(false);
    expect(result.current.dirty).toBe(true);
  });

  it("overwriteStale: rebase lên version mới nhất rồi lưu với nó", async () => {
    saveTeamNamesMock.mockResolvedValueOnce({ ok: false, message: "Cũ rồi.", statusCode: 412 });
    saveTeamNamesMock.mockResolvedValueOnce({ ok: true, data: { names: DRAFT, version: 7 } });
    refetchMock.mockResolvedValue({ names: { "1": "Khác" }, version: 6 });
    const { result } = renderNames(SAVED, DRAFT, 3);
    await act(async () => {
      await result.current.save();
    });

    await act(async () => {
      await result.current.overwriteStale();
    });

    expect(saveTeamNamesMock.mock.calls.at(-1)?.[0]).toEqual({
      names: DRAFT,
      version: 6,
    });
    expect(result.current.isStale).toBe(false);
  });

  it("overwriteStale gặp 412 lần nữa: isStale vẫn true, nháp còn", async () => {
    saveTeamNamesMock.mockResolvedValue({ ok: false, message: "Cũ rồi.", statusCode: 412 });
    refetchMock.mockResolvedValue({ names: {}, version: 6 });
    const { result } = renderNames(SAVED, DRAFT, 3);

    await act(async () => {
      await result.current.overwriteStale();
    });

    expect(result.current.isStale).toBe(true);
    expect(result.current.dirty).toBe(true);
  });

  it("overwriteStale gặp lỗi 500: hết isStale, thông báo hiện ở thanh công cụ", async () => {
    saveTeamNamesMock.mockResolvedValue({ ok: false, message: "Máy chủ bận.", statusCode: 500 });
    refetchMock.mockResolvedValue({ names: {}, version: 6 });
    const { result } = renderNames(SAVED, { "1": "Xung kích" }, 3);

    await act(async () => {
      await result.current.overwriteStale();
    });

    expect(result.current.isStale).toBe(false);
    await waitFor(() =>
      expect(result.current.saveErrorMessage).toBe("Máy chủ bận.")
    );
  });
});
