import { describe, expect, it } from "vitest";
import { GuildClass } from "@shared/enums";

import type { Assignment } from "../../types/formation";
import { selectPoolCharacters, type PoolCandidate } from "../pool";

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

  it("tìm theo tên, không phân biệt hoa thường", () => {
    const pool = selectPoolCharacters(CHARACTERS, EMPTY, {
      search: "mèo",
      guildClasses: [],
    });

    expect(pool.map((character) => character.id)).toEqual(["MeoMap01"]);
  });

  it("tìm theo ID trong game, không phân biệt hoa thường", () => {
    const pool = selectPoolCharacters(CHARACTERS, EMPTY, {
      search: "longnho",
      guildClasses: [],
    });

    expect(pool.map((character) => character.id)).toEqual(["LongNho02"]);
  });

  it("bỏ qua khoảng trắng thừa ở từ khóa", () => {
    const pool = selectPoolCharacters(CHARACTERS, EMPTY, {
      search: "   ",
      guildClasses: [],
    });

    expect(pool).toHaveLength(3);
  });

  it("lọc theo lưu phái, mảng rỗng nghĩa là tất cả", () => {
    const pool = selectPoolCharacters(CHARACTERS, EMPTY, {
      search: "",
      guildClasses: [GuildClass.TO_VAN, GuildClass.THIET_Y],
    });

    expect(pool.map((character) => character.id)).toEqual(["MeoMap01", "ToVan03"]);
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
