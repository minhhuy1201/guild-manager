import { describe, expect, it } from "vitest";
import { Capability, GuildRole } from "@guild/shared/enums";
import type { Actor } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";

import { navItemsFor } from "../nav-items";

/**
 * The routes of the entries a viewer is shown.
 * @param role - Role of the viewer
 * @returns The hrefs, in display order
 */
function hrefsFor(role: GuildRole): string[] {
  return navItemsFor({ role }).map((item) => item.href);
}

/**
 * The routes shown to a Manager holding the given Capabilities.
 * @param capabilities - Grants of the Manager
 * @returns The hrefs, in display order
 */
function hrefsForManager(...capabilities: Capability[]): string[] {
  const actor: Actor = { role: GuildRole.MANAGER, capabilities };

  return navItemsFor(actor).map((item) => item.href);
}

describe("navItemsFor", () => {
  it("bang chúng chỉ thấy các mục mở cho mọi người", () => {
    expect(hrefsFor(GuildRole.MEMBER)).toEqual([
      ROUTES.attendance,
      ROUTES.attendanceHistory,
      ROUTES.tactics,
    ]);
  });

  it("quản trị viên thấy mọi mục", () => {
    expect(hrefsFor(GuildRole.ADMIN)).toEqual([
      ROUTES.attendance,
      ROUTES.attendanceHistory,
      ROUTES.teamBuilder,
      ROUTES.tactics,
      ROUTES.settings,
    ]);
  });
});

describe("navItemsFor - Manager", () => {
  const OPEN = [ROUTES.attendance, ROUTES.attendanceHistory, ROUTES.tactics];

  it("chưa có Grant nào thì thấy y hệt Member", () => {
    expect(hrefsForManager()).toEqual(hrefsFor(GuildRole.MEMBER));
  });

  it("mỗi mục chỉ hiện với Capability tương ứng", () => {
    expect(hrefsForManager(Capability.TEAM_BUILDER)).toEqual([
      ROUTES.attendance,
      ROUTES.attendanceHistory,
      ROUTES.teamBuilder,
      ROUTES.tactics,
    ]);
    expect(hrefsForManager(Capability.SCHEDULE)).toEqual([
      ...OPEN,
      ROUTES.settings,
    ]);
  });

  it.each([Capability.SCHEDULE, Capability.MEMBERS, Capability.ATTENDANCE])(
    "%s một mình đủ để hiện Thiết lập",
    (capability) => {
      expect(hrefsForManager(capability)).toContain(ROUTES.settings);
    }
  );

  it.each([Capability.CAT_RACE, Capability.TACTICS])(
    "%s không có mục nav riêng và không mở Thiết lập",
    (capability) => {
      expect(hrefsForManager(capability)).toEqual(OPEN);
    }
  );

  it("được cấp hết thì thấy như Admin", () => {
    expect(hrefsForManager(...Object.values(Capability))).toEqual(
      hrefsFor(GuildRole.ADMIN)
    );
  });
});
