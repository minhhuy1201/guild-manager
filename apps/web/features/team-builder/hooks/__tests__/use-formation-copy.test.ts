// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormationWeek } from "@guild/shared/schemas";

import { toastSuccess } from "@/components/shared/toast";
import { fetchFormations } from "../../api/team-builder-api";
import type { MatchDraft } from "../../types/formation";
import { useFormationCopy } from "../use-formation-copy";
import { makeSession, renderFormationHook } from "./render-formation-hook";

vi.mock("../../api/team-builder-api", () => ({
  fetchFormationWeeks: vi.fn(),
  fetchFormations: vi.fn(),
  saveFormation: vi.fn(),
}));

vi.mock("@/components/shared/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const fetchFormationsMock = vi.mocked(fetchFormations);
const toastSuccessMock = vi.mocked(toastSuccess);

const SLOT = "team-1-pos-1";
const THIS_WEEK = "2026-08-17T00:00:00.000Z";
const LAST_WEEK = "2026-08-10T00:00:00.000Z";

const WEEKS: FormationWeek[] = [
  { weekStart: THIS_WEEK, weekEnd: "", isActive: true },
  { weekStart: LAST_WEEK, weekEnd: "", isActive: false },
];

const SESSIONS = [
  makeSession("thu-3", { label: "Thứ 3 · 20:30" }),
  makeSession("thu-5", { label: "Thứ 5 · 20:30" }),
];

/** Matches shown for the week: Thứ 3 holds a line-up, Thứ 5 is empty. */
const MATCHES: Record<string, MatchDraft[]> = {
  "thu-3": [{ assignment: { [SLOT]: "char-1" }, notes: { [SLOT]: "giữ cửa" } }],
  "thu-5": [{ assignment: { [SLOT]: null }, notes: {} }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useFormationCopy", () => {
  it("nhãn nút nói rõ ngày nguồn trong cùng tuần", () => {
    const { result } = renderFormationHook(() =>
      useFormationCopy(
        SESSIONS,
        "thu-5",
        true,
        WEEKS,
        THIS_WEEK,
        MATCHES,
        new Set(["char-1"]),
        vi.fn()
      )
    );

    expect(result.current.sourceLabel).toBe("Thứ 3 · 20:30");
    expect(result.current.canCopy).toBe(true);
    expect(fetchFormationsMock).not.toHaveBeenCalled();
  });

  it("copy ghi đội hình đã lọc người vắng vào nháp và báo toast", () => {
    const copyInto = vi.fn();
    const { result } = renderFormationHook(() =>
      useFormationCopy(
        SESSIONS,
        "thu-5",
        true,
        WEEKS,
        THIS_WEEK,
        MATCHES,
        new Set([]),
        copyInto
      )
    );

    act(() => result.current.copy());

    expect(copyInto).toHaveBeenCalledWith(
      expect.objectContaining({
        assignment: expect.objectContaining({ [SLOT]: null }),
        notes: { [SLOT]: "giữ cửa" },
      })
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Đã copy từ Thứ 3 · 20:30 · bỏ 1 người không đánh trận này. Chưa lưu."
    );
  });

  it("không ai bị bỏ thì câu thông báo không có vế đó", () => {
    const { result } = renderFormationHook(() =>
      useFormationCopy(
        SESSIONS,
        "thu-5",
        true,
        WEEKS,
        THIS_WEEK,
        MATCHES,
        new Set(["char-1"]),
        vi.fn()
      )
    );

    act(() => result.current.copy());

    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Đã copy từ Thứ 3 · 20:30. Chưa lưu."
    );
  });

  it("trận đầu tuần lấy nguồn từ trận cuối tuần trước", async () => {
    fetchFormationsMock.mockResolvedValue([
      makeSession("prev-sat", {
        label: "Thứ 7 · Bang Chiến",
        matches: [{ slots: { [SLOT]: "char-2" }, notes: {} }],
      }),
    ]);

    const { result } = renderFormationHook(() =>
      useFormationCopy(
        [SESSIONS[0]],
        "thu-3",
        true,
        WEEKS,
        THIS_WEEK,
        { "thu-3": [{ assignment: { [SLOT]: null }, notes: {} }] },
        new Set(["char-2"]),
        vi.fn()
      )
    );

    await waitFor(() =>
      expect(result.current.sourceLabel).toBe("Thứ 7 · Bang Chiến")
    );
    expect(fetchFormationsMock).toHaveBeenCalledWith(LAST_WEEK);
  });

  it("ngày đã đánh xong thì không copy được", () => {
    const copyInto = vi.fn();
    const { result } = renderFormationHook(() =>
      useFormationCopy(
        SESSIONS,
        "thu-5",
        false,
        WEEKS,
        THIS_WEEK,
        MATCHES,
        new Set(["char-1"]),
        copyInto
      )
    );

    act(() => result.current.copy());

    expect(result.current.canCopy).toBe(false);
    expect(copyInto).not.toHaveBeenCalled();
  });

  it("không có nguồn nào thì không có nhãn và copy là no-op", () => {
    const copyInto = vi.fn();
    const { result } = renderFormationHook(() =>
      useFormationCopy(
        [SESSIONS[1]],
        "thu-5",
        true,
        [WEEKS[0]],
        THIS_WEEK,
        MATCHES,
        new Set([]),
        copyInto
      )
    );

    act(() => result.current.copy());

    expect(result.current.sourceLabel).toBeNull();
    expect(result.current.canCopy).toBe(false);
    expect(copyInto).not.toHaveBeenCalled();
  });
});
