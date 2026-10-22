import { describe, expect, it } from "vitest";

import { darker, pixelColor } from "../sprite-color";

describe("darker", () => {
  it("scales every channel to 72%", () => {
    expect(darker("#ffffff")).toBe("#b8b8b8");
    expect(darker("#000000")).toBe("#000000");
  });

  it("keeps a leading zero in a dark channel", () => {
    expect(darker("#0a0a0a")).toBe("#070707");
  });
});

describe("pixelColor", () => {
  it("takes the class colour for the body and a darker shade for a stripe", () => {
    expect(pixelColor("#", "#ffffff")).toBe("#ffffff");
    expect(pixelColor("d", "#ffffff")).toBe("#b8b8b8");
  });

  it("gives accessories and features fixed colours", () => {
    expect(pixelColor("o", "#123456")).toBe("#221a26");
    expect(pixelColor("r", "#123456")).toBe("#e0362c");
  });

  it("leaves a dot or an unknown letter empty", () => {
    expect(pixelColor(".", "#123456")).toBeNull();
    expect(pixelColor("?", "#123456")).toBeNull();
  });
});
