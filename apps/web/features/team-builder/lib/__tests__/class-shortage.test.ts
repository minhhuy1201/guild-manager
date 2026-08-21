import { describe, expect, it } from "vitest";
import { GuildClass } from "@guild/shared/enums";

import type { PoolCandidate } from "../pool";
import { countByGuildClass } from "../class-shortage";

const POOL: PoolCandidate[] = [
  { id: "a", name: "A", guildClass: GuildClass.TO_VAN },
  { id: "b", name: "B", guildClass: GuildClass.TO_VAN },
  { id: "c", name: "C", guildClass: GuildClass.THIET_Y },
];

describe("countByGuildClass", () => {
  it("đếm đúng số người còn lại của từng lưu phái", () => {
    const counts = countByGuildClass(POOL);

    expect(counts).toContainEqual({
      guildClass: GuildClass.TO_VAN,
      count: 2,
    });
    expect(counts).toContainEqual({
      guildClass: GuildClass.THIET_Y,
      count: 1,
    });
  });

  it("bỏ qua lưu phái không còn ai", () => {
    const counts = countByGuildClass(POOL);

    expect(
      counts.some((item) => item.guildClass === GuildClass.LONG_NGAM)
    ).toBe(false);
  });

  it("pool rỗng thì không có dòng nào", () => {
    expect(countByGuildClass([])).toEqual([]);
  });

  it("giữ thứ tự theo GUILD_CLASS_OPTIONS để UI không nhảy", () => {
    const counts = countByGuildClass(POOL);

    expect(counts.map((item) => item.guildClass)).toEqual([
      GuildClass.THIET_Y,
      GuildClass.TO_VAN,
    ]);
  });
});
