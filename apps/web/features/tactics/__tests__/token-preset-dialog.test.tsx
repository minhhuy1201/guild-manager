// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  TacticInsigniaEntry,
  TacticTokenPreset,
} from "@guild/shared/schemas";

let presets: TacticTokenPreset[] = [];
const createPreset = vi.fn();
const deletePreset = vi.fn();
let insignia: TacticInsigniaEntry[] | undefined;
const renameInsignia = vi.fn();
const resetInsignia = vi.fn();

vi.mock("../hooks/use-token-presets", () => ({
  useTokenPresets: () => ({ data: presets, isPending: false }),
  useCreateTokenPreset: () => ({ mutateAsync: createPreset }),
  useDeleteTokenPreset: () => ({ mutateAsync: deletePreset }),
}));

vi.mock("../hooks/use-tactic-insignia", () => ({
  useTacticInsignia: () => ({ data: insignia, isPending: false }),
  useRenameTacticInsignia: () => ({ mutateAsync: renameInsignia, isPending: false }),
  useResetTacticInsignia: () => ({ mutateAsync: resetInsignia, isPending: false }),
}));

const toastSuccess = vi.fn();

vi.mock("@/components/shared/toast", () => ({
  toastSuccess: (message: string) => toastSuccess(message),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));

import { TokenPresetDialog } from "../components/token-preset-dialog";

afterEach(cleanup);

beforeEach(() => {
  toastSuccess.mockReset();
  createPreset.mockReset().mockResolvedValue(undefined);
  deletePreset.mockReset().mockResolvedValue(undefined);
  renameInsignia.mockReset().mockImplementation(
    async ({ key, label }: { key: string; label: string }) => ({
      ...(insignia ?? []).find((entry) => entry.key === key),
      label,
    })
  );
  resetInsignia.mockReset().mockResolvedValue(undefined);
  insignia = [
    { key: "attack", icon: "swords", label: "Đội công", defaultLabel: "Đội công" },
    { key: "scout", icon: "eye", label: "Do thám", defaultLabel: "Trinh sát" },
  ];
  presets = [{ id: "p1", label: "Đội cảm tử", icon: "skull", sortOrder: 1 }];
});

/**
 * Render the dialog inside a fresh QueryClient.
 * @returns A rerender that draws the dialog again from the current mock data
 */
function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const tree = () =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(TokenPresetDialog, {
        open: true,
        onOpenChange: vi.fn(),
      }) as ReactNode
    );
  const { rerender } = render(tree());

  return () => rerender(tree());
}

describe("TokenPresetDialog", () => {
  it("sends the label and the picked icon", async () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText("Tên quân cờ"), {
      target: { value: "  Đội phá cổng  " },
    });
    fireEvent.click(screen.getByRole("radio", { name: "skull" }));
    fireEvent.click(screen.getByRole("button", { name: "Thêm" }));

    await waitFor(() =>
      expect(createPreset).toHaveBeenCalledWith({
        label: "Đội phá cổng",
        icon: "skull",
      })
    );
  });

  it("refuses an empty label without calling the API", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Thêm" }));

    await waitFor(() =>
      expect(
        screen.getByText("Tên quân cờ không được để trống.")
      ).toBeTruthy()
    );
    expect(createPreset).not.toHaveBeenCalled();
  });

  it("lists what is already saved and deletes one", async () => {
    renderDialog();

    expect(screen.getByText("Đội cảm tử")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Xoá Đội cảm tử" }));

    await waitFor(() => expect(deletePreset).toHaveBeenCalledWith("p1"));
  });

  it("shows the backend's sentence when the label is taken", async () => {
    createPreset.mockRejectedValue(new Error("Đã có quân cờ trùng tên."));
    renderDialog();

    fireEvent.change(screen.getByLabelText("Tên quân cờ"), {
      target: { value: "Đội cảm tử" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Thêm" }));

    await waitFor(() =>
      expect(screen.getByText("Đã có quân cờ trùng tên.")).toBeTruthy()
    );
  });

  it("says why a preset could not be deleted, inside the dialog", async () => {
    deletePreset.mockRejectedValue(new Error("Không tìm thấy quân cờ."));
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Xoá Đội cảm tử" }));

    await waitFor(() =>
      expect(screen.getByText("Không tìm thấy quân cờ.")).toBeTruthy()
    );
  });

  describe("Insignia names", () => {
    const scoutField = () => screen.getByLabelText("Tên quân hiệu Trinh sát");
    const attackField = () => screen.getByLabelText("Tên quân hiệu Đội công");

    it("shows each Insignia under its current name, with the default as placeholder", () => {
      renderDialog();

      expect((scoutField() as HTMLInputElement).value).toBe("Do thám");
      expect(scoutField().getAttribute("placeholder")).toBe("Trinh sát");
      expect((attackField() as HTMLInputElement).value).toBe("Đội công");
    });

    it("saves a row with Enter, without adding a preset", async () => {
      renderDialog();

      fireEvent.change(attackField(), { target: { value: "  Xung kích " } });
      fireEvent.keyDown(attackField(), { key: "Enter" });

      await waitFor(() =>
        expect(renameInsignia).toHaveBeenCalledWith({
          key: "attack",
          label: "Xung kích",
        })
      );
      expect(createPreset).not.toHaveBeenCalled();
    });

    it("saves a row with its tick button", async () => {
      renderDialog();

      fireEvent.change(attackField(), { target: { value: "Xung kích" } });
      fireEvent.click(screen.getByRole("button", { name: "Lưu tên Đội công" }));

      await waitFor(() =>
        expect(renameInsignia).toHaveBeenCalledWith({
          key: "attack",
          label: "Xung kích",
        })
      );
    });

    it("keeps the tick off until the name differs", () => {
      renderDialog();

      const tick = screen.getByRole("button", { name: "Lưu tên Đội công" });
      expect((tick as HTMLButtonElement).disabled).toBe(true);

      fireEvent.change(attackField(), { target: { value: "Xung kích" } });
      expect((tick as HTMLButtonElement).disabled).toBe(false);
    });

    it("drops an unsaved edit when focus leaves the field", () => {
      renderDialog();

      fireEvent.change(attackField(), { target: { value: "Xung kích" } });
      fireEvent.blur(attackField());

      expect((attackField() as HTMLInputElement).value).toBe("Đội công");
      expect(renameInsignia).not.toHaveBeenCalled();
    });

    it("keeps the edit when focus only moves to the row's own tick", () => {
      renderDialog();

      fireEvent.change(attackField(), { target: { value: "Xung kích" } });
      fireEvent.blur(attackField(), {
        relatedTarget: screen.getByRole("button", { name: "Lưu tên Đội công" }),
      });

      expect((attackField() as HTMLInputElement).value).toBe("Xung kích");
    });

    it("offers Khôi phục only on a renamed Insignia, and restores it", async () => {
      renderDialog();

      const restore = screen.getAllByRole("button", { name: "Khôi phục" });
      expect(restore).toHaveLength(1);

      fireEvent.click(restore[0]);

      await waitFor(() => expect(resetInsignia).toHaveBeenCalledWith("scout"));
      await waitFor(() =>
        expect((scoutField() as HTMLInputElement).value).toBe("Trinh sát")
      );
    });

    it("shows the 409 sentence on the row that was refused, and only there", async () => {
      renameInsignia.mockRejectedValue(new Error("Đã có quân cờ trùng tên."));
      renderDialog();

      fireEvent.change(attackField(), { target: { value: "Do thám" } });
      fireEvent.keyDown(attackField(), { key: "Enter" });

      await waitFor(() =>
        expect(screen.getAllByText("Đã có quân cờ trùng tên.")).toHaveLength(1)
      );
      expect((attackField() as HTMLInputElement).value).toBe("Do thám");
    });

    it("follows a rename made elsewhere, discarding the stale draft", () => {
      const rerender = renderDialog();

      fireEvent.change(scoutField(), { target: { value: "Nửa chừng" } });
      insignia = [
        insignia![0],
        { ...insignia![1], label: "Do thám 2" },
      ];
      rerender();

      expect((scoutField() as HTMLInputElement).value).toBe("Do thám 2");
    });

    it("names the label the server saved in the toast", async () => {
      renameInsignia.mockResolvedValue({
        key: "attack",
        icon: "swords",
        label: "Xung kích",
        defaultLabel: "Đội công",
      });
      renderDialog();

      fireEvent.change(attackField(), { target: { value: "  xung kích  " } });
      fireEvent.keyDown(attackField(), { key: "Enter" });

      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith(
          "Đã đổi tên Đội công thành Xung kích."
        )
      );
    });

    it("renders no Insignia section until the names arrive", () => {
      insignia = undefined;
      renderDialog();

      expect(screen.queryByText("Quân hiệu")).toBeNull();
    });
  });
});
