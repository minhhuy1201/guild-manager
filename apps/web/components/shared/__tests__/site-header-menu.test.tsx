// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Capability, GuildRole } from "@guild/shared/enums";

vi.mock("server-only", () => ({}));

const getSession = vi.fn();
const fetchMe = vi.fn();

vi.mock("@/features/auth/api/session", () => ({
  getSession: () => getSession(),
}));
vi.mock("@/features/auth/api/me", () => ({ fetchMe: () => fetchMe() }));
// The menu itself is tested on its own; here only what the header hands it matters.
vi.mock("@/features/auth", () => ({
  UserMenu: (props: { canRaceCats: boolean }) => (
    <div data-testid="user-menu" data-race={String(props.canRaceCats)} />
  ),
}));
vi.mock("@/components/shared/main-nav", () => ({ MainNav: () => null }));
vi.mock("@/components/shared/mobile-tab-bar", () => ({
  MobileTabBar: () => null,
}));

import { SiteHeader } from "../site-header";

afterEach(cleanup);

/**
 * Render the header for a signed-in user.
 * @param role - Role in the token
 * @param capabilities - Capabilities `/auth/me` returns
 * @returns Whether the account menu was told to offer the cat race entry
 */
async function offersCatRace(
  role: GuildRole,
  capabilities: Capability[] = []
): Promise<string | undefined> {
  getSession.mockResolvedValue({ discordId: "1", role });
  fetchMe.mockResolvedValue({
    ok: true,
    data: { role, capabilities, grantedCommands: [], character: null },
  });
  render(await SiteHeader());

  return screen.getByTestId("user-menu").dataset.race;
}

describe("SiteHeader - mục Đua mèo trong menu tài khoản", () => {
  it("Manager có Capability Đua mèo thấy mục này", async () => {
    expect(await offersCatRace(GuildRole.MANAGER, [Capability.CAT_RACE])).toBe(
      "true"
    );
  });

  it("Manager chưa có Capability Đua mèo, và Member, không thấy", async () => {
    expect(await offersCatRace(GuildRole.MANAGER, [Capability.TACTICS])).toBe(
      "false"
    );
    cleanup();
    expect(await offersCatRace(GuildRole.MEMBER)).toBe("false");
  });

  it("Admin luôn thấy", async () => {
    expect(await offersCatRace(GuildRole.ADMIN)).toBe("true");
  });

  it("token Admin cũ mà /auth/me báo giờ là Member thì không thấy mục này", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: GuildRole.ADMIN });
    fetchMe.mockResolvedValue({
      ok: true,
      data: {
        role: GuildRole.MEMBER,
        capabilities: [],
        grantedCommands: [],
        character: null,
      },
    });
    render(await SiteHeader());

    expect(screen.getByTestId("user-menu").dataset.race).toBe("false");
  });
});
