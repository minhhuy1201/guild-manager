import { describe, expect, it } from "vitest";

import { recordKey } from "../record-key";
import { countUnanswered } from "../unanswered";

const CHARACTER_ID = "char-1";

/**
 * Build a session with only the two fields the count reads.
 * @param id - Session id
 * @param isAttendanceClosed - Whether the API already locked it
 * @returns The session
 */
function session(id: string, isAttendanceClosed = false) {
  return { id, isAttendanceClosed };
}

/**
 * Record one answer of the character on a session.
 * @param sessionId - Session answered
 * @returns The record map keyed the way the app keys it
 */
function answered(sessionId: string) {
  return { [recordKey(CHARACTER_ID, sessionId)]: { isPresent: true } };
}

describe("countUnanswered", () => {
  it("đếm các trận còn hạn mà chưa trả lời", () => {
    const sessions = [session("a"), session("b"), session("c")];

    expect(countUnanswered(sessions, answered("b"), CHARACTER_ID)).toBe(2);
  });

  // Trận đã khoá thì không còn điểm danh được nữa, nhắc là vô ích.
  it("không tính trận đã khoá", () => {
    const sessions = [session("a", true), session("b")];

    expect(countUnanswered(sessions, {}, CHARACTER_ID)).toBe(1);
  });

  it("trả lời đủ thì là 0", () => {
    expect(countUnanswered([session("a")], answered("a"), CHARACTER_ID)).toBe(0);
  });

  it("chỉ đếm câu trả lời của đúng nhân vật này", () => {
    const records = { [recordKey("char-2", "a")]: { isPresent: false } };

    expect(countUnanswered([session("a")], records, CHARACTER_ID)).toBe(1);
  });
});
