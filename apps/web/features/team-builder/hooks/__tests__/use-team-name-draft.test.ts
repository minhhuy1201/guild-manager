// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamNames } from "@guild/shared/schemas";

import { ApiError } from "@/lib/api-client";
import { saveTeamNames } from "../../api/team-builder-api";
import { useTeamNameDraft } from "../use-team-name-draft";
import { renderFormationHook } from "./render-formation-hook";

vi.mock("../../api/team-builder-api", () => ({
  fetchTeamNames: vi.fn(),
  saveTeamNames: vi.fn(),
}));

const saveTeamNamesMock = vi.mocked(saveTeamNames);

/** The saved copy the hook reads, standing in for the query's data. */
const SAVED: TeamNames = { "1": "Thủ nhà" };

/**
 * Render `useTeamNameDraft` over a saved map.
 * @param saved - The names as the server has them
 * @param draft - Unsaved names to seed the store with
 * @returns The testing-library render result
 */
function renderNames(saved: TeamNames = SAVED, draft: TeamNames | null = null) {
  return renderFormationHook(() => useTeamNameDraft(saved), {
    teamNameDraft: draft,
  });
}

beforeEach(() => {
  saveTeamNamesMock.mockReset();
  saveTeamNamesMock.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTeamNameDraft — đọc", () => {
  it("chưa sửa gì thì đọc bản đã lưu và không dirty", () => {
    const { result } = renderNames();

    expect(result.current.names).toEqual(SAVED);
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

  it("reset bỏ nháp, trả về bản đã lưu", () => {
    const { result } = renderNames(SAVED, { "1": "Xung kích" });

    act(() => result.current.reset());

    expect(result.current.names).toEqual(SAVED);
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
      "1": "Thủ nhà",
      "2": "Hậu cần",
    });
  });

  it("lưu xong thì bỏ nháp", async () => {
    const { result } = renderNames();

    act(() => result.current.setName(2, "Hậu cần"));
    await act(async () => {
      await result.current.save();
    });

    await waitFor(() => expect(result.current.dirty).toBe(false));
  });

  it("lưu lỗi thì giữ nguyên nháp và hiện message của backend", async () => {
    saveTeamNamesMock.mockRejectedValue(
      new ApiError("Tên đội quá dài.", 400)
    );
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
  });
});
