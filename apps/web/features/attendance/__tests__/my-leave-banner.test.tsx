// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Leave } from "@guild/shared/schemas";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
const cancel = vi.fn();
let leaves: Leave[] = [];

vi.mock("../hooks/use-leaves", () => ({
  useLeaves: () => ({ data: leaves }),
  useCancelLeave: () => ({
    mutateAsync: cancel,
    isPending: false,
    variables: undefined,
  }),
}));
vi.mock("@/features/auth", () => ({
  useSession: () => ({ data: { character: { id: "char-1" } } }),
}));
vi.mock("@/components/shared/toast", () => ({ toastSuccess, toastError }));

import { MyLeaveBanner } from "../components/my-leave-banner";

const leave = (overrides: Partial<Leave>): Leave => ({
  id: "l1",
  characterId: "char-1",
  startDate: "2026-10-05",
  endDate: "2026-10-12",
  reason: null,
  createdAt: "2026-10-04T05:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  cancel.mockReset().mockResolvedValue({});
  toastSuccess.mockReset();
  toastError.mockReset();
});
afterEach(cleanup);

describe("MyLeaveBanner", () => {
  it("chỉ hiện lần nghỉ của mình", () => {
    leaves = [
      leave({ id: "l1" }),
      leave({ id: "l2", characterId: "char-2", startDate: "2026-11-01", endDate: "2026-11-02" }),
    ];

    render(<MyLeaveBanner />);

    expect(screen.getByText("Bạn đang nghỉ 05/10 - 12/10")).toBeTruthy();
    expect(screen.queryByText(/01\/11/)).toBeNull();
  });

  it("không có lần nghỉ nào của mình thì không render gì", () => {
    leaves = [leave({ characterId: "char-2" })];

    const { container } = render(<MyLeaveBanner />);

    expect(container.firstChild).toBeNull();
  });

  it("bấm Hủy nghỉ gọi cancel với id lần nghỉ", async () => {
    leaves = [leave({ id: "l1" })];
    render(<MyLeaveBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Hủy nghỉ" }));

    await waitFor(() => expect(cancel).toHaveBeenCalledWith("l1"));
    expect(toastSuccess).toHaveBeenCalledWith("Đã hủy lần nghỉ.");
  });
});
