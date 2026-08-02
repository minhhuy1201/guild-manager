import { describe, expect, it } from "vitest";
import { GuildClass } from "@shared/enums";

import type { Slot } from "../../types/formation";
import { invalidPlacementReason, isValidPlacement } from "../validation";

const constrainedSlot: Slot = {
  id: "team-1-pos-1",
  team: 1,
  position: 1,
  allowedClasses: [GuildClass.THIET_Y, GuildClass.TO_VAN],
};

const freeSlot: Slot = { id: "team-1-pos-5", team: 1, position: 5 };

describe("isValidPlacement", () => {
  it("chấp nhận lưu phái nằm trong danh sách cho phép", () => {
    expect(isValidPlacement(constrainedSlot, GuildClass.THIET_Y)).toBe(true);
  });

  it("từ chối lưu phái ngoài danh sách cho phép", () => {
    expect(isValidPlacement(constrainedSlot, GuildClass.LONG_NGAM)).toBe(false);
  });

  it("ô không ràng buộc thì nhận mọi lưu phái", () => {
    expect(isValidPlacement(freeSlot, GuildClass.LONG_NGAM)).toBe(true);
  });

  it("mảng ràng buộc rỗng cũng coi là không ràng buộc", () => {
    const slot: Slot = { ...freeSlot, allowedClasses: [] };
    expect(isValidPlacement(slot, GuildClass.LONG_NGAM)).toBe(true);
  });
});

describe("invalidPlacementReason", () => {
  it("liệt kê tên tiếng Việt của các lưu phái được phép", () => {
    expect(invalidPlacementReason(constrainedSlot)).toBe("Ô này dành cho Thiết Y, Tố Vấn");
  });

  it("trả chuỗi rỗng cho ô không ràng buộc", () => {
    expect(invalidPlacementReason(freeSlot)).toBe("");
  });
});
