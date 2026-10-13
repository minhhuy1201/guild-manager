import { afterEach, describe, expect, it, vi } from "vitest";

import { catRaceKeys } from "../cat-race-keys";

/** `cat-race-api.ts` is `"use server"` and reads the session cookie; only the header is needed. */
vi.mock("@/features/auth/server", () => ({
  authHeader: () =>
    Promise.resolve({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
}));

const api = await import("../cat-race-api");
const { drawCatRaceRound, voidCatRaceRound } = api;

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

interface Route {
  name: string;
  call: () => Promise<unknown>;
  method: string | undefined;
  path: string;
  body: unknown;
}

const ROUTES: Route[] = [
  {
    name: "fetchCatRaces",
    call: () => api.fetchCatRaces(),
    method: undefined,
    path: "/cat-races",
    body: undefined,
  },
  {
    name: "fetchCatRacePrefill",
    call: () => api.fetchCatRacePrefill(),
    method: undefined,
    path: "/cat-races/prefill",
    body: undefined,
  },
  {
    name: "fetchCatRaceEvent",
    call: () => api.fetchCatRaceEvent("e 1"),
    method: undefined,
    path: "/cat-races/e%201",
    body: undefined,
  },
  {
    name: "createCatRace",
    call: () => api.createCatRace({ name: "n" } as never),
    method: "POST",
    path: "/cat-races",
    body: { name: "n" },
  },
  {
    name: "updateCatRace",
    call: () => api.updateCatRace({ id: "e1", name: "n" } as never),
    method: "PATCH",
    path: "/cat-races/e1",
    body: { name: "n" },
  },
  {
    name: "deleteCatRace",
    call: () => api.deleteCatRace("e1"),
    method: "DELETE",
    path: "/cat-races/e1",
    body: undefined,
  },
  {
    name: "setCatRaceParticipants",
    call: () =>
      api.setCatRaceParticipants({ id: "e1", participants: [] } as never),
    method: "PUT",
    path: "/cat-races/e1/participants",
    body: { participants: [] },
  },
  {
    name: "addCatRacePrize",
    call: () => api.addCatRacePrize({ id: "e1", name: "p" } as never),
    method: "POST",
    path: "/cat-races/e1/prizes",
    body: { name: "p" },
  },
  {
    name: "updateCatRacePrize",
    call: () =>
      api.updateCatRacePrize({ id: "e1", prizeId: "p 1", name: "p" } as never),
    method: "PATCH",
    path: "/cat-races/e1/prizes/p%201",
    body: { name: "p" },
  },
  {
    name: "deleteCatRacePrize",
    call: () => api.deleteCatRacePrize({ id: "e1", prizeId: "p1" }),
    method: "DELETE",
    path: "/cat-races/e1/prizes/p1",
    body: undefined,
  },
  {
    name: "setCatRaceEntrants",
    call: () =>
      api.setCatRaceEntrants({
        id: "e1",
        prizeId: "p1",
        characterIds: ["a"],
      } as never),
    method: "PUT",
    path: "/cat-races/e1/prizes/p1/entrants",
    body: { characterIds: ["a"] },
  },
  {
    name: "endCatRace",
    call: () => api.endCatRace("e1"),
    method: "POST",
    path: "/cat-races/e1/end",
    body: undefined,
  },
  {
    name: "announceCatRace",
    call: () => api.announceCatRace("e1"),
    method: "POST",
    path: "/cat-races/e1/announce",
    body: undefined,
  },
];

describe.each(ROUTES)("$name", ({ call, method, path, body }) => {
  it("hits the right route with the session token", async () => {
    const fetchMock = mockFetch({});

    await call();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // `endsWith` on the pathname: `toContain("/cat-races")` also matches `/cat-races/prefill`.
    expect(new URL(url).pathname.endsWith(path)).toBe(true);
    expect(init.method).toBe(method);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${ACCESS_TOKEN}`
    );
    expect(init.body === undefined ? undefined : JSON.parse(String(init.body))).toEqual(
      body
    );
  });
});
