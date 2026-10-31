import { beforeEach, describe, expect, it } from "vitest";

import { TeamColor, TeamIcon } from "@guild/shared/enums";
import type { TeamSettings, TeamSettingsState } from "@guild/shared/schemas";

import { useTeamSettingsStore } from "../team-settings-store";

/** The saved copy, as the server returns it. */
const SAVED: TeamSettingsState = {
  names: { "1": "Thủ nhà", "7": "Dự bị" },
  colors: { "7": TeamColor.PURPLE },
  icons: { "7": TeamIcon.TRUCK },
  version: 5,
};

/**
 * Read the draft as it stands.
 * @returns The current draft, null while nothing has been typed
 */
function draft(): TeamSettings | null {
  return useTeamSettingsStore.getState().draft;
}

describe("useTeamSettingsStore", () => {
  beforeEach(() => {
    useTeamSettingsStore.setState({ draft: null, baseVersion: null });
  });

  it("chưa sửa gì thì không có nháp", () => {
    expect(draft()).toBeNull();
  });

  it("lần sửa đầu dựng nháp từ bản đã lưu, giữ nguyên tên các đội khác", () => {
    useTeamSettingsStore.getState().setName(SAVED, 3, "Xung kích");

    expect(draft()?.names).toEqual({
      "1": "Thủ nhà",
      "3": "Xung kích",
      "7": "Dự bị",
    });
    expect(draft()?.colors).toEqual({ "7": TeamColor.PURPLE });
  });

  it("không sửa vào chính bản đã lưu", () => {
    useTeamSettingsStore.getState().setName(SAVED, 3, "Xung kích");

    expect(SAVED.names).toEqual({ "1": "Thủ nhà", "7": "Dự bị" });
    expect(SAVED.colors).toEqual({ "7": TeamColor.PURPLE });
  });

  it("tên rỗng thì xoá khoá để header quay về số đội", () => {
    useTeamSettingsStore.getState().setName(SAVED, 1, "");

    expect(draft()?.names).toEqual({ "7": "Dự bị" });
    expect(draft()?.names).not.toHaveProperty("1");
  });

  it("tên toàn khoảng trắng cũng là xoá", () => {
    useTeamSettingsStore.getState().setName(SAVED, 1, "   ");

    expect(draft()?.names).not.toHaveProperty("1");
  });

  it("cắt khoảng trắng thừa hai đầu", () => {
    useTeamSettingsStore.getState().setName(SAVED, 4, "  Hậu cần  ");

    expect(draft()?.names["4"]).toBe("Hậu cần");
  });

  it("lần sửa sau ghi tiếp lên nháp, không quay về bản đã lưu", () => {
    const store = useTeamSettingsStore.getState();
    store.setName(SAVED, 3, "Xung kích");
    store.setName(SAVED, 4, "Hậu cần");

    expect(draft()?.names).toEqual({
      "1": "Thủ nhà",
      "3": "Xung kích",
      "4": "Hậu cần",
      "7": "Dự bị",
    });
  });

  it("clearDraft trả về trạng thái chưa sửa gì", () => {
    const store = useTeamSettingsStore.getState();
    store.setName(SAVED, 3, "Xung kích");
    store.clearDraft();

    expect(draft()).toBeNull();
  });

  describe("setColor", () => {
    it("lần đầu dựng nháp từ bản đã lưu, giữ tên và màu các đội khác", () => {
      useTeamSettingsStore.getState().setColor(SAVED, 3, TeamColor.RED);

      expect(draft()).toEqual({
        names: { "1": "Thủ nhà", "7": "Dự bị" },
        colors: { "3": TeamColor.RED, "7": TeamColor.PURPLE },
        icons: { "7": TeamIcon.TRUCK },
      });
    });

    it("null xoá khoá để đội quay về màu mặc định", () => {
      useTeamSettingsStore.getState().setColor(SAVED, 7, null);

      expect(draft()?.colors).toEqual({});
      expect(draft()?.colors).not.toHaveProperty("7");
    });

    it("không sửa vào chính bản đã lưu", () => {
      useTeamSettingsStore.getState().setColor(SAVED, 7, null);

      expect(SAVED.colors).toEqual({ "7": TeamColor.PURPLE });
    });

    it("sửa tên sau khi đổi màu giữ màu trong nháp", () => {
      const store = useTeamSettingsStore.getState();
      store.setColor(SAVED, 3, TeamColor.RED);
      store.setName(SAVED, 4, "Hậu cần");

      expect(draft()?.colors["3"]).toBe(TeamColor.RED);
      expect(draft()?.names["4"]).toBe("Hậu cần");
    });

    it("lần đầu lấy version từ saved", () => {
      useTeamSettingsStore.getState().setColor(SAVED, 3, TeamColor.RED);

      expect(useTeamSettingsStore.getState().baseVersion).toBe(5);
    });
  });

  describe("baseVersion", () => {
    it("setName lần đầu lấy version từ saved, lần sau giữ", () => {
      const store = useTeamSettingsStore.getState();
      store.setName(SAVED, 3, "Xung kích");
      store.setName({ ...SAVED, version: 9 }, 4, "Hậu cần");

      expect(useTeamSettingsStore.getState().baseVersion).toBe(5);
    });

    it("rebase đổi baseVersion, giữ nháp", () => {
      useTeamSettingsStore.getState().setName(SAVED, 3, "Xung kích");
      useTeamSettingsStore.getState().rebase(8);

      expect(useTeamSettingsStore.getState().baseVersion).toBe(8);
      expect(draft()).not.toBeNull();
    });

    it("clearDraft đặt draft và baseVersion về null", () => {
      useTeamSettingsStore.getState().setName(SAVED, 3, "Xung kích");
      useTeamSettingsStore.getState().clearDraft();

      expect(draft()).toBeNull();
      expect(useTeamSettingsStore.getState().baseVersion).toBeNull();
    });
  });

describe("setIcon", () => {
  it("lần đầu dựng nháp từ bản đã lưu, giữ tên, màu và icon các đội khác", () => {
    useTeamSettingsStore.getState().setIcon(SAVED, 3, TeamIcon.CASTLE);

    expect(draft()).toEqual({
      names: SAVED.names,
      colors: SAVED.colors,
      icons: { "3": TeamIcon.CASTLE, "7": TeamIcon.TRUCK },
    });
  });

  it("null xoá khoá để đội quay về chấm màu", () => {
    useTeamSettingsStore.getState().setIcon(SAVED, 7, null);

    expect(draft()?.icons).toEqual({});
    expect(SAVED.icons).toEqual({ "7": TeamIcon.TRUCK });
  });

  it("đổi màu sau khi đổi icon giữ icon trong nháp", () => {
    const store = useTeamSettingsStore.getState();
    store.setIcon(SAVED, 3, TeamIcon.EYE);
    store.setColor(SAVED, 4, TeamColor.RED);

    expect(draft()?.icons["3"]).toBe(TeamIcon.EYE);
    expect(draft()?.colors["4"]).toBe(TeamColor.RED);
  });
});
});
