import { afterEach, describe, expect, it, vi } from "vitest";

import { mockFetch, requestOf } from "@/lib/__tests__/mock-fetch";

import { loadFeaturedRaces } from "../featured-races-api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadFeaturedRaces", () => {
  it("reads the public endpoint with no token and no cache", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [{ id: "e1" }] } });

    await expect(loadFeaturedRaces()).resolves.toEqual([{ id: "e1" }]);

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/public/featured-races");
    expect(init.cache).toBe("no-store");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("logs and returns an empty list when the API answers with an error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch({ status: 500, body: { message: "Lỗi máy chủ." } });

    await expect(loadFeaturedRaces()).resolves.toEqual([]);
    expect(log).toHaveBeenCalledOnce();
  });

  it("logs and returns an empty list when the API is unreachable", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(loadFeaturedRaces()).resolves.toEqual([]);
    expect(log).toHaveBeenCalledOnce();
  });
});
