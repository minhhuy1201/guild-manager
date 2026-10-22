// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEAM_IMAGE_MAX_CHARS } from "@guild/shared/schemas";
import type { TeamNoticeReport } from "@guild/shared/schemas";

import { toastError, toastSuccess } from "@/components/shared/toast";
import { announceFormation, notifyTeamMembers } from "../../api/team-builder-api";
import {
  CaptureCountError,
  captureFormations,
  captureTeamImages,
} from "../../lib/announce-capture";
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
  captureTeamImages: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/components/shared/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const recoverSession = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => recoverSession,
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

const TEAM_IMAGE = { matchIndex: 1, team: 1, image: "data:image/webp;base64,AQID" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(captureTeamImages).mockResolvedValue([]);
  recoverSession.mockReturnValue(false);
  announceMock.mockResolvedValue({ ok: true, data: { imageCount: 1 } });
  notifyMock.mockResolvedValue({ ok: true, data: REPORT });
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
    expect(notifyMock).toHaveBeenCalledWith({
      sessionId: "session-1",
      notices: undefined,
      teamImages: [],
    });
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
    announceMock.mockResolvedValue({ ok: false, message: "Bot chưa có quyền.", statusCode: 400 });
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());

    expect(notifyMock).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Bot chưa có quyền.");
    expect(result.current.outcome).toBeNull();
  });

  it("nhắn riêng lỗi thì tin channel vẫn tính là đã đăng, lỗi nằm trong dialog", async () => {
    notifyMock.mockResolvedValue({ ok: false, message: "Ngày này chưa đóng điểm danh.", statusCode: 400 });
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

describe("useFormationAnnounce - ảnh team", () => {
  it("chụp ảnh team chỉ sau khi announce đã thành công", async () => {
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());

    expect(announceMock.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(captureTeamImages).mock.invocationCallOrder[0]
    );
    expect(notifyMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(captureTeamImages).mock.invocationCallOrder[0]
    );
  });

  it("announce lỗi thì không chụp ảnh team", async () => {
    announceMock.mockResolvedValue({ ok: false, message: "Bot chưa có quyền.", statusCode: 400 });
    const { result } = renderAnnounce();

    await act(() => result.current.confirm());

    expect(captureTeamImages).not.toHaveBeenCalled();
  });

  it("tắt nhắn riêng thì không chụp ảnh team", async () => {
    const { result } = renderAnnounce();

    act(() => result.current.setNotifyMembers(false));
    await act(() => result.current.confirm());

    expect(captureTeamImages).not.toHaveBeenCalled();
  });

  it("lần đầu chụp mọi card có người và gửi ảnh trong request notify-members", async () => {
    vi.mocked(captureTeamImages).mockResolvedValue([TEAM_IMAGE]);
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());

    expect(captureTeamImages).toHaveBeenCalledWith(undefined);
    expect(notifyMock).toHaveBeenCalledWith({
      sessionId: "session-1",
      notices: undefined,
      teamImages: [TEAM_IMAGE],
    });
  });

  it("chụp ảnh team lỗi vẫn nhắn riêng, không kèm ảnh và không toast lỗi", async () => {
    vi.mocked(captureTeamImages).mockRejectedValue(new Error("snapDOM"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());

    expect(notifyMock).toHaveBeenCalledWith({
      sessionId: "session-1",
      notices: undefined,
      teamImages: [],
    });
    expect(toastError).not.toHaveBeenCalled();
    expect(result.current.outcome).toEqual({ report: REPORT, error: null });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("bỏ ảnh quá cỡ khỏi request, giữ ảnh còn lại và cảnh báo ở console", async () => {
    const huge = { matchIndex: 1, team: 2, image: `data:image/webp;base64,${"A".repeat(TEAM_IMAGE_MAX_CHARS)}` };
    vi.mocked(captureTeamImages).mockResolvedValue([TEAM_IMAGE, huge]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());

    expect(notifyMock).toHaveBeenCalledWith({
      sessionId: "session-1",
      notices: undefined,
      teamImages: [TEAM_IMAGE],
    });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("nhắn lại chỉ chụp các card chứa người trong notices", async () => {
    const asuna = { characterId: "asuna", name: "Asuna", matchIndex: 1 };
    notifyMock.mockResolvedValueOnce({ ok: true, data: { ...REPORT, totalCount: 2, unsent: [asuna] } });
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());
    vi.mocked(captureTeamImages).mockResolvedValue([TEAM_IMAGE]);
    await act(() => result.current.retry());

    expect(captureTeamImages).toHaveBeenLastCalledWith([{ characterId: "asuna", matchIndex: 1 }]);
    expect(notifyMock).toHaveBeenLastCalledWith({
      sessionId: "session-1",
      notices: [{ characterId: "asuna", matchIndex: 1 }],
      teamImages: [TEAM_IMAGE],
    });
  });

  it("thử lại cả lượt chụp lại mọi card có người", async () => {
    notifyMock.mockResolvedValueOnce({ ok: false, message: "Mất kết nối.", statusCode: 400 });
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());
    await act(() => result.current.retry());

    expect(captureTeamImages).toHaveBeenCalledTimes(2);
    expect(captureTeamImages).toHaveBeenLastCalledWith(undefined);
  });

  it("chụp lại lỗi khi nhắn lại thì vẫn gửi, không kèm ảnh", async () => {
    const asuna = { characterId: "asuna", name: "Asuna", matchIndex: 1 };
    notifyMock.mockResolvedValueOnce({ ok: true, data: { ...REPORT, totalCount: 2, unsent: [asuna] } });
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());
    vi.mocked(captureTeamImages).mockRejectedValue(new Error("snapDOM"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await act(() => result.current.retry());

    expect(notifyMock).toHaveBeenLastCalledWith({
      sessionId: "session-1",
      notices: [{ characterId: "asuna", matchIndex: 1 }],
      teamImages: [],
    });
    warn.mockRestore();
  });
});

describe("useFormationAnnounce - nhắn lại", () => {
  const ASUNA = { characterId: "asuna", name: "Asuna", matchIndex: 1 };
  const KLEIN = { characterId: "klein", name: "Klein", matchIndex: 2 };

  it("nhắn lại chỉ gửi cho người chưa nhắn được rồi gộp vào báo cáo cũ", async () => {
    notifyMock.mockResolvedValueOnce({ ok: true, data: {
      ...REPORT,
      sentCount: 1,
      totalCount: 3,
      unsent: [ASUNA, KLEIN],
    } });
    notifyMock.mockResolvedValueOnce({ ok: true, data: {
      ...REPORT,
      sentCount: 1,
      totalCount: 2,
      unsent: [KLEIN],
    } });
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());
    await act(() => result.current.retry());

    expect(notifyMock).toHaveBeenLastCalledWith({
      sessionId: "session-1",
      notices: [
        { characterId: "asuna", matchIndex: 1 },
        { characterId: "klein", matchIndex: 2 },
      ],
      teamImages: [],
    });
    expect(result.current.outcome?.report).toMatchObject({
      sentCount: 2,
      totalCount: 3,
      unsent: [KLEIN],
    });
  });

  it("request lỗi cả lượt thì thử lại gửi cho tất cả", async () => {
    notifyMock.mockResolvedValueOnce({ ok: false, message: "Mất kết nối.", statusCode: 400 });
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());
    await act(() => result.current.retry());

    expect(notifyMock).toHaveBeenLastCalledWith({
      sessionId: "session-1",
      notices: undefined,
      teamImages: [],
    });
    expect(result.current.outcome).toEqual({ report: REPORT, error: null });
  });

  it("thử lại cả lượt không đăng lại tin channel", async () => {
    notifyMock.mockResolvedValueOnce({ ok: false, message: "Mất kết nối.", statusCode: 400 });
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());
    await act(() => result.current.retry());

    expect(announceMock).toHaveBeenCalledOnce();
  });

  it("lần nhắn lại lỗi thì giữ danh sách cũ để còn thử tiếp", async () => {
    notifyMock.mockResolvedValueOnce({ ok: true, data: {
      ...REPORT,
      sentCount: 1,
      totalCount: 2,
      unsent: [ASUNA],
    } });
    notifyMock.mockResolvedValueOnce({ ok: false, message: "Mất kết nối.", statusCode: 400 });
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());
    await act(() => result.current.retry());

    expect(result.current.outcome).toMatchObject({
      report: { unsent: [ASUNA] },
      error: "Mất kết nối.",
    });
  });
});

describe("useFormationAnnounce - chụp ảnh và guard", () => {
  it("không làm gì khi chưa có ngày đánh", async () => {
    const { result } = renderFormationHook(() => useFormationAnnounce(null, 2, false));

    await act(() => result.current.confirm());

    expect(announceMock).not.toHaveBeenCalled();
  });

  it("không gửi khi còn thay đổi chưa lưu", async () => {
    const { result } = renderFormationHook(() => useFormationAnnounce("session-1", 2, true));

    await act(() => result.current.confirm());

    expect(announceMock).not.toHaveBeenCalled();
  });

  it("chụp lỗi thì báo chung chung và không gửi", async () => {
    vi.mocked(captureFormations).mockRejectedValueOnce(new Error("snapDOM: node #12"));
    const { result } = renderAnnounce();

    await act(() => result.current.confirm());

    expect(toastError).toHaveBeenCalledWith("Không chụp được ảnh đội hình.");
    expect(announceMock).not.toHaveBeenCalled();
    expect(result.current.sending).toBe(false);
  });

  it("chụp thiếu đội thì bảo đóng rồi mở lại", async () => {
    vi.mocked(captureFormations).mockRejectedValueOnce(new CaptureCountError(1, 2));
    const { result } = renderAnnounce();

    await act(() => result.current.confirm());

    expect(toastError).toHaveBeenCalledWith(
      "Chưa chụp được đủ đội hình của ngày này. Đóng rồi mở lại rồi gửi."
    );
  });

  it("hết phiên khi nhắn riêng thì báo bị gián đoạn thay vì lỗi của backend", async () => {
    recoverSession.mockReturnValue(true);
    notifyMock.mockResolvedValue({ ok: false, message: "Hết phiên", statusCode: 401 });
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());

    expect(result.current.outcome?.error).not.toBe("Hết phiên");
    expect(result.current.outcome?.error).toEqual(expect.any(String));
  });
});

describe("useFormationAnnounce - nhắn lại không có gì để gửi", () => {
  it("chưa có kết quả thì không nhắn lại", async () => {
    const { result } = renderAnnounce();

    await act(() => result.current.retry());

    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("báo cáo không còn ai chưa nhắn được thì không nhắn lại", async () => {
    const { result } = renderAnnounce();

    act(() => result.current.setOpen(true));
    await act(() => result.current.confirm());
    notifyMock.mockClear();
    await act(() => result.current.retry());

    expect(notifyMock).not.toHaveBeenCalled();
  });
});
