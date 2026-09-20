import { describe, expect, it } from "vitest";
import { GUILD_CLASS_OPTIONS, GuildClass } from "@guild/shared/enums";

import type { Assignment } from "../../types/formation";
import {
  countByGuildClass,
  selectPoolCharacters,
  toggleGuildClass,
  type PoolCandidate,
} from "../pool";

const CHARACTERS: PoolCandidate[] = [
  { id: "MeoMap01", name: "Mèo Mập", guildClass: GuildClass.THIET_Y },
  { id: "LongNho02", name: "Long Nhỏ", guildClass: GuildClass.LONG_NGAM },
  { id: "ToVan03", name: "Tố Vân", guildClass: GuildClass.TO_VAN },
];

const NO_FILTER = { search: "", guildClasses: [] };

/** Assignment where nobody is placed yet. */
const EMPTY: Assignment = { "team-1-pos-1": null, "team-1-pos-2": null };

describe("selectPoolCharacters", () => {
  it("trả về tất cả khi chưa ai được xếp và không lọc gì", () => {
    expect(selectPoolCharacters(CHARACTERS, EMPTY, NO_FILTER)).toHaveLength(3);
  });

  it("loại người đã được xếp vào đội hình", () => {
    const assignment: Assignment = { ...EMPTY, "team-1-pos-1": "MeoMap01" };

    const pool = selectPoolCharacters(CHARACTERS, assignment, NO_FILTER);

    expect(pool.map((character) => character.id)).toEqual(["LongNho02", "ToVan03"]);
  });

  it("người đã xếp thì không hiện, kể cả khi khớp từ khoá", () => {
    const assignment: Assignment = { ...EMPTY, "team-1-pos-1": "MeoMap01" };

    const pool = selectPoolCharacters(CHARACTERS, assignment, {
      search: "mèo",
      guildClasses: [],
    });

    expect(pool).toHaveLength(0);
  });

  it("áp đồng thời cả tìm kiếm, lưu phái và loại người đã xếp", () => {
    const assignment: Assignment = { ...EMPTY, "team-1-pos-1": "MeoMap01" };

    const pool = selectPoolCharacters(CHARACTERS, assignment, {
      search: "o",
      guildClasses: [GuildClass.THIET_Y],
    });

    expect(pool).toHaveLength(0);
  });
});

describe("countByGuildClass", () => {
  it("đếm theo lưu phái, theo thứ tự GUILD_CLASS_OPTIONS", () => {
    const counts = countByGuildClass([
      ...CHARACTERS,
      { id: "ToVan04", name: "Tố Vân 2", guildClass: GuildClass.TO_VAN },
    ]);

    const expectedOrder = GUILD_CLASS_OPTIONS.filter((guildClass) =>
      [GuildClass.THIET_Y, GuildClass.LONG_NGAM, GuildClass.TO_VAN].includes(
        guildClass
      )
    );
    expect(counts.map((entry) => entry.guildClass)).toEqual(expectedOrder);
    expect(
      counts.find((entry) => entry.guildClass === GuildClass.TO_VAN)?.count
    ).toBe(2);
  });

  // A chip for a class with nobody left only takes up room and filters nothing.
  it("bỏ lưu phái không còn ai", () => {
    const counts = countByGuildClass(CHARACTERS);

    expect(counts).toHaveLength(3);
  });

  it("kho rỗng thì không có chip nào", () => {
    expect(countByGuildClass([])).toEqual([]);
  });
});

describe("toggleGuildClass", () => {
  it("lưu phái chưa chọn thì thêm vào", () => {
    expect(toggleGuildClass([GuildClass.TO_VAN], GuildClass.THIET_Y)).toEqual([
      GuildClass.TO_VAN,
      GuildClass.THIET_Y,
    ]);
  });

  it("lưu phái đang chọn thì bỏ ra", () => {
    expect(
      toggleGuildClass([GuildClass.TO_VAN, GuildClass.THIET_Y], GuildClass.TO_VAN)
    ).toEqual([GuildClass.THIET_Y]);
  });

  it("không sửa mảng gốc", () => {
    const selected = [GuildClass.TO_VAN];

    toggleGuildClass(selected, GuildClass.THIET_Y);

    expect(selected).toEqual([GuildClass.TO_VAN]);
  });
});
