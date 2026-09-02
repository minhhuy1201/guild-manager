import { describe, expect, it } from "vitest";

import { getSessionSubtitle, joinSessionMeta } from "../session-subtitle";

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

  it("Guild War không còn dòng phụ vì nhãn đã mang giờ đánh", () => {
    expect(
      getSessionSubtitle({
        isGuildWar: true,
        dateTime: "2026-07-25T13:00:00.000Z",
        opponent: null,
      })
    ).toBe("");
  });
});

describe("joinSessionMeta", () => {
  it("nối các mảnh bằng dấu chấm giữa", () => {
    expect(joinSessionMeta("VS: Hắc Long Đường", "đã điểm danh 12/30")).toBe(
      "VS: Hắc Long Đường · đã điểm danh 12/30"
    );
  });

  it("bỏ mảnh rỗng thay vì để lại dấu phân cách thừa", () => {
    expect(joinSessionMeta("", "đã điểm danh 12/30")).toBe(
      "đã điểm danh 12/30"
    );
    expect(joinSessionMeta("VS: Hắc Long Đường", null)).toBe(
      "VS: Hắc Long Đường"
    );
    expect(joinSessionMeta("", null)).toBe("");
  });
});
