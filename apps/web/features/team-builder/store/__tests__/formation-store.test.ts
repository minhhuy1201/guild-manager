import { beforeEach, describe, expect, it } from "vitest";

import type { Assignment } from "../../types/formation";
import { useFormationStore } from "../formation-store";

const SAVED: Assignment = {
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
};

describe("useFormationStore", () => {
  beforeEach(() => {
    useFormationStore.setState({
      drafts: {},
      activeSessionId: null,
      selectedWeekStart: null,
    });
  });

  it("kéo thả lần đầu thì dựng nháp từ bản đã lưu", () => {
    useFormationStore
      .getState()
      .drop("sat", SAVED, { kind: "pool" }, "char-9", {
        kind: "slot",
        slotId: "team-1-pos-2",
      });

    expect(useFormationStore.getState().drafts.sat).toEqual({
      "team-1-pos-1": "char-1",
      "team-1-pos-2": "char-9",
    });
  });

  it("giữ nháp của từng trận tách biệt nhau", () => {
    const { drop } = useFormationStore.getState();
    drop("sat", SAVED, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });
    drop("thu", SAVED, { kind: "pool" }, "char-8", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });

    const { drafts } = useFormationStore.getState();
    expect(drafts.sat["team-1-pos-2"]).toBe("char-9");
    expect(drafts.thu["team-1-pos-2"]).toBe("char-8");
  });

  it("thả ra ngoài mọi vùng thì không tạo nháp", () => {
    useFormationStore
      .getState()
      .drop("sat", SAVED, { kind: "pool" }, "char-9", null);

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("clearDraft bỏ nháp để quay về bản đã lưu", () => {
    const { drop, clearDraft } = useFormationStore.getState();
    drop("sat", SAVED, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });
    clearDraft("sat");

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("setDraft ghi thẳng một nháp (dùng cho điền sẵn)", () => {
    useFormationStore.getState().setDraft("thu", SAVED);

    expect(useFormationStore.getState().drafts.thu).toEqual(SAVED);
  });

  it("đổi tuần thì bỏ hết nháp của tuần cũ", () => {
    const { setDraft, setWeek } = useFormationStore.getState();
    setDraft("sat", SAVED);
    setWeek("2026-07-13T00:00:00.000Z");

    const state = useFormationStore.getState();
    expect(state.drafts).toEqual({});
    expect(state.selectedWeekStart).toBe("2026-07-13T00:00:00.000Z");
  });
});
