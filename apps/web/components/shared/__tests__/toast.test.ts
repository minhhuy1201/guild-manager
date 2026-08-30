import { beforeEach, describe, expect, it, vi } from "vitest";

const success = vi.fn();
const error = vi.fn();

vi.mock("sonner", () => ({ toast: { success, error } }));

const { toastError, toastSuccess } = await import("../toast");

/**
 * Style object handed to the last sonner call, as a plain string record.
 * @param call - The mock that was expected to fire
 * @returns The custom properties of that toast's surface
 */
function styleOf(call: typeof success): Record<string, string> {
  const [, options] = call.mock.calls.at(-1) as [string, { style: object }];

  return options.style as Record<string, string>;
}

describe("toast", () => {
  beforeEach(() => {
    success.mockClear();
    error.mockClear();
  });

  it("toastSuccess đi qua sonner.success với đúng câu thông báo", () => {
    toastSuccess("Đã điểm danh.");

    expect(success).toHaveBeenCalledTimes(1);
    expect(success.mock.calls[0][0]).toBe("Đã điểm danh.");
    expect(error).not.toHaveBeenCalled();
  });

  it("toastError đi qua sonner.error, không phải sonner.success", () => {
    toastError("Hỏng rồi.");

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toBe("Hỏng rồi.");
    expect(success).not.toHaveBeenCalled();
  });

  it("nền của toast thành công là emerald pha loãng, chữ và viền là chính accent đó", () => {
    toastSuccess("Xong.");
    const style = styleOf(success);

    expect(style["--normal-text"]).toBe("var(--color-emerald-600)");
    expect(style["--normal-border"]).toBe("var(--color-emerald-600)");
    expect(style["--normal-bg"]).toBe(
      "color-mix(in oklab, var(--color-emerald-600) 10%, var(--background))"
    );
  });

  it("toast lỗi dùng accent destructive của app", () => {
    toastError("Hỏng.");
    const style = styleOf(error);

    expect(style["--normal-text"]).toBe("var(--destructive)");
    expect(style["--normal-border"]).toBe("var(--destructive)");
    expect(style["--normal-bg"]).toBe(
      "color-mix(in oklab, var(--destructive) 10%, var(--background))"
    );
  });

  it("không dùng biến palette green — Tailwind 4 không phát biến mà app không dùng", () => {
    toastSuccess("Xong.");

    expect(JSON.stringify(styleOf(success))).not.toContain("--color-green");
  });

  it("hai tone không dùng chung một accent", () => {
    toastSuccess("Xong.");
    toastError("Hỏng.");

    expect(styleOf(success)["--normal-text"]).not.toBe(
      styleOf(error)["--normal-text"]
    );
  });
});
