import { describe, expect, it } from "vitest";
import { GuildClass } from "@guild/shared/enums";

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
