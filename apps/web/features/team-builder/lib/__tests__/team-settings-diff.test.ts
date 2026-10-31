import { describe, expect, it } from "vitest";

import { TeamColor } from "@guild/shared/enums";

import { countSettingChanges } from "../team-settings-diff";

const SAVED = {
  names: { "1": "Xung kích", "2": "Thủ nhà" },
  colors: { "1": TeamColor.RED },
};

describe("countSettingChanges", () => {
  it("giống bản lưu thì là 0", () => {
    expect(
      countSettingChanges(
        { names: { ...SAVED.names }, colors: { ...SAVED.colors } },
        SAVED
      )
    ).toBe(0);
  });

  it("đổi tên một đội là 1", () => {
    expect(
      countSettingChanges(
        { ...SAVED, names: { ...SAVED.names, "2": "Hậu cần" } },
        SAVED
      )
    ).toBe(1);
  });

  it("xoá tên một đội (về lại số đội) là 1", () => {
    expect(
      countSettingChanges({ ...SAVED, names: { "1": "Xung kích" } }, SAVED)
    ).toBe(1);
  });

  it("đặt tên cho đội chưa có tên là 1", () => {
    expect(
      countSettingChanges(
        { ...SAVED, names: { ...SAVED.names, "5": "Du kích" } },
        SAVED
      )
    ).toBe(1);
  });

  it("đổi màu một đội là 1", () => {
    expect(
      countSettingChanges(
        { ...SAVED, colors: { "1": TeamColor.SKY } },
        SAVED
      )
    ).toBe(1);
  });

  it("về màu mặc định (mất key) là 1", () => {
    expect(countSettingChanges({ ...SAVED, colors: {} }, SAVED)).toBe(1);
  });

  it("một đội đổi cả tên lẫn màu là 2", () => {
    expect(
      countSettingChanges(
        {
          names: { ...SAVED.names, "1": "Công" },
          colors: { "1": TeamColor.SKY },
        },
        SAVED
      )
    ).toBe(2);
  });
});
