import { beforeEach, describe, expect, it } from "vitest";

import type { Assignment, MatchDraft } from "../../types/formation";
import { useFormationStore } from "../formation-store";

const SAVED: Assignment = {
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
};

/** Ngày một trận, dùng làm bản đã lưu trong hầu hết các test. */
const ONE_MATCH: MatchDraft[] = [{ assignment: SAVED, notes: {} }];

/**
 * Đặt nháp của một ngày vào đúng chỗ bản đã lưu, như hook draft làm trước mỗi
 * lần ghi.
 * @param sessionId - Ngày cần có nháp
 * @param initial - Bản đã lưu của ngày đó
 */
function openDraft(sessionId: string, initial: MatchDraft[] = ONE_MATCH) {
  useFormationStore.getState().ensureDraft(sessionId, initial);
}

describe("useFormationStore", () => {
  beforeEach(() => {
    useFormationStore.setState({
      drafts: {},
      activeSessionId: null,
      activeMatchIndex: 0,
      selectedWeekStart: null,
    });
  });

  describe("ensureDraft", () => {
    it("ngày chưa có nháp thì dựng nháp từ bản đã lưu", () => {
      openDraft("sat");

      expect(useFormationStore.getState().drafts.sat).toBe(ONE_MATCH);
    });

    it("ngày đã có nháp thì không đè lên", () => {
      const edited: MatchDraft[] = [{ assignment: {}, notes: { x: "y" } }];
      useFormationStore.getState().setDraft("sat", edited);

      openDraft("sat");

      expect(useFormationStore.getState().drafts.sat).toBe(edited);
    });
  });

  it("kéo thả lần đầu thì sửa trên nháp vừa dựng từ bản đã lưu", () => {
    openDraft("sat");
    useFormationStore.getState().drop("sat", 0, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });

    expect(useFormationStore.getState().drafts.sat).toEqual([
      {
        assignment: {
          "team-1-pos-1": "char-1",
          "team-1-pos-2": "char-9",
        },
        notes: {},
      },
    ]);
  });

  it("chưa có nháp thì drop không ghi gì — store không tự đoán bản đã lưu", () => {
    useFormationStore.getState().drop("sat", 0, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("giữ nháp của từng ngày tách biệt nhau", () => {
    openDraft("sat");
    openDraft("thu");
    const { drop } = useFormationStore.getState();
    drop("sat", 0, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });
    drop("thu", 0, { kind: "pool" }, "char-8", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });

    const { drafts } = useFormationStore.getState();
    expect(drafts.sat[0].assignment["team-1-pos-2"]).toBe("char-9");
    expect(drafts.thu[0].assignment["team-1-pos-2"]).toBe("char-8");
  });

  it("chỉ sửa trận đang mở, trận kia giữ nguyên", () => {
    openDraft("sat", [
      { assignment: SAVED, notes: {} },
      { assignment: SAVED, notes: {} },
    ]);
    useFormationStore.getState().drop("sat", 1, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });

    const matches = useFormationStore.getState().drafts.sat;
    expect(matches[0].assignment["team-1-pos-2"]).toBeNull();
    expect(matches[1].assignment["team-1-pos-2"]).toBe("char-9");
  });

  it("thả ra ngoài mọi vùng thì không đổi nháp", () => {
    openDraft("sat");
    useFormationStore.getState().drop("sat", 0, { kind: "pool" }, "char-9", null);

    expect(useFormationStore.getState().drafts.sat).toBe(ONE_MATCH);
  });

  it("clearDraft bỏ nháp để quay về bản đã lưu", () => {
    openDraft("sat");
    const { drop, clearDraft } = useFormationStore.getState();
    drop("sat", 0, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });
    clearDraft("sat");

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("setDraft ghi thẳng một nháp (dùng cho thêm và xoá trận)", () => {
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

  describe("setNote", () => {
    it("ghi chú đầu tiên giữ nguyên đội hình của bản đã lưu", () => {
      openDraft("sat");
      useFormationStore
        .getState()
        .setNote("sat", 0, "team-1-pos-2", "chừa cho X");

      expect(useFormationStore.getState().drafts.sat).toEqual([
        { assignment: SAVED, notes: { "team-1-pos-2": "chừa cho X" } },
      ]);
    });

    it("xoá trắng ghi chú thì bỏ hẳn khoá", () => {
      openDraft("sat");
      const store = useFormationStore.getState();
      store.setNote("sat", 0, "team-1-pos-1", "giữ buồng");
      useFormationStore.getState().setNote("sat", 0, "team-1-pos-1", "  ");

      expect(useFormationStore.getState().drafts.sat[0].notes).toEqual({});
    });

    it("chỉ chạm đúng trận đang mở, không đụng trận kia", () => {
      openDraft("sat", [
        { assignment: SAVED, notes: { "team-1-pos-1": "giữ buồng" } },
        { assignment: SAVED, notes: { "team-1-pos-1": "vào sau" } },
      ]);

      useFormationStore.getState().setNote("sat", 1, "team-1-pos-1", "tank");

      const drafts = useFormationStore.getState().drafts.sat;
      expect(drafts[0].notes).toEqual({ "team-1-pos-1": "giữ buồng" });
      expect(drafts[1].notes).toEqual({ "team-1-pos-1": "tank" });
    });

    it("không đụng gì khi chỉ số trận nằm ngoài khoảng", () => {
      openDraft("sat");
      useFormationStore.getState().setNote("sat", 5, "team-1-pos-1", "giữ buồng");

      expect(useFormationStore.getState().drafts.sat).toBe(ONE_MATCH);
    });

    it("kéo thả không xoá mất ghi chú đã gõ", () => {
      openDraft("sat");
      const store = useFormationStore.getState();
      store.setNote("sat", 0, "team-1-pos-2", "chừa cho X");
      useFormationStore.getState().drop("sat", 0, { kind: "pool" }, "char-9", {
        kind: "slot",
        slotId: "team-1-pos-2",
      });

      const draft = useFormationStore.getState().drafts.sat[0];
      expect(draft.assignment["team-1-pos-2"]).toBe("char-9");
      expect(draft.notes).toEqual({ "team-1-pos-2": "chừa cho X" });
    });
  });
});
