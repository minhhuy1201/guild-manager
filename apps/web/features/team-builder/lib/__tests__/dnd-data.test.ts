import { describe, expect, it } from "vitest";

import {
  POOL_DROPPABLE_ID,
  isMemberDragData,
  toDragSource,
  toDropTarget,
} from "../dnd-data";

describe("isMemberDragData", () => {
  it("nhận dữ liệu kéo hợp lệ", () => {
    expect(
      isMemberDragData({ type: "member", characterId: "char-1", from: "pool" })
    ).toBe(true);
  });

  it("từ chối undefined, null và object sai hình dạng", () => {
    expect(isMemberDragData(undefined)).toBe(false);
    expect(isMemberDragData(null)).toBe(false);
    expect(isMemberDragData({ type: "slot", slotId: "team-1-pos-1" })).toBe(false);
    expect(isMemberDragData({ type: "member", characterId: 1, from: "pool" })).toBe(false);
  });
});

describe("toDragSource", () => {
  it("đổi from = \"pool\" thành nguồn pool", () => {
    expect(
      toDragSource({ type: "member", characterId: "char-1", from: POOL_DROPPABLE_ID })
    ).toEqual({ kind: "pool" });
  });

  it("đổi from = slot id thành nguồn slot", () => {
    expect(
      toDragSource({ type: "member", characterId: "char-1", from: "team-2-pos-3" })
    ).toEqual({ kind: "slot", slotId: "team-2-pos-3" });
  });
});

describe("toDropTarget", () => {
  it("đọc được vùng pool", () => {
    expect(toDropTarget({ type: "pool" })).toEqual({ kind: "pool" });
  });

  it("đọc được một ô", () => {
    expect(toDropTarget({ type: "slot", slotId: "team-1-pos-1" })).toEqual({
      kind: "slot",
      slotId: "team-1-pos-1",
    });
  });

  it("trả null khi thả ngoài vùng hoặc dữ liệu sai hình dạng", () => {
    expect(toDropTarget(undefined)).toBeNull();
    expect(toDropTarget(null)).toBeNull();
    expect(toDropTarget({ type: "slot" })).toBeNull();
    expect(toDropTarget({ type: "member", characterId: "char-1" })).toBeNull();
  });
});
