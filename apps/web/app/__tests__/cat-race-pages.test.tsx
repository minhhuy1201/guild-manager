import { describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";

vi.mock("server-only", () => ({}));

const getActor = vi.fn();

vi.mock("@/features/auth/server", () => ({
  getActor: () => getActor(),
}));

/** Stand-in for `next/navigation`'s `redirect`, which throws to unwind the render. */
class Redirected extends Error {
  constructor(readonly target: string) {
    super(`redirect: ${target}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    throw new Redirected(target);
  },
}));

vi.mock("@/features/cat-race", () => ({
  CatRaceListScreen: () => null,
  CatRaceEventScreen: (props: { id: string }) => props,
}));

const CatRacePage = (await import("../dua-meo/page")).default;
const CatRaceEventPage = (await import("../dua-meo/[id]/page")).default;

const ADMIN_ONLY_TARGET = expect.stringContaining(`${ROUTES.attendance}?error=`);

/**
 * Run a page and report where it sent the visitor, or the element it rendered.
 * @param render - The page render to run
 * @returns The redirect target, or the rendered element
 */
async function outcomeOf(
  render: () => Promise<unknown>
): Promise<{ target: string | null; element: unknown }> {
  try {
    return { target: null, element: await render() };
  } catch (error) {
    if (error instanceof Redirected) return { target: error.target, element: null };
    throw error;
  }
}

describe("Trang danh sách đua mèo", () => {
  it("chưa đăng nhập thì bị đẩy ra", async () => {
    getActor.mockResolvedValue(null);

    expect((await outcomeOf(() => CatRacePage())).target).toEqual(ADMIN_ONLY_TARGET);
  });

  it("member bị đẩy ra", async () => {
    getActor.mockResolvedValue({ discordId: "1", role: "MEMBER" });

    expect((await outcomeOf(() => CatRacePage())).target).toEqual(ADMIN_ONLY_TARGET);
  });

  it("Manager có Capability đua mèo vào được", async () => {
    getActor.mockResolvedValue({
      discordId: "1",
      role: "MANAGER",
      capabilities: ["CAT_RACE"],
    });

    expect((await outcomeOf(() => CatRacePage())).target).toBeNull();
  });

  it.each([
    ["chưa có Grant nào", undefined],
    ["chỉ có Capability khác", ["TEAM_BUILDER", "TACTICS"]],
  ])("Manager %s bị đẩy ra", async (_name, capabilities) => {
    getActor.mockResolvedValue({ discordId: "1", role: "MANAGER", capabilities });

    expect((await outcomeOf(() => CatRacePage())).target).toEqual(ADMIN_ONLY_TARGET);
  });

  it("admin vào được", async () => {
    getActor.mockResolvedValue({ discordId: "1", role: "ADMIN" });

    const { target, element } = await outcomeOf(() => CatRacePage());

    expect(target).toBeNull();
    expect(element).toBeTruthy();
  });
});

describe("Trang một đợt đua mèo", () => {
  const params = Promise.resolve({ id: "e1" });

  it("chưa đăng nhập thì bị đẩy ra", async () => {
    getActor.mockResolvedValue(null);

    expect((await outcomeOf(() => CatRaceEventPage({ params }))).target).toEqual(
      ADMIN_ONLY_TARGET
    );
  });

  it("member bị đẩy ra", async () => {
    getActor.mockResolvedValue({ discordId: "1", role: "MEMBER" });

    expect((await outcomeOf(() => CatRaceEventPage({ params }))).target).toEqual(
      ADMIN_ONLY_TARGET
    );
  });

  it("Manager có Capability đua mèo thấy đợt, Manager thiếu thì bị đẩy ra", async () => {
    getActor.mockResolvedValue({
      discordId: "1",
      role: "MANAGER",
      capabilities: ["CAT_RACE"],
    });
    expect((await outcomeOf(() => CatRaceEventPage({ params }))).target).toBeNull();

    getActor.mockResolvedValue({ discordId: "1", role: "MANAGER" });
    expect((await outcomeOf(() => CatRaceEventPage({ params }))).target).toEqual(
      ADMIN_ONLY_TARGET
    );
  });

  it("admin thấy đợt theo id trên đường dẫn", async () => {
    getActor.mockResolvedValue({ discordId: "1", role: "ADMIN" });

    const { element } = await outcomeOf(() => CatRaceEventPage({ params }));

    expect((element as { props: { id: string } }).props.id).toBe("e1");
  });
});
