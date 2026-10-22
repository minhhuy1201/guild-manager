import { GuildClass } from "@guild/shared/enums";
import { describe, expect, it } from "vitest";

import { LEG_FRAME_COUNT, SPRITE_COLUMNS, SPRITE_ROWS, spriteRows, type LegFrame } from "../sprite-rows";

const CLASSES = Object.values(GuildClass);
const FRAMES = Array.from({ length: LEG_FRAME_COUNT }, (_, frame) => frame as LegFrame);

describe("spriteRows", () => {
  it.each(CLASSES)("is a full rectangle for %s in every frame", (guildClass) => {
    for (const frame of FRAMES) {
      const rows = spriteRows(guildClass, frame);

      expect(rows).toHaveLength(SPRITE_ROWS);
      for (const row of rows) expect(row).toHaveLength(SPRITE_COLUMNS);
    }
  });

  it("gives every class its own accessory above the head", () => {
    const accessories = CLASSES.map((guildClass) => spriteRows(guildClass, 0).slice(0, 2).join("|"));

    expect(new Set(accessories).size).toBe(CLASSES.length);
  });

  it("copies the prototype's accessory of a class", () => {
    expect(spriteRows(GuildClass.THIET_Y, 0).slice(0, 2)).toEqual(["..........ss..", ".........ssss."]);
  });

  it("paints three darker stripes on the body", () => {
    const stripes = spriteRows(GuildClass.TO_VAN, 0).join("").split("d").length - 1;

    expect(stripes).toBe(3);
  });

  it("moves the legs between the four frames, passing through the same middle pose twice", () => {
    const legs = (frame: LegFrame) => spriteRows(GuildClass.TO_VAN, frame).slice(-2).join("|");

    expect(legs(1)).toBe(legs(3));
    expect(new Set([legs(0), legs(1), legs(2)]).size).toBe(3);
  });
});
