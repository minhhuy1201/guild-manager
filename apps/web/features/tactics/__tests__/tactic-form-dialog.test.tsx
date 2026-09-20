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
import type { TacticSummary } from "@guild/shared/schemas";

const createTactic = vi.fn();
const updateTactic = vi.fn();

vi.mock("../hooks/use-tactic-mutations", () => ({
  useCreateTactic: () => ({ mutateAsync: createTactic }),
  useUpdateTactic: () => ({ mutateAsync: updateTactic }),
  useDeleteTactic: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));

import { TacticFormDialog } from "../components/tactic-form-dialog";

afterEach(cleanup);

beforeEach(() => {
  createTactic.mockReset().mockResolvedValue(undefined);
  updateTactic.mockReset().mockResolvedValue(undefined);
});

const tactic: TacticSummary = {
  id: "t1",
  name: "Thủ cổng tây",
  description: "Giữ cổng 3 phút đầu",
  stageCount: 2,
  updatedAt: "2026-09-20T10:00:00.000Z",
};

/**
 * Render the dialog inside a fresh QueryClient.
 * @param editing - The tactic being renamed, or null to create one
 * @returns Nothing
 */
function renderDialog(editing: TacticSummary | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(TacticFormDialog, {
        open: true,
        tactic: editing,
        onOpenChange: vi.fn(),
      }) as ReactNode
    )
  );
}

describe("TacticFormDialog", () => {
  it("creates a tactic, leaving an empty description out of the body", async () => {
    renderDialog(null);

    expect(screen.getByText("Tạo chiến thuật")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tên chiến thuật"), {
      target: { value: "Thủ cổng tây" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(createTactic).toHaveBeenCalledWith({
        name: "Thủ cổng tây",
        description: undefined,
      })
    );
  });

  it("opens on the tactic's current values when renaming", () => {
    renderDialog(tactic);

    expect(screen.getByText("Sửa chiến thuật")).toBeTruthy();
    expect(
      (screen.getByLabelText("Tên chiến thuật") as HTMLInputElement).value
    ).toBe("Thủ cổng tây");
    expect(
      (screen.getByLabelText("Mô tả") as HTMLTextAreaElement).value
    ).toBe("Giữ cổng 3 phút đầu");
  });

  it("clears the description by sending null, not an empty string", async () => {
    renderDialog(tactic);

    fireEvent.change(screen.getByLabelText("Mô tả"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(updateTactic).toHaveBeenCalledWith({
        id: "t1",
        name: "Thủ cổng tây",
        description: null,
      })
    );
  });

  it("shows the backend's sentence when the write fails", async () => {
    createTactic.mockRejectedValue(
      new Error("Tên chiến thuật tối đa 80 ký tự.")
    );
    renderDialog(null);

    fireEvent.change(screen.getByLabelText("Tên chiến thuật"), {
      target: { value: "quá dài" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(screen.getByText("Tên chiến thuật tối đa 80 ký tự.")).toBeTruthy()
    );
  });
});
