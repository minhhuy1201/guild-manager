// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSessionSelection } from "../use-session-selection";
import { makeSession, renderFormationHook } from "./render-formation-hook";

const SESSIONS = [
  makeSession("thu-4"),
  makeSession("thu-7", { isGuildWar: true }),
];

describe("useSessionSelection", () => {
  it("chưa chọn gì thì mở tab Guild War", () => {
    const { result } = renderFormationHook(() =>
      useSessionSelection(SESSIONS, true)
    );

    expect(result.current.activeSessionId).toBe("thu-7");
    expect(result.current.activeSession?.sessionId).toBe("thu-7");
  });

  it("tuần không có Guild War thì mở ngày đầu tiên", () => {
    const { result } = renderFormationHook(() =>
      useSessionSelection([makeSession("thu-4"), makeSession("thu-5")], true)
    );

    expect(result.current.activeSessionId).toBe("thu-4");
  });

  it("giữ ngày người dùng đã chọn", () => {
    const { result } = renderFormationHook(() =>
      useSessionSelection(SESSIONS, true)
    );

    act(() => result.current.setActiveSession("thu-4"));

    expect(result.current.activeSessionId).toBe("thu-4");
  });

  it("ngày đã chọn không còn trong danh sách thì rơi về mặc định", () => {
    const { result } = renderFormationHook(
      () => useSessionSelection(SESSIONS, true),
      { formation: { activeSessionId: "ngay-da-xoa" } }
    );

    expect(result.current.activeSessionId).toBe("thu-7");
  });

  it("tuần rỗng thì không có ngày nào mở và không cho sửa", () => {
    const { result } = renderFormationHook(() => useSessionSelection([], true));

    expect(result.current.activeSessionId).toBeNull();
    expect(result.current.activeSession).toBeUndefined();
    expect(result.current.editable).toBe(false);
  });

  it("tuần đã đóng thì ngày cũng không cho sửa", () => {
    const { result } = renderFormationHook(() =>
      useSessionSelection(SESSIONS, false)
    );

    expect(result.current.editable).toBe(false);
  });

  it("ngày đã khoá thì không cho sửa dù tuần còn mở", () => {
    const { result } = renderFormationHook(() =>
      useSessionSelection([makeSession("thu-4", { locked: true })], true)
    );

    expect(result.current.editable).toBe(false);
  });

  it("tuần mở và ngày chưa khoá thì cho sửa", () => {
    const { result } = renderFormationHook(() =>
      useSessionSelection(SESSIONS, true)
    );

    expect(result.current.editable).toBe(true);
  });
});
