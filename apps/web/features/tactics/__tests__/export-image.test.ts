import { describe, expect, it } from "vitest";

import { exportFileName } from "../lib/export-image";

describe("exportFileName", () => {
  it("joins the tactic, the number and the stage", () => {
    expect(exportFileName("Thủ cổng tây", 1, "Giai đoạn 1")).toBe(
      "Thủ cổng tây-1-Giai đoạn 1.png"
    );
  });

  it("replaces the characters a file system refuses", () => {
    expect(exportFileName("A/B", 2, "C:D")).toBe("A-B-2-C-D.png");
  });

  it("never returns an empty name", () => {
    expect(exportFileName("///", 1, "///")).toBe("chien-thuat-1-giai-doan.png");
  });
});
