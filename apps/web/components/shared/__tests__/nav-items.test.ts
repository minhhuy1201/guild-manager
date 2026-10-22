import { describe, expect, it } from "vitest";
import { GuildRole } from "@guild/shared/enums";

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
