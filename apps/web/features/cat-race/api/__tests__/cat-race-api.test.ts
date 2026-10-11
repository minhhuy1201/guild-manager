import { afterEach, describe, expect, it, vi } from "vitest";

import { catRaceKeys } from "../cat-race-keys";

/** `cat-race-api.ts` is `"use server"` and reads the session cookie; only the header is needed. */
vi.mock("@/features/auth/server", () => ({
  authHeader: () =>
    Promise.resolve({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
}));

const { drawCatRaceRound, voidCatRaceRound } = await import("../cat-race-api");

const ACCESS_TOKEN = "access-token-gia";

/**
 * A fake fetch answering with one JSON response.
 * @param body - The `data` the server returns
 * @returns The mock replacing global fetch
 */
function mockFetch(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: body }),
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cat race query keys", () => {
  it("nests every key under one root", () => {
    expect(catRaceKeys.list()[0]).toBe(catRaceKeys.all[0]);
    expect(catRaceKeys.detail("e1")).toEqual(["cat-race", "detail", "e1"]);
  });
});

describe("cat race API", () => {
  it("draws a round with the session's token and only the prize id in the body", async () => {
    const fetchMock = mockFetch({ winningTicket: 1 });

    await drawCatRaceRound({ id: "e 1", prizeId: "p1" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/cat-races/e%201/rounds");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${ACCESS_TOKEN}`
    );
    expect(JSON.parse(String(init.body))).toEqual({ prizeId: "p1" });
  });

  it("keeps the ids off the body when voiding a round", async () => {
    const fetchMock = mockFetch({});

    await voidCatRaceRound({ id: "e1", roundId: "r1", reason: "nhầm" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/cat-races/e1/rounds/r1/void");
    expect(JSON.parse(String(init.body))).toEqual({ reason: "nhầm" });
  });
});
