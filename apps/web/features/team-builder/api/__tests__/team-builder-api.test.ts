import { afterEach, describe, expect, it, vi } from "vitest";

import { mockFetch, requestOf } from "@/lib/__tests__/mock-fetch";

vi.mock("@/features/auth/server", () => ({
  authHeader: () => Promise.resolve({ Authorization: "Bearer access-token-gia" }),
}));

const {
  announceFormation,
  fetchFormationWeeks,
  fetchFormations,
  fetchTeamNames,
  notifyTeamMembers,
  saveFormation,
  saveTeamNames,
} = await import("../team-builder-api");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("team builder API", () => {
  it("lists formation weeks with the session's token", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [] } });

    await expect(fetchFormationWeeks()).resolves.toEqual({ ok: true, data: [] });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/team-builder/weeks");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer access-token-gia"
    );
  });

  it("reads the open week's formations when no weekStart is given", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [] } });

    await fetchFormations();

    expect(requestOf(fetchMock).url).not.toContain("weekStart");
  });

  it("sends weekStart for a chosen week", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [] } });

    await fetchFormations("2026-07-20");

    expect(requestOf(fetchMock).url).toContain("?weekStart=2026-07-20");
  });

  it("puts the matches and version under the escaped session id", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: { sessionId: "a b" } } });

    await saveFormation({ sessionId: "a b", matches: [], version: 3 });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/team-builder/formations/a%20b");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ matches: [], version: 3 });
  });

  it("returns a version conflict as a value", async () => {
    mockFetch({ status: 412, body: { message: "Đội hình đã đổi" } });

    await expect(
      saveFormation({ sessionId: "s1", matches: [], version: 1 })
    ).resolves.toEqual({ ok: false, message: "Đội hình đã đổi", statusCode: 412 });
  });

  it("reads the team names", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: {} } });

    await fetchTeamNames();

    expect(requestOf(fetchMock).url).toContain("/team-builder/team-names");
  });

  it("puts the team names", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: {} } });
    const input = { names: [] };

    await saveTeamNames(input as never);

    const { init } = requestOf(fetchMock);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual(input);
  });

  it("posts only the images when announcing", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: {} } });

    await announceFormation({ sessionId: "a b", images: ["data:image/png;base64,x"] });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/team-builder/formations/a%20b/announce");
    expect(JSON.parse(String(init.body))).toEqual({
      images: ["data:image/png;base64,x"],
    });
  });

  it("posts only the notices when notifying members", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: {} } });

    await notifyTeamMembers({ sessionId: "a b", notices: [] });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/team-builder/formations/a%20b/notify-members");
    expect(JSON.parse(String(init.body))).toEqual({ notices: [] });
  });

  it("posts the team images next to the notices when notifying members", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: {} } });
    const teamImages = [{ matchIndex: 1, team: 3, image: "data:image/webp;base64,AQID" }];

    await notifyTeamMembers({ sessionId: "s1", teamImages });

    expect(JSON.parse(String(requestOf(fetchMock).init.body))).toEqual({ teamImages });
  });
});
