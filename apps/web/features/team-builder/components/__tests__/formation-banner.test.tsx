// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FormationBanner } from "../formation-banner";

afterEach(cleanup);

describe("FormationBanner", () => {
  // Trên màn hình, tab ngày ngay phía trên đã nói trận nào, nên banner chỉ cần một dòng gọn.
  it("cỡ compact không giữ chiều cao tối thiểu của tiêu đề ảnh", () => {
    render(
      <FormationBanner
        title="BANG CHIẾN 20:30 03/09"
        isGuildWar
        locked={false}
        size="compact"
      />
    );

    const banner = screen.getByRole("heading", { level: 2 });
    expect(banner.className).not.toContain("min-h-24");
    expect(banner.textContent).toContain("BANG CHIẾN 20:30 03/09");
  });

  it("cỡ tall là tiêu đề của ảnh gửi Discord", () => {
    render(
      <FormationBanner
        title="BANG CHIẾN 20:30 03/09"
        isGuildWar
        locked={false}
        size="tall"
      />
    );

    expect(screen.getByRole("heading", { level: 2 }).className).toContain(
      "min-h-24"
    );
  });
});
