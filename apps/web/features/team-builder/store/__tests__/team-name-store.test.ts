import { beforeEach, describe, expect, it } from "vitest";

import type { TeamNames, TeamNamesState } from "@guild/shared/schemas";

import { useTeamNameStore } from "../team-name-store";

/** The saved copy, as the server returns it. */
const SAVED: TeamNamesState = {
  names: { "1": "Thủ nhà", "7": "Dự bị" },
  version: 5,
};

/**
 * Read the draft as it stands.
 * @returns The current draft, null while nothing has been typed
 */
function draft(): TeamNames | null {
  return useTeamNameStore.getState().draft;
}

describe("useTeamNameStore", () => {
  beforeEach(() => {
    useTeamNameStore.setState({ draft: null, baseVersion: null });
  });

  it("chưa sửa gì thì không có nháp", () => {
    expect(draft()).toBeNull();
  });

  it("lần sửa đầu dựng nháp từ bản đã lưu, giữ nguyên tên các đội khác", () => {
    useTeamNameStore.getState().setName(SAVED, 3, "Xung kích");

    expect(draft()).toEqual({
      "1": "Thủ nhà",
      "3": "Xung kích",
      "7": "Dự bị",
    });
  });

  it("không sửa vào chính bản đã lưu", () => {
    useTeamNameStore.getState().setName(SAVED, 3, "Xung kích");

    expect(SAVED.names).toEqual({ "1": "Thủ nhà", "7": "Dự bị" });
  });

  it("tên rỗng thì xoá khoá để header quay về số đội", () => {
    useTeamNameStore.getState().setName(SAVED, 1, "");

    expect(draft()).toEqual({ "7": "Dự bị" });
    expect(draft()).not.toHaveProperty("1");
  });

  it("tên toàn khoảng trắng cũng là xoá", () => {
    useTeamNameStore.getState().setName(SAVED, 1, "   ");

    expect(draft()).not.toHaveProperty("1");
  });

  it("cắt khoảng trắng thừa hai đầu", () => {
    useTeamNameStore.getState().setName(SAVED, 4, "  Hậu cần  ");

    expect(draft()?.["4"]).toBe("Hậu cần");
  });

  it("lần sửa sau ghi tiếp lên nháp, không quay về bản đã lưu", () => {
    const store = useTeamNameStore.getState();
    store.setName(SAVED, 3, "Xung kích");
    store.setName(SAVED, 4, "Hậu cần");

    expect(draft()).toEqual({
      "1": "Thủ nhà",
      "3": "Xung kích",
      "4": "Hậu cần",
      "7": "Dự bị",
    });
  });

  it("clearDraft trả về trạng thái chưa sửa gì", () => {
    const store = useTeamNameStore.getState();
    store.setName(SAVED, 3, "Xung kích");
    store.clearDraft();

    expect(draft()).toBeNull();
  });

  describe("baseVersion", () => {
    it("setName lần đầu lấy version từ saved, lần sau giữ", () => {
      const store = useTeamNameStore.getState();
      store.setName(SAVED, 3, "Xung kích");
      store.setName({ ...SAVED, version: 9 }, 4, "Hậu cần");

      expect(useTeamNameStore.getState().baseVersion).toBe(5);
    });

    it("rebase đổi baseVersion, giữ nháp", () => {
      useTeamNameStore.getState().setName(SAVED, 3, "Xung kích");
      useTeamNameStore.getState().rebase(8);

      expect(useTeamNameStore.getState().baseVersion).toBe(8);
      expect(draft()).not.toBeNull();
    });

    it("clearDraft đặt draft và baseVersion về null", () => {
      useTeamNameStore.getState().setName(SAVED, 3, "Xung kích");
      useTeamNameStore.getState().clearDraft();

      expect(draft()).toBeNull();
      expect(useTeamNameStore.getState().baseVersion).toBeNull();
    });
  });
});
