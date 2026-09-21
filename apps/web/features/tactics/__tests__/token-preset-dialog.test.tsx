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
import type { TacticTokenPreset } from "@guild/shared/schemas";

let presets: TacticTokenPreset[] = [];
const createPreset = vi.fn();
const deletePreset = vi.fn();

vi.mock("../hooks/use-token-presets", () => ({
  useTokenPresets: () => ({ data: presets, isPending: false }),
  useCreateTokenPreset: () => ({ mutateAsync: createPreset }),
  useDeleteTokenPreset: () => ({ mutateAsync: deletePreset }),
}));

vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));

import { TokenPresetDialog } from "../components/token-preset-dialog";

afterEach(cleanup);

beforeEach(() => {
  createPreset.mockReset().mockResolvedValue(undefined);
  deletePreset.mockReset().mockResolvedValue(undefined);
  presets = [{ id: "p1", label: "Đội cảm tử", icon: "skull", sortOrder: 1 }];
});

/**
 * Render the dialog inside a fresh QueryClient.
 * @returns Nothing
 */
function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(TokenPresetDialog, {
        open: true,
        onOpenChange: vi.fn(),
      }) as ReactNode
    )
  );
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
});
