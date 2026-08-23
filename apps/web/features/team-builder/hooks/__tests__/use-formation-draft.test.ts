// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";
import { saveFormation } from "../../api/team-builder-api";
import { useFormationStore } from "../../store/formation-store";
import { useFormationDraft } from "../use-formation-draft";
import { makeSession, renderFormationHook } from "./render-formation-hook";

vi.mock("../../api/team-builder-api", () => ({ saveFormation: vi.fn() }));

const saveFormationMock = vi.mocked(saveFormation);

const SLOT = "team-1-pos-1";
const SESSION_ID = "session-1";

/** A day whose saved formation already places one character. */
const SAVED_SESSION = makeSession(SESSION_ID, {
  matches: [{ slots: { [SLOT]: "char-1" }, notes: {} }],
});

/**
 * Render `useFormationDraft` over one editable day that has a saved formation.
 * @param refetchFormations - Spy for the reload the 409 path triggers
 * @returns The testing-library render result
 */
function renderDraft(refetchFormations = vi.fn()) {
  return renderFormationHook(() =>
    useFormationDraft([SAVED_SESSION], SESSION_ID, true, refetchFormations)
  );
}

beforeEach(() => {
  saveFormationMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useFormationDraft — đọc bản đã lưu", () => {
  it("chưa sửa gì thì đọc thẳng bản đã lưu và không dirty", () => {
    const { result } = renderDraft();

    expect(result.current.matchCount).toBe(1);
    expect(result.current.assignment[SLOT]).toBe("char-1");
    expect(result.current.dirty).toBe(false);
  });

  it("ngày chưa xếp gì vẫn cho đúng một trận rỗng", () => {
    const { result } = renderFormationHook(() =>
      useFormationDraft([makeSession(SESSION_ID)], SESSION_ID, true, vi.fn())
    );

    expect(result.current.matchCount).toBe(1);
    expect(result.current.assignment[SLOT]).toBeNull();
  });
});

describe("useFormationDraft — thêm và xoá trận 2", () => {
  it("thêm trận 2 chép nguyên đội hình và ghi chú của trận 1, rồi mở trận 2", () => {
    const session = makeSession(SESSION_ID, {
      matches: [{ slots: { [SLOT]: "char-1" }, notes: { [SLOT]: "giữ buồng" } }],
    });
    const { result } = renderFormationHook(() =>
      useFormationDraft([session], SESSION_ID, true, vi.fn())
    );

    act(() => result.current.addMatch());

    expect(result.current.matchCount).toBe(2);
    expect(result.current.activeMatchIndex).toBe(1);
    expect(result.current.assignment[SLOT]).toBe("char-1");
    expect(result.current.notes[SLOT]).toBe("giữ buồng");
  });

  it("không cho thêm trận thứ ba", () => {
    const { result } = renderDraft();

    act(() => result.current.addMatch());
    act(() => result.current.addMatch());

    expect(result.current.matchCount).toBe(2);
    expect(result.current.canAddMatch).toBe(false);
  });

  it("ngày đã khoá thì không cho thêm trận", () => {
    const { result } = renderFormationHook(() =>
      useFormationDraft([SAVED_SESSION], SESSION_ID, false, vi.fn())
    );

    expect(result.current.canAddMatch).toBe(false);
  });

  it("xoá trận 2 quay về trận 1 và giữ nguyên đội hình trận 1", () => {
    const { result } = renderDraft();

    act(() => result.current.addMatch());
    act(() => result.current.removeMatch());

    expect(result.current.matchCount).toBe(1);
    expect(result.current.activeMatchIndex).toBe(0);
    expect(result.current.assignment[SLOT]).toBe("char-1");
  });
});

describe("useFormationDraft — cờ dirty", () => {
  it("thêm trận 2 là dirty", () => {
    const { result } = renderDraft();

    act(() => result.current.addMatch());

    expect(result.current.dirty).toBe(true);
    expect(result.current.dirtySessionIds.has(SESSION_ID)).toBe(true);
  });

  it("kéo người sang ô khác là dirty", () => {
    const { result } = renderDraft();

    act(() =>
      result.current.applyDrop({ kind: "slot", slotId: SLOT }, "char-1", {
        kind: "slot",
        slotId: "team-1-pos-2",
      })
    );

    expect(result.current.assignment["team-1-pos-2"]).toBe("char-1");
    expect(result.current.dirty).toBe(true);
  });

  it("sửa rồi hoàn tác về đúng bản lưu thì hết dirty", () => {
    const { result } = renderDraft();

    act(() =>
      result.current.applyDrop({ kind: "slot", slotId: SLOT }, "char-1", {
        kind: "slot",
        slotId: "team-1-pos-2",
      })
    );
    act(() =>
      result.current.applyDrop(
        { kind: "slot", slotId: "team-1-pos-2" },
        "char-1",
        { kind: "slot", slotId: SLOT }
      )
    );

    expect(result.current.dirty).toBe(false);
  });

  it("resetActive vứt nháp, quay lại bản đã lưu", () => {
    const { result } = renderDraft();

    act(() => result.current.setNote(SLOT, "vào sau"));
    expect(result.current.dirty).toBe(true);

    act(() => result.current.resetActive());

    expect(result.current.dirty).toBe(false);
    expect(result.current.notes[SLOT]).toBeUndefined();
  });

  it("clearActiveDraft dọn sạch ô nhưng giữ nguyên số trận", () => {
    const { result } = renderDraft();

    act(() => result.current.addMatch());
    act(() => result.current.clearActiveDraft());

    expect(result.current.matchCount).toBe(2);
    expect(result.current.assignment[SLOT]).toBeNull();
    expect(result.current.dirty).toBe(true);
  });
});

describe("useFormationDraft — lưu", () => {
  it("lưu thành công thì xoá nháp và hết dirty", async () => {
    saveFormationMock.mockResolvedValue(SAVED_SESSION);
    const { result } = renderDraft();

    act(() => result.current.setNote(SLOT, "vào sau"));
    await act(async () => {
      await result.current.handleSave();
    });

    // TanStack passes its own context as a second argument to mutationFn.
    expect(saveFormationMock).toHaveBeenCalledWith(
      {
        sessionId: SESSION_ID,
        matches: [{ slots: { [SLOT]: "char-1" }, notes: { [SLOT]: "vào sau" } }],
      },
      expect.anything()
    );
    expect(result.current.dirty).toBe(false);
  });

  it("lưu thất bại thì GIỮ nháp và hiện thông báo của backend", async () => {
    saveFormationMock.mockRejectedValue(new ApiError("Máy chủ bận.", 500));
    const { result } = renderDraft();

    act(() => result.current.setNote(SLOT, "vào sau"));
    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.notes[SLOT]).toBe("vào sau");
    expect(result.current.dirty).toBe(true);
    await waitFor(() =>
      expect(result.current.saveErrorMessage).toBe("Máy chủ bận.")
    );
  });

  it("409 — ngày vừa bị khoá: tải lại đội hình và vẫn giữ nháp", async () => {
    saveFormationMock.mockRejectedValue(new ApiError("Trận đã khoá.", 409));
    const refetchFormations = vi.fn();
    const { result } = renderDraft(refetchFormations);

    act(() => result.current.setNote(SLOT, "vào sau"));
    await act(async () => {
      await result.current.handleSave();
    });

    expect(refetchFormations).toHaveBeenCalledOnce();
    expect(result.current.dirty).toBe(true);
  });

  it("chưa chọn ngày nào thì không gọi API", async () => {
    const { result } = renderFormationHook(() =>
      useFormationDraft([], null, false, vi.fn())
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(saveFormationMock).not.toHaveBeenCalled();
  });
});

describe("useFormationDraft — nạp đề xuất và nền của lần ghi đầu", () => {
  it("seedFrom nạp đề xuất vào ngày chưa có nháp", () => {
    const { result } = renderFormationHook(() =>
      useFormationDraft([makeSession(SESSION_ID)], SESSION_ID, true, vi.fn())
    );

    act(() =>
      result.current.seedFrom([
        { assignment: { [SLOT]: "char-7" }, notes: { [SLOT]: "chép sang" } },
      ])
    );

    expect(result.current.assignment[SLOT]).toBe("char-7");
    expect(result.current.notes[SLOT]).toBe("chép sang");
  });

  it("seedFrom KHÔNG đè lên ngày người dùng đã sửa", () => {
    const { result } = renderDraft();

    act(() => result.current.setNote(SLOT, "vào sau"));
    act(() =>
      result.current.seedFrom([{ assignment: { [SLOT]: "char-7" }, notes: {} }])
    );

    expect(result.current.assignment[SLOT]).toBe("char-1");
    expect(result.current.notes[SLOT]).toBe("vào sau");
  });

  it("ghi chú đầu tiên dựng nháp từ bản đã lưu, không xoá đội hình đã lưu", () => {
    const { result } = renderDraft();

    act(() => result.current.setNote(SLOT, "vào sau"));

    expect(result.current.assignment[SLOT]).toBe("char-1");
    expect(result.current.notes[SLOT]).toBe("vào sau");
  });

  it("thả ra ngoài mọi vùng thì ngày vẫn không dirty", () => {
    const { result } = renderDraft();

    act(() =>
      result.current.applyDrop({ kind: "slot", slotId: SLOT }, "char-1", null)
    );

    expect(result.current.dirty).toBe(false);
    expect(result.current.assignment[SLOT]).toBe("char-1");
  });

  it("thao tác không đổi gì thì không để lại nháp nào cho ngày chưa sửa", () => {
    const { result } = renderDraft();

    act(() =>
      result.current.applyDrop({ kind: "slot", slotId: SLOT }, "char-1", null)
    );

    // Một nháp bằng y bản đã lưu sẽ che mất lần tải lại sau, và không có nút
    // nào bỏ được nó vì ngày vẫn sạch.
    expect(useFormationStore.getState().drafts[SESSION_ID]).toBeUndefined();
  });

  it("thao tác không đổi gì KHÔNG vứt mất nháp người dùng đang sửa dở", () => {
    const { result } = renderDraft();

    act(() => result.current.setNote(SLOT, "vào sau"));
    act(() =>
      result.current.applyDrop({ kind: "slot", slotId: SLOT }, "char-1", null)
    );

    expect(result.current.notes[SLOT]).toBe("vào sau");
    expect(result.current.dirty).toBe(true);
  });
});
