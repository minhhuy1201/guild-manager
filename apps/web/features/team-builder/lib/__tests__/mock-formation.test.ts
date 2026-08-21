import { describe, expect, it } from "vitest";
import { GuildClass } from "@guild/shared/enums";

import {
  SLOTS_PER_TEAM,
  TEAM_COUNT,
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

  it("gợi ý Tố Vấn ở vị trí 2 và 3 của mọi team", () => {
    const formation = createMockFormation();
    const suggested = formation.slots.filter(
      (slot) => slot.position === 2 || slot.position === 3
    );
    expect(suggested).toHaveLength(TEAM_COUNT * 2);
    for (const slot of suggested) {
      expect(slot.suggestedClass).toBe(GuildClass.TO_VAN);
    }
  });

  it("bốn vị trí còn lại không gợi ý lưu phái nào", () => {
    const formation = createMockFormation();
    const free = formation.slots.filter(
      (slot) => slot.position !== 2 && slot.position !== 3
    );
    expect(free).toHaveLength(TEAM_COUNT * 4);
    for (const slot of free) {
      expect(slot.suggestedClass).toBeUndefined();
    }
  });

  it("id của slot mang đúng toạ độ team/vị trí của nó", () => {
    const formation = createMockFormation();
    expect(formation.slots[0].id).toBe("team-1-pos-1");
    expect(formation.slots.at(-1)?.id).toBe(
      `team-${TEAM_COUNT}-pos-${SLOTS_PER_TEAM}`
    );
  });
});
