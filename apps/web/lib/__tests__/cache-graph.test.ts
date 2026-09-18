import { describe, expect, it } from "vitest";

import { attendanceKeys } from "@/features/attendance/api/attendance-keys";
import { memberKeys } from "@/features/members/api/members-keys";
import { settingsKeys } from "@/features/settings/api/battle-sessions-keys";
import { teamBuilderKeys } from "@/features/team-builder/api/team-builder-keys";
import { CACHE_DEPENDENTS, CACHE_TOPICS } from "../cache-graph";

describe("CACHE_DEPENDENTS", () => {
  it("mọi chủ đề đều có mục trong đồ thị", () => {
    for (const topic of CACHE_TOPICS) {
      expect(CACHE_DEPENDENTS[topic]().length).toBeGreaterThan(0);
    }
  });

  it("sửa danh sách thành viên làm cũ cả điểm danh lẫn xếp team", () => {
    expect(CACHE_DEPENDENTS.roster()).toEqual([
      memberKeys.all,
      attendanceKeys.characters(),
      attendanceKeys.records(),
      teamBuilderKeys.all,
    ]);
  });

  it("đổi lịch đánh làm cũ record điểm danh", () => {
    expect(CACHE_DEPENDENTS.schedule()).toEqual([
      settingsKeys.all,
      attendanceKeys.sessions(),
      attendanceKeys.records(),
      teamBuilderKeys.all,
    ]);
  });

  it("điểm danh chỉ làm cũ record", () => {
    expect(CACHE_DEPENDENTS.attendance()).toEqual([attendanceKeys.records()]);
  });

  it("cửa sổ điểm danh đóng/mở làm cũ trận, record và danh sách lịch", () => {
    // Màn Thiết lập vẽ cùng bộ cờ đó trên từng dòng — nút "Mở lại điểm danh" chỉ hiện khi ngày
    // đang khoá, nên danh sách cũ sẽ mời admin bấm một nút mà backend đã từ chối.
    expect(CACHE_DEPENDENTS["attendance-window"]()).toEqual([
      attendanceKeys.sessions(),
      attendanceKeys.records(),
      settingsKeys.all,
    ]);
  });

  it("lưu đội hình chỉ làm cũ xếp team", () => {
    expect(CACHE_DEPENDENTS.formation()).toEqual([teamBuilderKeys.all]);
  });

  it("gọi hai lần trả về key bằng nhau", () => {
    // The thunk only defers reading the key factory; it must not produce different keys.
    expect(CACHE_DEPENDENTS.schedule()).toEqual(CACHE_DEPENDENTS.schedule());
  });
});
