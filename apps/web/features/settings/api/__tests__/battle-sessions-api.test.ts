import { afterEach, describe, expect, it, vi } from "vitest";

import { mockFetch, requestOf } from "@/lib/__tests__/mock-fetch";

vi.mock("@/features/auth/server", () => ({
  authHeader: () => Promise.resolve({ Authorization: "Bearer access-token-gia" }),
}));

const {
  createBattleSession,
  deleteBattleSession,
  fetchSettingsWeeks,
  fetchWeekSessions,
  reopenAttendance,
  updateBattleSession,
} = await import("../battle-sessions-api");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("battle sessions API", () => {
  it("lists the schedulable weeks with the session's token", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [] } });

    await expect(fetchSettingsWeeks()).resolves.toEqual({ ok: true, data: [] });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/battle-sessions/weeks");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer access-token-gia"
    );
  });

  it("reads the open week when no weekStart is given", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [] } });

    await fetchWeekSessions();

    expect(requestOf(fetchMock).url).not.toContain("weekStart");
  });

  it("sends the escaped weekStart for a chosen week", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [] } });

    await fetchWeekSessions("2026-07-20");

    expect(requestOf(fetchMock).url).toContain("?weekStart=2026-07-20");
  });

  it("posts the input when creating", async () => {
    const fetchMock = mockFetch({ status: 201, body: { data: { id: "s1" } } });
    const input = { name: "Thứ 7" };

    await createBattleSession(input as never);

    const { init } = requestOf(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(input);
  });

  it("escapes the id when updating", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: { id: "a b" } } });

    await updateBattleSession("a b", { name: "Mới" } as never);

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/battle-sessions/a%20b");
    expect(init.method).toBe("PATCH");
  });

  it("reopens attendance through its own endpoint", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: { id: "s1" } } });

    await reopenAttendance("s1");

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/battle-sessions/s1/reopen-attendance");
    expect(init.method).toBe("POST");
  });

  it("deletes by escaped id", async () => {
    const fetchMock = mockFetch({ status: 204, body: undefined });

    await expect(deleteBattleSession("a b")).resolves.toEqual({
      ok: true,
      data: undefined,
    });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/battle-sessions/a%20b");
    expect(init.method).toBe("DELETE");
  });

  it("returns the backend's rejection as a value", async () => {
    mockFetch({ status: 409, body: { message: "Trùng giờ" } });

    await expect(createBattleSession({} as never)).resolves.toEqual({
      ok: false,
      message: "Trùng giờ",
      statusCode: 409,
    });
  });
});
