// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamNoticeReport } from "@guild/shared/schemas";

import { toastError, toastSuccess } from "@/components/shared/toast";
import { announceFormation, notifyTeamMembers } from "../../api/team-builder-api";
import { useFormationAnnounce } from "../use-formation-announce";
import { renderFormationHook } from "./render-formation-hook";

vi.mock("../../api/team-builder-api", () => ({
  announceFormation: vi.fn(),
  notifyTeamMembers: vi.fn(),
}));

vi.mock("../../lib/announce-capture", () => ({
  CaptureCountError: class CaptureCountError extends Error {},
  readCaptureNodes: vi.fn(() => []),
  captureFormations: vi.fn(() => Promise.resolve(["data:image/webp;base64,AQID"])),
}));

vi.mock("@/components/shared/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));

const announceMock = vi.mocked(announceFormation);
const notifyMock = vi.mocked(notifyTeamMembers);

const REPORT: TeamNoticeReport = {
  sentCount: 2,
  totalCount: 2,
  blocked: [],
  missingDiscordId: [],
  notPresent: [],
  unsent: [],
};

/**
 * Render the hook for a saved two-match day with nothing unsaved.
 * @returns The testing-library render result
 */
function renderAnnounce() {
  return renderFormationHook(() => useFormationAnnounce("session-1", 2, false));
}

beforeEach(() => {
  vi.clearAllMocks();
  announceMock.mockResolvedValue({ imageCount: 1 });
  notifyMock.mockResolvedValue(REPORT);
});

describe("useFormationAnnounce - nhắn riêng", () => {
  it("bật theo mặc định, và bật lại mỗi lần mở dialog", () => {
    const { result } = renderAnnounce();

    act(() => result.current.setNotifyMembers(false));
    act(() => result.current.setOpen(true));

    expect(result.current.notifyMembers).toBe(true);
  });

  it("đăng channel xong thì nhắn riêng và giữ báo cáo trong dialog", async () => {
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());

    expect(announceMock).toHaveBeenCalledOnce();
    expect(notifyMock).toHaveBeenCalledWith("session-1");
    expect(result.current.open).toBe(true);
    expect(result.current.outcome).toEqual({ report: REPORT, error: null });
    expect(toastSuccess).toHaveBeenCalledOnce();
  });

  it("tắt nhắn riêng thì chỉ đăng channel rồi đóng dialog", async () => {
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    act(() => result.current.setNotifyMembers(false));
    await act(() => result.current.confirm());

    expect(notifyMock).not.toHaveBeenCalled();
    expect(result.current.open).toBe(false);
    expect(result.current.outcome).toBeNull();
  });

  it("đăng channel lỗi thì không nhắn riêng", async () => {
    announceMock.mockRejectedValue(new Error("Bot chưa có quyền."));
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());

    expect(notifyMock).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Bot chưa có quyền.");
    expect(result.current.outcome).toBeNull();
  });

  it("nhắn riêng lỗi thì tin channel vẫn tính là đã đăng, lỗi nằm trong dialog", async () => {
    notifyMock.mockRejectedValue(new Error("Ngày này chưa đóng điểm danh."));
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());

    expect(toastSuccess).toHaveBeenCalledOnce();
    expect(result.current.outcome).toEqual({
      report: null,
      error: "Ngày này chưa đóng điểm danh.",
    });
  });

  it("mở lại dialog thì xoá báo cáo lần trước", async () => {
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());
    act(() => result.current.setOpen(false));
    act(() => result.current.setOpen(true));

    expect(result.current.outcome).toBeNull();
  });
});
