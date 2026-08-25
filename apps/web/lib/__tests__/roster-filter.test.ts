import { describe, expect, it } from "vitest";
import { GuildClass } from "@guild/shared/enums";

import { matchesRosterFilter, type RosterCandidate } from "../roster-filter";

const MEO: RosterCandidate = {
  name: "Mèo Mập",
  guildClass: GuildClass.THIET_Y,
};

describe("matchesRosterFilter", () => {
  it("bộ lọc rỗng thì nhận mọi nhân vật", () => {
    expect(matchesRosterFilter(MEO, { search: "", guildClasses: [] })).toBe(true);
  });

  it("khớp tên, không phân biệt hoa thường", () => {
    expect(matchesRosterFilter(MEO, { search: "mÈo", guildClasses: [] })).toBe(true);
  });

  it("không tìm theo ID trong game: từ khoá chỉ khớp id thì loại", () => {
    // "meomap" used to be MEO's id; only the name is matched now.
    expect(matchesRosterFilter(MEO, { search: "meomap", guildClasses: [] })).toBe(false);
  });

  it("không khớp tên thì loại", () => {
    expect(matchesRosterFilter(MEO, { search: "long", guildClasses: [] })).toBe(false);
  });

  it("khớp tên nhưng khác lưu phái thì vẫn loại", () => {
    const filter = { search: "mèo", guildClasses: [GuildClass.TO_VAN] };

    expect(matchesRosterFilter(MEO, filter)).toBe(false);
  });

  it("nhận khi lưu phái nằm trong danh sách đang lọc", () => {
    const filter = { search: "", guildClasses: [GuildClass.THIET_Y, GuildClass.TO_VAN] };

    expect(matchesRosterFilter(MEO, filter)).toBe(true);
  });

  it("từ khoá chỉ có khoảng trắng thì coi như không lọc", () => {
    expect(matchesRosterFilter(MEO, { search: "   ", guildClasses: [] })).toBe(true);
  });

  it("cắt khoảng trắng thừa quanh từ khoá thật", () => {
    expect(matchesRosterFilter(MEO, { search: "  mập  ", guildClasses: [] })).toBe(true);
  });
});
