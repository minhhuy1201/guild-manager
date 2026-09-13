import { beforeEach, describe, expect, it } from "vitest";

import type { Assignment, MatchDraft } from "../../types/formation";
import { useFormationStore } from "../formation-store";

const SAVED: Assignment = {
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
};

/** A one-match day, standing in for the saved copy in most of these tests. */
const ONE_MATCH: MatchDraft[] = [{ assignment: SAVED, notes: {} }];

/**
 * Put a day's draft in place from its saved copy, the way the draft hook does
 * before every write.
 * @param sessionId - Day that needs a draft
 * @param initial - Saved copy of that day
 */
function openDraft(sessionId: string, initial: MatchDraft[] = ONE_MATCH) {
  useFormationStore.getState().ensureDraft(sessionId, initial);
}

describe("useFormationStore", () => {
  beforeEach(() => {
    useFormationStore.setState({
      drafts: {},
      history: {},
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

  describe("undo", () => {
    const EDITED: MatchDraft[] = [{ assignment: {}, notes: { x: "y" } }];

    it("trả nháp về đúng bước trước và bỏ bước đó khỏi lịch sử", () => {
      const { setDraft, pushUndo } = useFormationStore.getState();
      setDraft("sat", ONE_MATCH);
      pushUndo("sat", { draft: ONE_MATCH, matchIndex: 0, mergeKey: null });
      setDraft("sat", EDITED);

      useFormationStore.getState().undo("sat");

      const state = useFormationStore.getState();
      expect(state.drafts.sat).toBe(ONE_MATCH);
      expect(state.history.sat).toEqual([]);
    });

    it("bước đầu tiên của ngày thì bỏ hẳn nháp, quay về bản đã lưu", () => {
      const { setDraft, pushUndo } = useFormationStore.getState();
      pushUndo("sat", { draft: undefined, matchIndex: 0, mergeKey: null });
      setDraft("sat", EDITED);

      useFormationStore.getState().undo("sat");

      expect(useFormationStore.getState().drafts.sat).toBeUndefined();
    });

    it("mở lại đúng trận vừa sửa, để thấy được thứ vừa hoàn tác", () => {
      const { setDraft, pushUndo, setActiveMatch } = useFormationStore.getState();
      pushUndo("sat", { draft: ONE_MATCH, matchIndex: 1, mergeKey: null });
      setDraft("sat", EDITED);
      setActiveMatch(0);

      useFormationStore.getState().undo("sat");

      expect(useFormationStore.getState().activeMatchIndex).toBe(1);
    });

    it("các bước liền nhau cùng mergeKey gộp làm một, giữ trạng thái trước bước đầu", () => {
      const { pushUndo } = useFormationStore.getState();
      pushUndo("sat", { draft: undefined, matchIndex: 0, mergeKey: "note" });
      pushUndo("sat", { draft: EDITED, matchIndex: 0, mergeKey: "note" });

      expect(useFormationStore.getState().history.sat).toEqual([
        { draft: undefined, matchIndex: 0, mergeKey: "note" },
      ]);
    });

    it("mergeKey null thì luôn là một bước riêng", () => {
      const { pushUndo } = useFormationStore.getState();
      pushUndo("sat", { draft: undefined, matchIndex: 0, mergeKey: null });
      pushUndo("sat", { draft: EDITED, matchIndex: 0, mergeKey: null });

      expect(useFormationStore.getState().history.sat).toHaveLength(2);
    });

    it("không còn bước nào thì không đổi gì", () => {
      useFormationStore.getState().setDraft("sat", EDITED);

      useFormationStore.getState().undo("sat");

      expect(useFormationStore.getState().drafts.sat).toBe(EDITED);
    });

    it("lịch sử của từng ngày tách biệt nhau", () => {
      const { setDraft, pushUndo } = useFormationStore.getState();
      pushUndo("sat", { draft: undefined, matchIndex: 0, mergeKey: null });
      setDraft("sat", EDITED);
      pushUndo("thu", { draft: undefined, matchIndex: 0, mergeKey: null });
      setDraft("thu", EDITED);

      useFormationStore.getState().undo("sat");

      const state = useFormationStore.getState();
      expect(state.drafts.sat).toBeUndefined();
      expect(state.drafts.thu).toBe(EDITED);
    });

    it("clearDraft bỏ luôn lịch sử của ngày đó", () => {
      const { setDraft, pushUndo, clearDraft } = useFormationStore.getState();
      pushUndo("sat", { draft: undefined, matchIndex: 0, mergeKey: null });
      setDraft("sat", EDITED);

      clearDraft("sat");

      expect(useFormationStore.getState().history.sat).toBeUndefined();
    });

    it("đổi tuần thì bỏ hết lịch sử của tuần cũ", () => {
      const { pushUndo, setWeek } = useFormationStore.getState();
      pushUndo("sat", { draft: undefined, matchIndex: 0, mergeKey: null });

      setWeek("2026-07-13T00:00:00.000Z");

      expect(useFormationStore.getState().history).toEqual({});
    });
  });
});
