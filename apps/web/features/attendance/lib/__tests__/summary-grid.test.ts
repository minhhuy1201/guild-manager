import { describe, expect, it } from "vitest";

import { summaryCardSpanClass } from "../summary-grid";

describe("summaryCardSpanClass", () => {
  it("1 card chiếm trọn hàng ở mọi cỡ", () => {
    expect(summaryCardSpanClass(0, 1)).toBe("sm:col-span-6 lg:col-span-6");
  });

  it("2 card chia đôi hàng", () => {
    expect(summaryCardSpanClass(0, 2)).toBe("sm:col-span-3 lg:col-span-3");
    expect(summaryCardSpanClass(1, 2)).toBe("sm:col-span-3 lg:col-span-3");
  });

  it("3 card nằm một hàng ở màn rộng, hai hàng ở màn vừa với card cuối trọn hàng", () => {
    expect(summaryCardSpanClass(0, 3)).toBe("sm:col-span-3 lg:col-span-2");
    expect(summaryCardSpanClass(2, 3)).toBe("sm:col-span-6 lg:col-span-2");
  });

  it("4 card: card cuối trọn hàng ở màn rộng", () => {
    expect(summaryCardSpanClass(2, 4)).toBe("sm:col-span-3 lg:col-span-2");
    expect(summaryCardSpanClass(3, 4)).toBe("sm:col-span-3 lg:col-span-6");
  });

  it("5 card: hai card cuối chia đôi hàng cuối ở màn rộng", () => {
    expect(summaryCardSpanClass(3, 5)).toBe("sm:col-span-3 lg:col-span-3");
    expect(summaryCardSpanClass(4, 5)).toBe("sm:col-span-6 lg:col-span-3");
  });

  it("7 card: card cuối trọn hàng ở cả hai cỡ", () => {
    expect(summaryCardSpanClass(6, 7)).toBe("sm:col-span-6 lg:col-span-6");
    expect(summaryCardSpanClass(5, 7)).toBe("sm:col-span-3 lg:col-span-2");
  });
});
