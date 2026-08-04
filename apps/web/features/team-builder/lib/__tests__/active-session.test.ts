import { describe, expect, it } from "vitest";

import { resolveActiveSessionId } from "../active-session";

const SESSIONS = [
  { sessionId: "session-tue", isGuildWar: false },
  { sessionId: "session-sat", isGuildWar: true },
];

describe("resolveActiveSessionId", () => {
  it("giữ nguyên tab đang mở khi trận vẫn còn", () => {
    expect(resolveActiveSessionId(SESSIONS, "session-tue")).toBe("session-tue");
  });

  it("rơi về Guild War khi trận đang mở đã bị xoá", () => {
    expect(resolveActiveSessionId(SESSIONS, "session-da-xoa")).toBe(
      "session-sat"
    );
  });

  it("chưa chọn gì thì mặc định mở Guild War", () => {
    expect(resolveActiveSessionId(SESSIONS, null)).toBe("session-sat");
  });

  it("không có Guild War thì lấy trận đầu tiên", () => {
    expect(
      resolveActiveSessionId(
        [{ sessionId: "session-tue", isGuildWar: false }],
        null
      )
    ).toBe("session-tue");
  });

  it("tuần không còn trận nào thì trả null", () => {
    expect(resolveActiveSessionId([], "session-tue")).toBeNull();
  });
});
