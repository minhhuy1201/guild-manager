// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatRaceMode, GuildClass, PrizeTier } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

const m = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
  races: { current: {} as Record<string, unknown> },
  prefill: { current: {} as Record<string, unknown> },
  characters: { current: {} as Record<string, unknown> },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("../../hooks/use-cat-race-mutations", () => ({
  useCreateCatRace: () => ({ mutateAsync: m.create }),
}));
vi.mock("../../hooks/use-cat-races", () => ({
  useCatRaces: () => m.races.current,
  useCatRacePrefill: () => m.prefill.current,
}));
vi.mock("@/features/attendance", () => ({ useCharacters: () => m.characters.current }));
vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));
vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ actions }: { actions?: React.ReactNode }) => <div>{actions}</div>,
}));

import { CatRaceListScreen } from "../cat-race-list-screen";
import { CreateCatRaceDialog } from "../create-cat-race-dialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(cleanup);

const CHARACTERS = [
  { id: "a", name: "Alice", guildClass: GuildClass.TO_VAN },
  { id: "b", name: "Bob", guildClass: GuildClass.TO_VAN },
] as Character[];

/**
 * A resolved query.
 * @param data - Its data
 */
function ready(data: unknown) {
  return { data, isPending: false, isError: false, error: null, refetch: vi.fn() };
}

describe("CreateCatRaceDialog", () => {
  const prefill = [{ name: "Tiền mặt", quantity: 2, tier: PrizeTier.HIGH }];

  /** Go from the prizes step to the roster step. */
  const next = () => fireEvent.click(screen.getByRole("button", { name: /^Tiếp/ }));

  /** Render the dialog with the two characters. */
  function renderDialog(withPrefill = prefill) {
    const onOpenChange = vi.fn();
    render(
      <CreateCatRaceDialog
        open
        onOpenChange={onOpenChange}
        characters={CHARACTERS}
        prefill={withPrefill}
      />
    );

    return onOpenChange;
  }

  it("creates the event from the prefill and opens it", async () => {
    m.create.mockResolvedValue({ id: "e 9" });
    renderDialog();

    next();
    fireEvent.click(screen.getByRole("button", { name: "Tạo đợt" }));

    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/dua-meo/e%209"));
    expect(m.create).toHaveBeenCalledWith({
      name: undefined,
      mode: CatRaceMode.STANDARD,
      participants: [
        { characterId: "a", tickets: 1 },
        { characterId: "b", tickets: 1 },
      ],
      prizes: prefill,
    });
  });

  it("sends the typed name, the edited prize and the tickets in TICKET mode", async () => {
    m.create.mockResolvedValue({ id: "e1" });
    renderDialog();

    fireEvent.change(screen.getByLabelText("Tên đợt (không bắt buộc)"), { target: { value: "Tết" } });
    fireEvent.change(screen.getByLabelText("Tên hạng mục 1"), { target: { value: "Xe" } });
    fireEvent.change(screen.getByLabelText("Số lượng hạng mục 1"), { target: { value: "5" } });
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Độ quý của giải 1" }));
    const option = await screen.findByRole("option", { name: "Thường" });
    // Base UI commits an option on a click that follows a pointer press on it.
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    next();
    fireEvent.click(screen.getByRole("button", { name: "Vé" }));
    fireEvent.click(screen.getAllByRole("button", { name: "3" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Tạo đợt" }));

    await waitFor(() => expect(m.create).toHaveBeenCalled());
    expect(m.create.mock.calls[0][0]).toEqual({
      name: "Tết",
      mode: CatRaceMode.TICKET,
      participants: [
        { characterId: "a", tickets: 3 },
        { characterId: "b", tickets: 1 },
      ],
      prizes: [{ name: "Xe", quantity: 5, tier: PrizeTier.LOW }],
    });
  });

  it("starts with one blank prize and keeps at least one", () => {
    renderDialog([]);

    expect((screen.getByLabelText("Tên hạng mục 1") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Xoá hạng mục 1") as HTMLButtonElement).disabled).toBe(true);
  });

  it("adds and removes prizes", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Thêm hạng mục" }));
    expect(screen.getByLabelText("Tên hạng mục 2")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Xoá hạng mục 1"));

    expect(screen.queryByLabelText("Tên hạng mục 2")).toBeNull();
  });

  it("keeps the prizes and name after stepping back from the roster", () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText("Tên đợt (không bắt buộc)"), { target: { value: "Tết" } });
    next();
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));

    expect((screen.getByLabelText("Tên đợt (không bắt buộc)") as HTMLInputElement).value).toBe("Tết");
    expect((screen.getByLabelText("Tên hạng mục 1") as HTMLInputElement).value).toBe("Tiền mặt");
  });

  it("stays on the prizes step while a prize has no name", () => {
    renderDialog([]);

    next();

    expect(screen.getByLabelText("Tên hạng mục 1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tạo đợt" })).toBeNull();
  });

  it("explains the ticket mode on the roster step", () => {
    renderDialog();

    next();
    fireEvent.click(screen.getByRole("button", { name: "Vé" }));

    expect(screen.getByText(/Mỗi vé là 1 con mèo/)).toBeTruthy();
  });

  it("cancels without creating", () => {
    const onOpenChange = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /^Huỷ$/ }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(m.create).not.toHaveBeenCalled();
  });
});

describe("CatRaceListScreen", () => {
  const RACES = [
    { id: "e1", name: "Đợt mở", mode: CatRaceMode.STANDARD, status: "OPEN", createdAt: "2026-10-12T00:00:00.000Z", discordPostedAt: null, featured: false, awardedCount: 1 },
    { id: "e2", name: "Đợt xong", mode: CatRaceMode.TICKET, status: "ENDED", createdAt: "2026-10-11T00:00:00.000Z", discordPostedAt: null, featured: true, awardedCount: 2 },
    { id: "e3", name: "Đợt đã đăng", mode: CatRaceMode.STANDARD, status: "ENDED", createdAt: "2026-10-10T00:00:00.000Z", discordPostedAt: "2026-10-10T01:00:00.000Z", featured: false, awardedCount: 3 },
  ];

  /**
   * Set the three queries.
   * @param races - Races query
   */
  function setQueries(races: Record<string, unknown>) {
    m.races.current = races;
    m.prefill.current = ready([]);
    m.characters.current = ready(CHARACTERS);
  }

  it("lists every event with its state and links to it", () => {
    setQueries(ready(RACES));
    render(<CatRaceListScreen />);

    expect(screen.getByText("Đợt mở").closest("a")?.getAttribute("href")).toBe("/dua-meo/e1");
    expect(screen.getByText(/Đang mở/)).toBeTruthy();
    expect(screen.getByText(/Đã kết thúc/)).toBeTruthy();
    expect(screen.getByText(/Đã post/)).toBeTruthy();
  });

  it("badges only the featured events with Bảng vàng", () => {
    setQueries(ready(RACES));
    render(<CatRaceListScreen />);

    expect(screen.getAllByText("Bảng vàng")).toHaveLength(1);
    expect(
      screen.getByText("Đợt xong").closest("li")?.textContent?.includes("Bảng vàng")
    ).toBe(true);
  });

  it("says so when there is no event", () => {
    setQueries(ready([]));
    render(<CatRaceListScreen />);

    expect(screen.getByText("Chưa có đợt đua nào.")).toBeTruthy();
  });

  it("shows no create button while loading", () => {
    setQueries({ ...ready(undefined), isPending: true });
    render(<CatRaceListScreen />);

    expect(screen.queryByRole("button", { name: /Tạo đợt đua/ })).toBeNull();
  });

  it("shows the error and no create button when a query failed", () => {
    setQueries({ ...ready(undefined), isError: true });
    render(<CatRaceListScreen />);

    expect(screen.getByText("Không tải được danh sách đợt đua.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Tạo đợt đua/ })).toBeNull();
  });

  it("opens the create dialog", () => {
    setQueries(ready([]));
    render(<CatRaceListScreen />);

    fireEvent.click(screen.getByRole("button", { name: /Tạo đợt đua/ }));

    expect(screen.getByRole("button", { name: /^Tiếp/ })).toBeTruthy();
  });
});
