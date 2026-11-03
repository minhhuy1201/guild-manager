import { describe, expect, it } from "vitest";
import type { TacticElement } from "@guild/shared/schemas";

import {
  pressedTokenSize,
  selectedTokenSizes,
} from "../lib/token-size-selection";

const token = (id: string, size: "sm" | "md" | "lg"): TacticElement => ({
  kind: "token",
  id,
  x: 0,
  y: 0,
  size,
  icon: "swords",
  label: "",
  color: "blue",
});

const arrow: TacticElement = {
  kind: "arrow",
  id: "a1",
  points: [0, 0, 10, 10],
  strokeWidth: 4,
  color: "yellow",
};

describe("selectedTokenSizes(…)", () => {
  it("lists the size of each token and skips other elements", () => {
    expect(
      selectedTokenSizes([token("t1", "sm"), arrow, token("t2", "lg")])
    ).toEqual(["sm", "lg"]);
  });

  it("is empty when the selection holds no token", () => {
    expect(selectedTokenSizes([arrow])).toEqual([]);
  });
});

describe("pressedTokenSize(…)", () => {
  it("is the new-token size when no token is selected", () => {
    expect(pressedTokenSize("md", [])).toBe("md");
  });

  it("is the shared size when every selected token has it", () => {
    expect(pressedTokenSize("md", ["lg", "lg"])).toBe("lg");
  });

  it("is none when the selected tokens differ", () => {
    expect(pressedTokenSize("md", ["sm", "lg"])).toBeNull();
  });
});
