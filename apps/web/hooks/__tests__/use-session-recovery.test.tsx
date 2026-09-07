// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";
import { useSessionRecovery } from "../use-session-recovery";

const refresh = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/shared/toast", () => ({ toastError }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSessionRecovery", () => {
  it("gặp 401 thì làm mới trang và nói phiên vừa được khôi phục", () => {
    // Server Action đọc cookie rồi gọi API thẳng; chỉ có proxy mới đổi được cặp token, mà proxy chỉ
    // chạy khi điều hướng. Bấm lại mà không điều hướng thì lỗi y hệt.
    const { result } = renderHook(() => useSessionRecovery());

    const handled = result.current(new ApiError("Bạn cần đăng nhập.", 401));

    expect(handled).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0][0]).toContain("Bấm lại");
  });

  it("lỗi khác thì không đụng gì, để caller tự báo", () => {
    const { result } = renderHook(() => useSessionRecovery());

    const handled = result.current(new ApiError("Đã quá hạn điểm danh.", 409));

    expect(handled).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });
});
