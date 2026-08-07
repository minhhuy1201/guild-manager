import { beforeEach, describe, expect, it } from "vitest";

import type { Assignment } from "../../types/formation";
import { useFormationStore } from "../formation-store";

const SAVED: Assignment = {
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
};

/** Ngày một trận, dùng làm bản đã lưu trong hầu hết các test. */
const ONE_MATCH: Assignment[] = [SAVED];

describe("useFormationStore", () => {
  beforeEach(() => {
    useFormationStore.setState({
      drafts: {},
      activeSessionId: null,
      activeMatchIndex: 0,
      selectedWeekStart: null,
    });
  });

  it("kéo thả lần đầu thì dựng nháp từ bản đã lưu", () => {
    useFormationStore
      .getState()
      .drop("sat", 0, ONE_MATCH, { kind: "pool" }, "char-9", {
        kind: "slot",
        slotId: "team-1-pos-2",
      });

    expect(useFormationStore.getState().drafts.sat).toEqual([
      {
        "team-1-pos-1": "char-1",
        "team-1-pos-2": "char-9",
      },
    ]);
  });

  it("giữ nháp của từng ngày tách biệt nhau", () => {
    const { drop } = useFormationStore.getState();
    drop("sat", 0, ONE_MATCH, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });
    drop("thu", 0, ONE_MATCH, { kind: "pool" }, "char-8", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });

    const { drafts } = useFormationStore.getState();
    expect(drafts.sat[0]["team-1-pos-2"]).toBe("char-9");
    expect(drafts.thu[0]["team-1-pos-2"]).toBe("char-8");
  });

  it("chỉ sửa trận đang mở, trận kia giữ nguyên", () => {
    useFormationStore
      .getState()
      .drop(
        "sat",
        1,
        [SAVED, SAVED],
        { kind: "pool" },
        "char-9",
        { kind: "slot", slotId: "team-1-pos-2" }
      );

    const matches = useFormationStore.getState().drafts.sat;
    expect(matches[0]["team-1-pos-2"]).toBeNull();
    expect(matches[1]["team-1-pos-2"]).toBe("char-9");
  });

  it("thả ra ngoài mọi vùng thì không tạo nháp", () => {
    useFormationStore
      .getState()
      .drop("sat", 0, ONE_MATCH, { kind: "pool" }, "char-9", null);

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("clearDraft bỏ nháp để quay về bản đã lưu", () => {
    const { drop, clearDraft } = useFormationStore.getState();
    drop("sat", 0, ONE_MATCH, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });
    clearDraft("sat");

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("setDraft ghi thẳng một nháp (dùng cho điền sẵn)", () => {
    useFormationStore.getState().setDraft("thu", ONE_MATCH);

    expect(useFormationStore.getState().drafts.thu).toEqual(ONE_MATCH);
  });

  it("đổi tuần thì bỏ hết nháp của tuần cũ", () => {
    const { setDraft, setWeek } = useFormationStore.getState();
    setDraft("sat", ONE_MATCH);
    setWeek("2026-07-13T00:00:00.000Z");

    const state = useFormationStore.getState();
    expect(state.drafts).toEqual({});
    expect(state.selectedWeekStart).toBe("2026-07-13T00:00:00.000Z");
  });

  it("đổi sang ngày khác thì quay về trận 1", () => {
    const { setActiveMatch, setActiveSession } = useFormationStore.getState();
    setActiveMatch(1);
    setActiveSession("thu");

    expect(useFormationStore.getState().activeMatchIndex).toBe(0);
  });
});
