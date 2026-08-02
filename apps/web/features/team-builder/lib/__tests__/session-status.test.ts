import { describe, expect, it } from "vitest";

import { isSessionEditable } from "../session-status";

describe("isSessionEditable", () => {
  it("cho sửa trận chưa đánh của tuần đang mở", () => {
    expect(isSessionEditable({ locked: false }, true)).toBe(true);
  });

  it("khoá trận đã đánh dù đang ở tuần hiện tại", () => {
    expect(isSessionEditable({ locked: true }, true)).toBe(false);
  });

  it("khoá mọi trận của tuần cũ", () => {
    expect(isSessionEditable({ locked: false }, false)).toBe(false);
  });
});
