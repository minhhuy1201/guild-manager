import { describe, expect, it } from "vitest";
import { GuildClass } from "@shared/enums";

import {
  SLOTS_PER_TEAM,
  TEAM_COUNT,
  buildSlotId,
  createMockFormation,
} from "../mock-formation";

describe("createMockFormation", () => {
  it("sinh đủ 10 team × 6 slot", () => {
    const formation = createMockFormation();
    expect(formation.slots).toHaveLength(TEAM_COUNT * SLOTS_PER_TEAM);
  });

  it("id của slot là duy nhất", () => {
    const ids = createMockFormation().slots.map((slot) => slot.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mỗi team có đúng 6 vị trí đánh số 1..6", () => {
    const formation = createMockFormation();
    for (let team = 1; team <= TEAM_COUNT; team += 1) {
      const positions = formation.slots
        .filter((slot) => slot.team === team)
        .map((slot) => slot.position)
        .sort((a, b) => a - b);
      expect(positions).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("áp cùng một ràng buộc lưu phái cho mọi team ở cùng vị trí", () => {
    const formation = createMockFormation();
    const firstPositions = formation.slots.filter((slot) => slot.position === 1);
    expect(firstPositions).toHaveLength(TEAM_COUNT);
    for (const slot of firstPositions) {
      expect(slot.allowedClasses).toEqual([GuildClass.THIET_Y]);
    }
  });

  it("để vị trí 5 và 6 tự do, không ràng buộc lưu phái", () => {
    const formation = createMockFormation();
    const free = formation.slots.filter((slot) => slot.position >= 5);
    for (const slot of free) {
      expect(slot.allowedClasses).toBeUndefined();
    }
  });

  it("buildSlotId khớp với id trong formation", () => {
    const formation = createMockFormation();
    expect(formation.slots[0].id).toBe(buildSlotId(1, 1));
    expect(formation.slots.at(-1)?.id).toBe(buildSlotId(TEAM_COUNT, SLOTS_PER_TEAM));
  });
});
