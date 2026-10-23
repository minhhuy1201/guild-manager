import { describe, expect, it } from "vitest";

import { splitFoughtBattles } from "../fought-battles";

const NOW = new Date("2026-08-26T12:00:00.000Z");

/**
 * Build a session with only the fields the split reads.
 * @param id - Session id
 * @param dateTime - Battle time (ISO)
 * @param isAttendanceClosed - Whether the API already locked it
 * @returns The session
 */
function session(id: string, dateTime: string, isAttendanceClosed = false) {
  return { id, dateTime, isAttendanceClosed };
}

describe("splitFoughtBattles", () => {
  it("tách trận đã qua giờ đánh khỏi trận sắp tới, giữ thứ tự", () => {
    const sessions = [
      session("a", "2026-08-24T20:00:00.000Z"),
      session("b", "2026-08-25T20:00:00.000Z"),
      session("c", "2026-08-27T20:00:00.000Z"),
      session("d", "2026-08-28T20:00:00.000Z"),
    ];

    const { upcoming, fought } = splitFoughtBattles(sessions, NOW);

    expect(upcoming.map((s) => s.id)).toEqual(["c", "d"]);
    expect(fought.map((s) => s.id)).toEqual(["a", "b"]);
  });

  // Locked means "can no longer be answered", not "already played": the member still wants
  // tonight's battle in view.
  it("trận đã khoá nhưng chưa tới giờ đánh vẫn là sắp tới", () => {
    const sessions = [session("a", "2026-08-27T20:00:00.000Z", true)];

    const { upcoming, fought } = splitFoughtBattles(sessions, NOW);

    expect(upcoming.map((s) => s.id)).toEqual(["a"]);
    expect(fought).toEqual([]);
  });

  it("đúng giờ đánh thì tính là đã đánh", () => {
    const sessions = [
      session("a", NOW.toISOString()),
      session("b", "2026-08-27T20:00:00.000Z"),
    ];

    expect(splitFoughtBattles(sessions, NOW).fought.map((s) => s.id)).toEqual([
      "a",
    ]);
  });

  // Folding everything would leave the card empty after the week's last battle.
  it("tất cả đã đánh thì trả hết về sắp tới", () => {
    const sessions = [
      session("a", "2026-08-24T20:00:00.000Z"),
      session("b", "2026-08-25T20:00:00.000Z"),
    ];

    const { upcoming, fought } = splitFoughtBattles(sessions, NOW);

    expect(upcoming.map((s) => s.id)).toEqual(["a", "b"]);
    expect(fought).toEqual([]);
  });

  it("tuần rỗng thì cả hai nhóm rỗng", () => {
    expect(splitFoughtBattles([], NOW)).toEqual({ upcoming: [], fought: [] });
  });
});
