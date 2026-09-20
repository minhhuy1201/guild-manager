// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TacticSummary } from "@guild/shared/schemas";

let tactics: TacticSummary[] = [];
let isPending = false;
let isError = false;

vi.mock("../hooks/use-tactics", () => ({
  useTactics: () => ({
    data: tactics,
    isPending,
    isError,
    error: null,
    refetch: vi.fn(),
  }),
}));
const deleteTactic = vi.fn();

vi.mock("../hooks/use-tactic-mutations", () => ({
  useCreateTactic: () => ({ mutateAsync: vi.fn() }),
  useUpdateTactic: () => ({ mutateAsync: vi.fn() }),
  useDeleteTactic: () => ({ mutateAsync: deleteTactic }),
}));

vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));

import { TacticListScreen } from "../components/tactic-list-screen";

afterEach(cleanup);

beforeEach(() => {
  deleteTactic.mockReset().mockResolvedValue(undefined);
  isPending = false;
  isError = false;
  tactics = [
    {
      id: "t1",
      name: "Thủ cổng tây",
      description: "Giữ cổng 3 phút đầu",
      stageCount: 3,
      updatedAt: "2026-09-20T10:00:00.000Z",
    },
  ];
});

describe("TacticListScreen", () => {
  it("lists a tactic with its stage count", () => {
    render(<TacticListScreen isAdmin={false} />);

    expect(screen.getByText("Thủ cổng tây")).toBeTruthy();
    expect(screen.getByText("3 giai đoạn")).toBeTruthy();
  });

  it("links each tactic to its own page", () => {
    render(<TacticListScreen isAdmin={false} />);

    expect(
      screen.getByRole("link", { name: /Thủ cổng tây/ }).getAttribute("href")
    ).toBe("/chien-thuat/t1");
  });

  it("hides the write actions from a member", () => {
    render(<TacticListScreen isAdmin={false} />);

    expect(screen.queryByRole("button", { name: "Tạo chiến thuật" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xoá" })).toBeNull();
  });

  it("shows the write actions to an admin", () => {
    render(<TacticListScreen isAdmin />);

    expect(screen.getByRole("button", { name: "Tạo chiến thuật" })).toBeTruthy();
  });

  it("shows a skeleton while the list is loading", () => {
    isPending = true;

    const { container } = render(<TacticListScreen isAdmin={false} />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Thủ cổng tây")).toBeNull();
  });

  it("shows the failure instead of the list", () => {
    isError = true;

    render(<TacticListScreen isAdmin={false} />);

    expect(
      screen.getByText("Không tải được danh sách chiến thuật.")
    ).toBeTruthy();
  });

  it("deletes a tactic once the admin confirms", async () => {
    render(<TacticListScreen isAdmin />);

    fireEvent.click(screen.getByRole("button", { name: "Xoá chiến thuật" }));
    expect(screen.getByText(/Bản vẽ sẽ mất hẳn/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Xoá" }));

    await waitFor(() => expect(deleteTactic).toHaveBeenCalledWith("t1"));
  });

  it("opens the rename dialog on the tactic's row", () => {
    render(<TacticListScreen isAdmin />);

    fireEvent.click(screen.getByRole("button", { name: "Sửa chiến thuật" }));

    // The row's button carries the same words, so the dialog is found by its heading role.
    expect(
      screen.getByRole("heading", { name: "Sửa chiến thuật" })
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Tên chiến thuật") as HTMLInputElement).value
    ).toBe("Thủ cổng tây");
  });

  it("says so when the guild has drawn nothing yet", () => {
    tactics = [];

    render(<TacticListScreen isAdmin={false} />);

    expect(screen.getByText("Chưa có chiến thuật nào.")).toBeTruthy();
  });
});
