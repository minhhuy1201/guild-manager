import { describe, expect, it } from "vitest";

import { matchesName } from "../name-search";

describe("matchesName", () => {
  it.each([
    ["Cún Con", "cun", true],
    ["Cún Con", "CÚN", true],
    ["Đại Ca", "dai", true],
    ["Mèo Mập", "mập", true],
    ["Mèo Mập", "meo map", true],
    ["Mèo Mập", "chó", false],
    ["Mèo Mập", "  ", true],
    ["Mèo Mập", "", true],
  ])("%s with %j -> %s", (name, query, expected) => {
    expect(matchesName(name, query)).toBe(expected);
  });
});
