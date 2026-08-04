import { describe, expect, it } from "vitest";

import { getSessionSubtitle } from "../session-subtitle";

describe("getSessionSubtitle", () => {
  it("trận thường có đối thủ thì hiện tên bang", () => {
    expect(
      getSessionSubtitle({
        isGuildWar: false,
        dateTime: "2026-07-21T13:30:00.000Z",
        opponent: "Hắc Long Đường",
      })
    ).toBe("VS: Hắc Long Đường");
  });

  it("trận thường chưa chốt đối thủ thì báo còn thiếu", () => {
    expect(
      getSessionSubtitle({
        isGuildWar: false,
        dateTime: "2026-07-21T13:30:00.000Z",
        opponent: null,
      })
    ).toBe("Chưa có đối thủ");
  });

  it("Guild War hiện giờ đánh, không có đối thủ", () => {
    expect(
      getSessionSubtitle({
        isGuildWar: true,
        dateTime: "2026-07-25T13:00:00.000Z",
        opponent: null,
      })
    ).toBe("20:00");
  });
});
