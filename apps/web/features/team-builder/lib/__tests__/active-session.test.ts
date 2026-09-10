import { describe, expect, it } from "vitest";

import { resolveActiveSessionId } from "../active-session";

/**
 * Build a Date from Vietnam time (UTC+7) for readability in tests.
 * @param iso - A string like '2026-07-21T20:30', read as Vietnam time
 * @returns The matching UTC Date
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

// Tuesday the 21st and Saturday the 25th of the same week.
const SESSIONS = [
  {
    sessionId: "session-tue",
    isGuildWar: false,
    dateTime: vn("2026-07-21T20:30").toISOString(),
  },
  {
    sessionId: "session-sat",
    isGuildWar: true,
    dateTime: vn("2026-07-25T20:30").toISOString(),
  },
];

/** A moment on a day of the week that holds no battle. */
const WEDNESDAY = vn("2026-07-22T09:00");

describe("resolveActiveSessionId", () => {
  it("giữ nguyên tab đang mở khi trận vẫn còn", () => {
    expect(resolveActiveSessionId(SESSIONS, "session-tue", WEDNESDAY)).toBe(
      "session-tue"
    );
  });

  it("tab đang mở thắng cả trận của hôm nay", () => {
    expect(
      resolveActiveSessionId(SESSIONS, "session-sat", vn("2026-07-21T09:00"))
    ).toBe("session-sat");
  });

  it("chưa chọn gì thì mở trận của hôm nay", () => {
    expect(
      resolveActiveSessionId(SESSIONS, null, vn("2026-07-21T09:00"))
    ).toBe("session-tue");
  });

  it("trận đã đánh xong trong hôm nay vẫn được mở", () => {
    // 23:00 Tuesday, two hours after the battle: still today.
    expect(
      resolveActiveSessionId(SESSIONS, null, vn("2026-07-21T23:00"))
    ).toBe("session-tue");
  });

  it("hôm nay không có trận thì mặc định mở Guild War", () => {
    expect(resolveActiveSessionId(SESSIONS, null, WEDNESDAY)).toBe(
      "session-sat"
    );
  });

  it("rơi về trận của hôm nay khi trận đang mở đã bị xoá", () => {
    expect(
      resolveActiveSessionId(
        SESSIONS,
        "session-da-xoa",
        vn("2026-07-21T09:00")
      )
    ).toBe("session-tue");
  });

  it("rơi về Guild War khi trận đang mở đã bị xoá", () => {
    expect(
      resolveActiveSessionId(SESSIONS, "session-da-xoa", WEDNESDAY)
    ).toBe("session-sat");
  });

  it("hôm nay có hai trận thì lấy trận sớm nhất", () => {
    const sessions = [
      {
        sessionId: "session-tue-som",
        isGuildWar: false,
        dateTime: vn("2026-07-21T19:00").toISOString(),
      },
      {
        sessionId: "session-tue-muon",
        isGuildWar: false,
        dateTime: vn("2026-07-21T21:00").toISOString(),
      },
    ];

    expect(
      resolveActiveSessionId(sessions, null, vn("2026-07-21T09:00"))
    ).toBe("session-tue-som");
  });

  it("không có Guild War thì lấy trận đầu tiên", () => {
    expect(resolveActiveSessionId([SESSIONS[0]!], null, WEDNESDAY)).toBe(
      "session-tue"
    );
  });

  it("tuần không còn trận nào thì trả null", () => {
    expect(resolveActiveSessionId([], "session-tue", WEDNESDAY)).toBeNull();
  });
});
