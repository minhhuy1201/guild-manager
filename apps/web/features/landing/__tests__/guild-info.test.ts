import { describe, expect, it } from "vitest";

import { GUILD_LEADERS, GUILD_PILLARS, JOIN_STEPS } from "../lib/guild-info";

describe("guild-info", () => {
  it("ban chỉ huy đủ bốn người theo đúng thứ tự", () => {
    expect(GUILD_LEADERS.map((leader) => [leader.name, leader.role])).toEqual([
      ["LightAries", "Bang chủ"],
      ["Leonie", "Leader"],
      ["huy", "Quản lý"],
      ["spygutie", "Quản lý"],
    ]);
  });

  it("mỗi người có chỗ ảnh dưới /img/members và chữ viết tắt", () => {
    for (const leader of GUILD_LEADERS) {
      expect(leader.avatarSrc).toMatch(/^\/img\/members\/[a-z]+\.png$/);
      expect(leader.initials.length).toBeGreaterThan(0);
    }
  });

  it("bang chủ chỉ hiện tên, ba người còn lại có mô tả", () => {
    const [master, ...officers] = GUILD_LEADERS;
    expect(master.duty).toBeUndefined();
    for (const officer of officers) {
      expect(officer.duty?.length).toBeGreaterThan(0);
    }
  });

  it("ba cột định hướng và ba bước tham gia", () => {
    expect(GUILD_PILLARS).toHaveLength(3);
    expect(JOIN_STEPS).toHaveLength(3);
  });
});
