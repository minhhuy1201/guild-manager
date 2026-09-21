import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TACTIC_SCHEMA_VERSION,
  type TacticScene,
} from "@guild/shared/schemas";

import { tacticKeys } from "../tactics-keys";

/**
 * `tactics-api.ts` is a `"use server"` file reading the session cookie through `@/features/auth`,
 * which pulls in `server-only` and cannot load under test. Mocking just `authHeader` also lets each
 * assertion check that the request carries a Bearer token.
 */
vi.mock("@/features/auth/server", () => ({
  authHeader: () =>
    Promise.resolve({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
}));

const {
  createTactic,
  createTokenPreset,
  deleteTactic,
  deleteTokenPreset,
  fetchTactic,
  fetchTactics,
  fetchTokenPresets,
  saveTacticStages,
  updateTactic,
} = await import("../tactics-api");

/** The fake access token the `@/features/auth/server` mock returns. */
const ACCESS_TOKEN = "access-token-gia";

const SCENE: TacticScene = {
  schemaVersion: TACTIC_SCHEMA_VERSION,
  stages: [{ id: "s1", name: "Giai đoạn 1", elements: [] }],
};

/**
 * Build a fake fetch answering with one response.
 * @param options - status and JSON body the server "returns"
 * @returns The mock replacing global fetch
 */
function mockFetch(options: { status: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: options.status >= 200 && options.status < 300,
    status: options.status,
    json: () => Promise.resolve(options.body),
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

/**
 * The URL and options one request was made with.
 * @param fetchMock - The fetch mock the call went through
 * @returns The path and the options
 */
function requestOf(fetchMock: ReturnType<typeof mockFetch>): {
  url: string;
  init: RequestInit;
} {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

  return { url, init };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tactics query keys", () => {
  it("nests every key under one root, so one write can invalidate the domain", () => {
    expect(tacticKeys.list()[0]).toBe(tacticKeys.all[0]);
    expect(tacticKeys.detail("t1")).toEqual(["tactics", "detail", "t1"]);
    expect(tacticKeys.tokenPresets()).toEqual(["tactics", "token-presets"]);
  });
});

describe("tactics API", () => {
  it("lists tactics with the session's token", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [] } });

    await expect(fetchTactics()).resolves.toEqual([]);

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/tactics");
    expect(
      (init.headers as Record<string, string>).Authorization
    ).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it("escapes the id when reading one tactic", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: { id: "a b" } } });

    await fetchTactic("a b");

    expect(requestOf(fetchMock).url).toContain("/tactics/a%20b");
  });

  it("sends the name and description when creating", async () => {
    const fetchMock = mockFetch({ status: 201, body: { data: { id: "t1" } } });

    await createTactic({ name: "Thủ cổng tây", description: "3 phút đầu" });

    const { init } = requestOf(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Thủ cổng tây",
      description: "3 phút đầu",
    });
  });

  it("keeps the id off the body when renaming", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: { id: "t1" } } });

    await updateTactic({ id: "t1", name: "Mở màn", description: null });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/tactics/t1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Mở màn",
      description: null,
    });
  });

  it("sends the whole scene under `scene` when saving", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: { id: "t1" } } });

    await saveTacticStages({ id: "t1", scene: SCENE });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/tactics/t1/stages");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ scene: SCENE });
  });

  it("deletes a tactic and expects no body back", async () => {
    const fetchMock = mockFetch({ status: 204, body: null });

    await expect(deleteTactic("t1")).resolves.toBeUndefined();
    expect(requestOf(fetchMock).init.method).toBe("DELETE");
  });

  it("reads and writes the token presets", async () => {
    const listMock = mockFetch({ status: 200, body: { data: [] } });
    await expect(fetchTokenPresets()).resolves.toEqual([]);
    expect(requestOf(listMock).url).toContain("/tactics/token-presets");

    vi.unstubAllGlobals();
    const createMock = mockFetch({ status: 201, body: { data: { id: "p1" } } });
    await createTokenPreset({ label: "Đội cảm tử", icon: "skull" });
    expect(JSON.parse(String(requestOf(createMock).init.body))).toEqual({
      label: "Đội cảm tử",
      icon: "skull",
    });

    vi.unstubAllGlobals();
    const deleteMock = mockFetch({ status: 204, body: null });
    await deleteTokenPreset("p 1");
    expect(requestOf(deleteMock).url).toContain("/tactics/token-presets/p%201");
    expect(requestOf(deleteMock).init.method).toBe("DELETE");
  });

  it("throws the backend's Vietnamese message on a failure", async () => {
    mockFetch({
      status: 400,
      body: { message: "Một chiến thuật tối đa 20 giai đoạn." },
    });

    await expect(saveTacticStages({ id: "t1", scene: SCENE })).rejects.toThrow(
      "Một chiến thuật tối đa 20 giai đoạn."
    );
  });
});
