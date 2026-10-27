// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AutoAttendStatus } from "@guild/shared/schemas";

import { ApiError } from "@/lib/api-client";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
const mutateAsync = vi.fn();
const recoverSession = vi.fn();
let query: { data?: AutoAttendStatus; error?: Error; isPending: boolean } = {
  isPending: false,
};

vi.mock("../hooks/use-auto-attend", () => ({
  useAutoAttend: () => query,
  useSetAutoAttend: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => recoverSession,
}));
vi.mock("@/components/shared/toast", () => ({ toastSuccess, toastError }));

import { AutoAttendToggle } from "../components/auto-attend-toggle";

const OFF: AutoAttendStatus = { enabled: false, enabledAt: null };
const ON: AutoAttendStatus = { enabled: true, enabledAt: "2026-10-20T01:00:00.000Z" };

/**
 * The switch of the control.
 * @returns The element with role switch
 */
function theSwitch(): HTMLElement {
  return screen.getByRole("switch", { name: /Tự động điểm danh/ });
}

beforeEach(() => {
  query = { data: OFF, isPending: false };
  mutateAsync.mockReset().mockResolvedValue({});
  recoverSession.mockReset().mockReturnValue(false);
  toastSuccess.mockReset();
  toastError.mockReset();
});
afterEach(cleanup);

describe("AutoAttendToggle", () => {
  it("hiện công tắc tắt khi chưa bật và bật khi đã bật", () => {
    const { unmount } = render(<AutoAttendToggle />);
    expect(theSwitch().getAttribute("aria-checked")).toBe("false");
    unmount();

    query = { data: ON, isPending: false };
    render(<AutoAttendToggle />);

    expect(theSwitch().getAttribute("aria-checked")).toBe("true");
  });

  it("không render gì khi tài khoản chưa có nhân vật (admin cứu hộ, API trả 404)", () => {
    query = {
      data: undefined,
      error: new ApiError("Không tìm thấy thành viên.", 404),
      isPending: false,
    };

    const { container } = render(<AutoAttendToggle />);

    expect(container.firstChild).toBeNull();
  });

  it("lỗi khác 404 thì nói ra, không âm thầm giấu công tắc", () => {
    query = {
      data: undefined,
      error: new ApiError("Máy chủ đang bận.", 500),
      isPending: false,
    };

    render(<AutoAttendToggle />);

    expect(screen.getByText("Máy chủ đang bận.")).toBeTruthy();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("đọc trạng thái bị 401 thì chuyển cho recoverSession", () => {
    const error = new ApiError("Hết phiên.", 401);
    query = { data: undefined, error, isPending: false };

    render(<AutoAttendToggle />);

    expect(recoverSession).toHaveBeenCalledWith(error);
  });

  it("đang tải thì hiện khung chờ, chưa có công tắc", () => {
    query = { data: undefined, isPending: true };

    render(<AutoAttendToggle />);

    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("bật thì hỏi xác nhận trước, chưa gọi API", () => {
    render(<AutoAttendToggle />);

    fireEvent.click(theSwitch());

    expect(screen.getByText("Bật tự động điểm danh?")).toBeTruthy();
    expect(screen.getByText(/Mọi trận đánh trong tương lai sẽ được tự động điểm danh/)).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('bấm "Để sau" thì không gọi API và công tắc vẫn tắt', async () => {
    render(<AutoAttendToggle />);
    fireEvent.click(theSwitch());

    fireEvent.click(screen.getByRole("button", { name: /Để sau/ }));

    await waitFor(() => expect(screen.queryByText("Bật tự động điểm danh?")).toBeNull());
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(theSwitch().getAttribute("aria-checked")).toBe("false");
  });

  it('bấm "Bật" trong hộp thoại thì gọi API bật và báo thành công', async () => {
    render(<AutoAttendToggle />);
    fireEvent.click(theSwitch());

    fireEvent.click(screen.getByRole("button", { name: /^Bật$/ }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(true));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Đã bật tự động điểm danh."));
  });

  it("tắt thì gọi API ngay, không hỏi", async () => {
    query = { data: ON, isPending: false };
    render(<AutoAttendToggle />);

    fireEvent.click(theSwitch());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(false));
    expect(screen.queryByText("Bật tự động điểm danh?")).toBeNull();
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Đã tắt tự động điểm danh."));
  });

  it("tắt thất bại thì báo bằng câu của backend, không báo thành công", async () => {
    query = { data: ON, isPending: false };
    mutateAsync.mockRejectedValue(new Error("Không tìm thấy thành viên."));
    render(<AutoAttendToggle />);

    fireEvent.click(theSwitch());

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Không tìm thấy thành viên."));
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("phiên hết hạn thì để recoverSession lo, không hiện lỗi riêng", async () => {
    query = { data: ON, isPending: false };
    mutateAsync.mockRejectedValue(new Error("hết hạn"));
    recoverSession.mockReturnValue(true);
    render(<AutoAttendToggle />);

    fireEvent.click(theSwitch());

    await waitFor(() => expect(recoverSession).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
  });
});
