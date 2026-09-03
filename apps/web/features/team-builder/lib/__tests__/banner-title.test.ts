import { describe, expect, it, vi } from "vitest";

// `banner-title.ts` reuses the subtitle rule through the attendance barrel, which also carries
// the server actions reading the session cookie — harmless here, since the test never runs one.
vi.mock("server-only", () => ({}));

import { buildBannerTitle } from "../banner-title";

/** 20:30 giờ Việt Nam, thứ Tư 03/09/2025. */
const DATE_TIME = "2025-09-03T13:30:00.000Z";

const BASE = {
  isGuildWar: false,
  dateTime: DATE_TIME,
  opponent: "Bang ABC",
  activeMatchIndex: 0,
  draftMatchCount: 2,
  scheduledMatchCount: 2,
};

describe("buildBannerTitle", () => {
  it("ghi SCRIM kèm đối thủ cho trận giao hữu", () => {
    expect(buildBannerTitle(BASE)).toBe(
      "SCRIM 20:30 03/09 - VS: Bang ABC - trận 1/2"
    );
  });

  it("ghi BANG CHIẾN và bỏ phần đối thủ", () => {
    expect(
      buildBannerTitle({ ...BASE, isGuildWar: true, opponent: null })
    ).toBe("BANG CHIẾN 20:30 03/09 - trận 1/2");
  });

  it("nói rõ khi trận giao hữu chưa có đối thủ", () => {
    expect(buildBannerTitle({ ...BASE, opponent: null })).toBe(
      "SCRIM 20:30 03/09 - Chưa có đối thủ - trận 1/2"
    );
  });

  it("đánh số theo trận đang mở", () => {
    expect(buildBannerTitle({ ...BASE, activeMatchIndex: 1 })).toBe(
      "SCRIM 20:30 03/09 - VS: Bang ABC - trận 2/2"
    );
  });

  it("ghi số trận của ngày khi một đội hình dùng cho cả hai trận", () => {
    expect(buildBannerTitle({ ...BASE, draftMatchCount: 1 })).toBe(
      "SCRIM 20:30 03/09 - VS: Bang ABC - 2 trận"
    );
  });

  it("đếm theo số đội hình đã lưu khi lịch bị rút xuống 1 trận", () => {
    expect(buildBannerTitle({ ...BASE, scheduledMatchCount: 1 })).toBe(
      "SCRIM 20:30 03/09 - VS: Bang ABC - trận 1/2"
    );
  });

  it("ghi số trận của ngày khi ngày chỉ đánh 1 trận", () => {
    expect(
      buildBannerTitle({
        ...BASE,
        draftMatchCount: 1,
        scheduledMatchCount: 1,
      })
    ).toBe("SCRIM 20:30 03/09 - VS: Bang ABC - 1 trận");
  });
});
