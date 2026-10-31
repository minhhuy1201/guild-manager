import { describe, expect, it } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { ClassOutlookRow } from "@guild/shared/lib";

import { biggestGainer, formatDelta, sortByAfter } from "../lib/sort-by-after";

/**
 * A row with only the fields these helpers read.
 * @param guildClass - The class
 * @param after - Head-count after
 * @param delta - Change
 * @returns The row
 */
function row(guildClass: GuildClass, after: number, delta: number): ClassOutlookRow {
  return { guildClass, before: after - delta, afterSure: after, afterConsidering: 0, after, delta };
}

describe("sortByAfter", () => {
  it("biggest first, ties keep display order", () => {
    const rows = [
      row(GuildClass.CUU_LINH, 3, 0),
      row(GuildClass.HUYEN_CO, 5, 0),
      row(GuildClass.HUYET_HA, 3, 0),
    ];

    expect(sortByAfter(rows).map((r) => r.guildClass)).toEqual([
      GuildClass.HUYEN_CO,
      GuildClass.CUU_LINH,
      GuildClass.HUYET_HA,
    ]);
  });
});

describe("biggestGainer", () => {
  it("is the largest positive change", () => {
    const rows = [row(GuildClass.CUU_LINH, 3, 1), row(GuildClass.TO_VAN, 4, 3)];

    expect(biggestGainer(rows)?.guildClass).toBe(GuildClass.TO_VAN);
  });

  it("is null when nobody grows", () => {
    expect(biggestGainer([row(GuildClass.CUU_LINH, 3, 0), row(GuildClass.TO_VAN, 1, -2)])).toBeNull();
  });
});

describe("formatDelta", () => {
  it.each([[2, "+2"], [-3, "-3"], [0, "0"]])("%i -> %s", (n, text) => {
    expect(formatDelta(n)).toBe(text);
  });
});
