import { describe, expect, it } from "vitest";

import {
  SLOTS_PER_TEAM,
  SUGGESTED_CLASS_TEMPLATE,
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

  // Read the expectation from the template rather than hard-coding numbers: the suggestion array is a
  // "display hint only", editing it is routine and must not turn the test red. What is worth asserting
  // is that the template is applied at the right offset and identically across all 10 teams.
  it("áp gợi ý lưu phái theo template, giống nhau ở mọi team", () => {
    const formation = createMockFormation();

    for (const slot of formation.slots) {
      expect(slot.suggestedClass).toBe(
        SUGGESTED_CLASS_TEMPLATE[slot.position - 1]
      );
    }
  });

  it("vị trí nào template để trống thì slot không mang suggestedClass", () => {
    const formation = createMockFormation();
    const freePositions = SUGGESTED_CLASS_TEMPLATE.filter(
      (suggested) => suggested === undefined
    ).length;

    const free = formation.slots.filter(
      (slot) => !("suggestedClass" in slot)
    );

    expect(free).toHaveLength(TEAM_COUNT * freePositions);
  });

  it("id của slot mang đúng toạ độ team/vị trí của nó", () => {
    const formation = createMockFormation();
    expect(formation.slots[0].id).toBe("team-1-pos-1");
    expect(formation.slots.at(-1)?.id).toBe(
      `team-${TEAM_COUNT}-pos-${SLOTS_PER_TEAM}`
    );
  });
});
