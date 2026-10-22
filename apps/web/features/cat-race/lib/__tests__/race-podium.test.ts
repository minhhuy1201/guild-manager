import { describe, expect, it } from "vitest";

import { podiumOf } from "../race-podium";

const LABELS = new Map([
  ["a#1", "Alice"],
  ["b#1", "Bob"],
  ["c#1", "Cy"],
]);

describe("podiumOf", () => {
  it("takes places two and three of the final ranking", () => {
    expect(podiumOf(["a#1", "b#1", "c#1"], LABELS)).toEqual([
      { place: 2, label: "Bob" },
      { place: 3, label: "Cy" },
    ]);
  });

  it("leaves out a place nobody finished in", () => {
    expect(podiumOf(["a#1", "b#1"], LABELS)).toEqual([{ place: 2, label: "Bob" }]);
    expect(podiumOf(["a#1"], LABELS)).toEqual([]);
    expect(podiumOf([], LABELS)).toEqual([]);
  });
});
