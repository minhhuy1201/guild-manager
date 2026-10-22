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

vi.mock("@/features/team-builder", () => ({ TeamBuilderScreen: () => null }));
vi.mock("@/features/settings", () => ({
  SettingsTabs: (props: { actor: unknown }) => props,
}));

const TeamBuilderPage = (await import("../xep-team/page")).default;
const SettingsPage = (await import("../thiet-lap/page")).default;

const TURNED_AWAY = expect.stringContaining(`${ROUTES.attendance}?error=`);

/**
 * Run a page and report where it sent the visitor.
 * @param render - The page render to run
 * @returns The redirect target, null when the page rendered
 */
async function targetOf(
  render: () => Promise<unknown>
): Promise<string | null> {
  try {
    await render();
    return null;
  } catch (error) {
    if (error instanceof Redirected) return error.target;
    throw error;
  }
}

/**
 * Sign in as a Manager holding the given Capabilities.
 * @param capabilities - Grants the page sees
 */
function managerWith(...capabilities: string[]) {
  getActor.mockResolvedValue({ discordId: "1", role: "MANAGER", capabilities });
}

describe("Trang xếp team", () => {
  it("Manager có Capability xếp team vào được", async () => {
    managerWith("TEAM_BUILDER");

    expect(await targetOf(() => TeamBuilderPage())).toBeNull();
  });

  it.each([[[]], [["SCHEDULE", "CAT_RACE"]]])(
    "Manager có %j bị đẩy về trang điểm danh",
    async (capabilities) => {
      managerWith(...capabilities);

      expect(await targetOf(() => TeamBuilderPage())).toEqual(TURNED_AWAY);
    }
  );

  it("member và khách bị đẩy ra, admin vào được", async () => {
    getActor.mockResolvedValue({ discordId: "1", role: "MEMBER" });
    expect(await targetOf(() => TeamBuilderPage())).toEqual(TURNED_AWAY);

    getActor.mockResolvedValue(null);
    expect(await targetOf(() => TeamBuilderPage())).toEqual(TURNED_AWAY);

    getActor.mockResolvedValue({ discordId: "1", role: "ADMIN" });
    expect(await targetOf(() => TeamBuilderPage())).toBeNull();
  });
});

describe("Trang thiết lập", () => {
  it.each(["SCHEDULE", "MEMBERS", "ATTENDANCE"])(
    "Manager chỉ có %s đã vào được",
    async (capability) => {
      managerWith(capability);

      expect(await targetOf(() => SettingsPage())).toBeNull();
    }
  );

  it.each([[[]], [["TEAM_BUILDER", "CAT_RACE", "TACTICS"]]])(
    "Manager có %j không vào được",
    async (capabilities) => {
      managerWith(...capabilities);

      expect(await targetOf(() => SettingsPage())).toEqual(TURNED_AWAY);
    }
  );

  it("chuyển Grant của người xem xuống các tab", async () => {
    managerWith("MEMBERS");

    const element = (await SettingsPage()) as { props: { actor: unknown } };

    expect(element.props.actor).toMatchObject({ capabilities: ["MEMBERS"] });
  });

  it("member bị đẩy ra, admin vào được", async () => {
    getActor.mockResolvedValue({ discordId: "1", role: "MEMBER" });
    expect(await targetOf(() => SettingsPage())).toEqual(TURNED_AWAY);

    getActor.mockResolvedValue({ discordId: "1", role: "ADMIN" });
    expect(await targetOf(() => SettingsPage())).toBeNull();
  });
});
