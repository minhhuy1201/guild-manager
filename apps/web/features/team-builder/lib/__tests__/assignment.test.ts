import { describe, expect, it } from "vitest";

import type { Assignment } from "../../types/formation";
import {
  applyDrop,
  createEmptyAssignment,
  findSlotOf,
} from "../assignment";
import { SLOTS_PER_TEAM, TEAM_COUNT, createMockFormation } from "../mock-formation";

const SLOT_A = "team-1-pos-1";
const SLOT_B = "team-1-pos-2";
const SLOT_C = "team-2-pos-1";

/** Small assignment used by the drop tests: three slots, all empty. */
function emptyThreeSlots(): Assignment {
  return { [SLOT_A]: null, [SLOT_B]: null, [SLOT_C]: null };
}

describe("createEmptyAssignment", () => {
  it("sinh một khóa null cho mỗi slot của đội hình", () => {
    const assignment = createEmptyAssignment(createMockFormation().slots);
    expect(Object.keys(assignment)).toHaveLength(TEAM_COUNT * SLOTS_PER_TEAM);
    expect(Object.values(assignment).every((value) => value === null)).toBe(true);
  });
});

describe("findSlotOf", () => {
  it("trả về ô đang giữ nhân vật, hoặc null khi nhân vật ở pool", () => {
    const assignment = { ...emptyThreeSlots(), [SLOT_B]: "char-1" };
    expect(findSlotOf(assignment, "char-1")).toBe(SLOT_B);
    expect(findSlotOf(assignment, "char-2")).toBeNull();
  });
});

describe("applyDrop", () => {
  it("case 1 — pool → ô trống: đặt nhân vật vào ô", () => {
    const result = applyDrop(
      emptyThreeSlots(),
      { kind: "pool" },
      "char-1",
      { kind: "slot", slotId: SLOT_A }
    );
    expect(result[SLOT_A]).toBe("char-1");
  });

  it("case 2 — pool → ô có người: ghi đè, người cũ không còn ở ô nào", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-old" };

    const result = applyDrop(
      before,
      { kind: "pool" },
      "char-new",
      { kind: "slot", slotId: SLOT_A }
    );

    expect(result[SLOT_A]).toBe("char-new");
    expect(findSlotOf(result, "char-old")).toBeNull();
  });

  it("case 3 — ô → ô trống: ô nguồn thành null, ô đích nhận người", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-1" };

    const result = applyDrop(
      before,
      { kind: "slot", slotId: SLOT_A },
      "char-1",
      { kind: "slot", slotId: SLOT_B }
    );

    expect(result[SLOT_A]).toBeNull();
    expect(result[SLOT_B]).toBe("char-1");
  });

  it("case 4 — ô → ô có người: hai người đổi chỗ, không ai bị mất", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-1", [SLOT_B]: "char-2" };

    const result = applyDrop(
      before,
      { kind: "slot", slotId: SLOT_A },
      "char-1",
      { kind: "slot", slotId: SLOT_B }
    );

    expect(result[SLOT_A]).toBe("char-2");
    expect(result[SLOT_B]).toBe("char-1");
  });

  it("case 5 — ô → pool: ô nguồn thành null", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-1" };

    const result = applyDrop(
      before,
      { kind: "slot", slotId: SLOT_A },
      "char-1",
      { kind: "pool" }
    );

    expect(result[SLOT_A]).toBeNull();
  });

  it("case 6 — thả ngoài mọi vùng: trả về đúng object cũ, không tạo reference mới", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-1" };

    const result = applyDrop(before, { kind: "slot", slotId: SLOT_A }, "char-1", null);

    expect(result).toBe(before);
  });

  it("bảo vệ — kéo từ pool một người đang đứng ở ô khác: không nhân bản", () => {
    const before = { ...emptyThreeSlots(), [SLOT_C]: "char-1" };

    const result = applyDrop(
      before,
      { kind: "pool" },
      "char-1",
      { kind: "slot", slotId: SLOT_A }
    );

    expect(result[SLOT_A]).toBe("char-1");
    expect(result[SLOT_C]).toBeNull();
    expect(Object.values(result).filter((id) => id === "char-1")).toHaveLength(1);
  });

  it("bảo vệ — thả vào chính ô đang đứng: không thay đổi gì", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-1" };

    const result = applyDrop(
      before,
      { kind: "slot", slotId: SLOT_A },
      "char-1",
      { kind: "slot", slotId: SLOT_A }
    );

    expect(result).toBe(before);
  });

  it("bảo vệ — kéo từ pool rồi thả lại vào pool: không thay đổi gì", () => {
    const before = emptyThreeSlots();

    const result = applyDrop(before, { kind: "pool" }, "char-1", { kind: "pool" });

    expect(result).toBe(before);
  });

  it("không sửa assignment truyền vào (immutable)", () => {
    const before = emptyThreeSlots();

    applyDrop(before, { kind: "pool" }, "char-1", { kind: "slot", slotId: SLOT_A });

    expect(before[SLOT_A]).toBeNull();
  });
});
