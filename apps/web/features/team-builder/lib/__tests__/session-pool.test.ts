import { describe, expect, it } from "vitest";
import { GuildClass } from "@guild/shared/enums";

import type { PoolCandidate } from "../pool";
import {
  presentCharacterIds,
  selectPresentCharacters,
  type AttendanceRecordLike,
} from "../session-pool";

const CHARACTERS: PoolCandidate[] = [
  { id: "MeoMap01", name: "Mèo Mập", guildClass: GuildClass.THIET_Y },
  { id: "LongNho02", name: "Long Nhỏ", guildClass: GuildClass.LONG_NGAM },
  { id: "ToVan03", name: "Tố Vân", guildClass: GuildClass.TO_VAN },
];

const RECORDS: AttendanceRecordLike[] = [
  {
    characterId: "MeoMap01",
    sessionId: "sat",
    isPresent: true,
  },
  {
    characterId: "LongNho02",
    sessionId: "sat",
    isPresent: false,
  },
  {
    characterId: "ToVan03",
    sessionId: "thu",
    isPresent: true,
  },
];

describe("presentCharacterIds", () => {
  it("chỉ lấy người báo Có cho đúng trận", () => {
    expect(presentCharacterIds(RECORDS, "sat")).toEqual(new Set(["MeoMap01"]));
  });

  it("trả tập rỗng khi chưa ai điểm danh trận đó", () => {
    expect(presentCharacterIds(RECORDS, "tue")).toEqual(new Set());
  });

  it("không tính người báo Không", () => {
    expect(presentCharacterIds(RECORDS, "sat").has("LongNho02")).toBe(false);
  });
});

describe("selectPresentCharacters", () => {
  it("giữ đúng người có mặt, theo thứ tự danh sách gốc", () => {
    const present = new Set(["ToVan03", "MeoMap01"]);

    expect(
      selectPresentCharacters(CHARACTERS, present).map((c) => c.id)
    ).toEqual(["MeoMap01", "ToVan03"]);
  });

  it("trả mảng rỗng khi không ai có mặt", () => {
    expect(selectPresentCharacters(CHARACTERS, new Set())).toEqual([]);
  });
});
