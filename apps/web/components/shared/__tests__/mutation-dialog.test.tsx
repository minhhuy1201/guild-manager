// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";
import { MutationDialog, type MutationDialogProps } from "../mutation-dialog";

// The dialog mounts in a portal; a leftover one gives the next case two buttons with the same name.
afterEach(cleanup);

// React only batches and flushes state updates inside act() when it knows it is under test;
// without this flag a mutation's error does not reach the assertion in time.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const SUBMIT_LABEL = "Xoá thành viên";
const PENDING_LABEL = "Đang xoá…";
const FALLBACK = "Không xoá được thành viên này.";

/**
 * Render a MutationDialog with everything a case needs already filled in.
 * @param overrides - Props this case cares about
 * @returns The render result plus the onOpenChange spy
 */
function renderDialog(overrides: Partial<MutationDialogProps> = {}) {
  const onOpenChange = vi.fn();
  const props: MutationDialogProps = {
    open: true,
    onOpenChange,
    title: "Xoá Mèo Mập?",
    submitLabel: SUBMIT_LABEL,
    pendingLabel: PENDING_LABEL,
    submitIcon: null,
    fallbackError: FALLBACK,
    run: async () => {},
    showCancel: true,
    ...overrides,
  };

  const view = render(<MutationDialog {...props} />);

  return { ...view, onOpenChange, props };
}

/** Click the confirm button. */
function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }));
}

describe("MutationDialog", () => {
  it("run xong êm thì dialog đóng", async () => {
    const { onOpenChange } = renderDialog({ run: async () => {} });

    clickSubmit();

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("ApiError thì giữ dialog và hiện nguyên văn message của backend", async () => {
    const message = "Không xoá được vì thành viên còn lịch sử điểm danh.";
    const { onOpenChange } = renderDialog({
      run: async () => {
        throw new ApiError(message, 409);
      },
    });

    clickSubmit();

    expect(await screen.findByText(message)).toBeDefined();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("lỗi không có message thì hiện câu fallback", async () => {
    renderDialog({
      run: async () => {
        throw new Error("");
      },
    });

    clickSubmit();

    expect(await screen.findByText(FALLBACK)).toBeDefined();
  });

  it("đang chạy thì nút bị khoá và đổi nhãn", async () => {
    let finish = () => {};
    renderDialog({
      run: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    });

    clickSubmit();

    const button = await screen.findByRole("button", { name: PENDING_LABEL });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    finish();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: PENDING_LABEL })).toBeNull()
    );
  });

  it("đang chạy thì yêu cầu đóng bị bỏ qua", async () => {
    let finish = () => {};
    const { onOpenChange } = renderDialog({
      run: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    });

    clickSubmit();
    await screen.findByRole("button", { name: PENDING_LABEL });

    // The corner X goes through the Dialog's onOpenChange — the path the shell guards.
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).not.toHaveBeenCalled();

    // The "Huỷ" button calls the caller directly, so it must disable itself.
    const cancel = screen.getByRole("button", { name: "Huỷ" });
    expect((cancel as HTMLButtonElement).disabled).toBe(true);

    finish();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("mở lại sau khi lỗi thì không còn lỗi cũ", async () => {
    const run = async () => {
      throw new ApiError("Máy chủ đang bận.", 503);
    };
    const { rerender, props } = renderDialog({ run });

    clickSubmit();
    expect(await screen.findByText("Máy chủ đang bận.")).toBeDefined();

    rerender(<MutationDialog {...props} run={run} open={false} />);
    rerender(<MutationDialog {...props} run={run} open />);

    expect(screen.queryByText("Máy chủ đang bận.")).toBeNull();
  });
});
