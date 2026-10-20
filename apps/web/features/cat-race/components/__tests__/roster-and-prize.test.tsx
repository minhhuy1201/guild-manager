// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatRaceMode, GuildClass, PrizeTier } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

const m = vi.hoisted(() => ({
  setParticipants: vi.fn(),
  setEntrants: vi.fn(),
  addPrize: vi.fn(),
  updatePrize: vi.fn(),
}));

vi.mock("../../hooks/use-cat-race-mutations", () => ({
  useSetCatRaceParticipants: () => ({ mutateAsync: m.setParticipants }),
  useSetCatRaceEntrants: () => ({ mutateAsync: m.setEntrants }),
  useAddCatRacePrize: () => ({ mutateAsync: m.addPrize }),
  useUpdateCatRacePrize: () => ({ mutateAsync: m.updatePrize }),
}));
vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));

import { EntrantsDialog } from "../entrants-dialog";
import { ParticipantsDialog } from "../participants-dialog";
import { PrizeChips } from "../prize-chips";
import { PrizeFormDialog } from "../prize-form-dialog";
import { RosterChecklist, type RosterSelection } from "../roster-checklist";
import { PRIZE, ROUND, makeEvent } from "./fixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Base UI positions the class picker's popup through floating-ui, which watches the anchor.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

const MEMBERS = [
  { characterId: "a", name: "Alice", guildClass: GuildClass.TO_VAN, note: "đã trúng" },
  { characterId: "b", name: "Bob", guildClass: GuildClass.TO_VAN },
  { characterId: "c", name: "Carol", guildClass: GuildClass.TO_VAN },
];

/**
 * Render the checklist and capture what it reports.
 * @param selection - Ticked ids
 * @param showTickets - TICKET mode
 * @returns The change spy
 */
function renderChecklist(selection: RosterSelection, showTickets = false) {
  const onChange = vi.fn();
  render(
    <RosterChecklist
      idPrefix="t"
      members={MEMBERS}
      selection={selection}
      showTickets={showTickets}
      onChange={onChange}
    />
  );

  return onChange;
}

describe("RosterChecklist", () => {
  it("counts the ticked people and prints a member's note", () => {
    renderChecklist(new Map([["a", 1]]));

    expect(screen.getByText("Đã chọn 1/3")).toBeTruthy();
    expect(screen.getByText("đã trúng")).toBeTruthy();
  });

  it("ticks an unticked person with one ticket and unticks a ticked one", () => {
    const onChange = renderChecklist(new Map([["a", 2]]));
    const boxes = screen.getAllByRole("checkbox").slice(1);

    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[0]);

    expect(onChange.mock.calls[0][0]).toEqual(new Map([["a", 2], ["b", 1]]));
    expect(onChange.mock.calls[1][0]).toEqual(new Map());
  });

  it("filters by the search text", () => {
    renderChecklist(new Map());

    fireEvent.change(screen.getByLabelText("Tìm kiếm"), { target: { value: "bo" } });

    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("filters by guild class", async () => {
    render(
      <RosterChecklist
        idPrefix="t"
        members={[
          { characterId: "a", name: "Alice", guildClass: GuildClass.TO_VAN },
          { characterId: "b", name: "Bob", guildClass: GuildClass.HUYET_HA },
        ]}
        selection={new Map()}
        showTickets={false}
        onChange={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Lưu phái"));
    });
    const option = await screen.findByRole("option", { name: /Huyết Hà/ });
    await act(async () => {
      fireEvent.pointerDown(option);
      fireEvent.pointerUp(option);
      fireEvent.mouseUp(option);
      fireEvent.click(option);
    });

    await waitFor(() => expect(screen.queryByText("Alice")).toBeNull());
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("ticks all visible people, keeping the tickets already set", () => {
    const onChange = renderChecklist(new Map([["a", 3]]));

    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả" }));

    expect(onChange.mock.calls[0][0]).toEqual(
      new Map([["a", 3], ["b", 1], ["c", 1]])
    );
  });

  it("unticks only the visible people", () => {
    const onChange = renderChecklist(new Map([["a", 1], ["b", 1]]));
    fireEvent.change(screen.getByLabelText("Tìm kiếm"), { target: { value: "bo" } });

    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả" }));

    expect(onChange.mock.calls[0][0]).toEqual(new Map([["a", 1]]));
  });

  it("keeps ticked people the search hides when ticking the visible ones", () => {
    const onChange = renderChecklist(new Map([["a", 2]]));
    fireEvent.change(screen.getByLabelText("Tìm kiếm"), { target: { value: "bo" } });

    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả" }));

    expect(onChange.mock.calls[0][0]).toEqual(new Map([["a", 2], ["b", 1]]));
  });

  it("marks the select-all box indeterminate on a partial selection", () => {
    renderChecklist(new Map([["a", 1]]));

    const box = screen.getByRole("checkbox", { name: "Chọn tất cả" }) as HTMLInputElement;

    expect(box.indeterminate).toBe(true);
    expect(box.checked).toBe(false);
  });

  it("shows a ticket picker only for ticked rows in TICKET mode", () => {
    const onChange = renderChecklist(new Map([["a", 1]]), true);

    expect(screen.queryByRole("group", { name: "Số vé của Bob" })).toBeNull();
    fireEvent.click(within(screen.getByRole("group", { name: "Số vé của Alice" })).getByText("3"));

    expect(onChange.mock.calls[0][0]).toEqual(new Map([["a", 3]]));
  });
});

describe("PrizeChips", () => {
  const handlers = () => ({
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAdd: vi.fn(),
  });

  it("names each prize's tier on its chip for screen readers", () => {
    render(<PrizeChips event={makeEvent()} selectedPrizeId="p1" canEdit {...handlers()} />);

    expect(screen.getByText("Đặc biệt")).toBeTruthy();
  });

  it("selects, edits, deletes and adds", () => {
    const h = handlers();
    render(<PrizeChips event={makeEvent()} selectedPrizeId="p1" canEdit {...h} />);

    fireEvent.click(screen.getByText("Tiền mặt 0/2"));
    fireEvent.click(screen.getByLabelText("Sửa hạng mục Tiền mặt"));
    fireEvent.click(screen.getByLabelText("Xoá hạng mục Tiền mặt"));
    fireEvent.click(screen.getByRole("button", { name: /Hạng mục$/ }));

    expect(h.onSelect).toHaveBeenCalledWith(PRIZE);
    expect(h.onEdit).toHaveBeenCalledWith(PRIZE);
    expect(h.onDelete).toHaveBeenCalledWith(PRIZE);
    expect(h.onAdd).toHaveBeenCalled();
  });

  it("hides delete once the prize has a round", () => {
    render(
      <PrizeChips
        event={makeEvent({ rounds: [ROUND] })}
        selectedPrizeId={null}
        canEdit
        {...handlers()}
      />
    );

    expect(screen.queryByLabelText("Xoá hạng mục Tiền mặt")).toBeNull();
  });

  it("says in words why a prize is locked and hides every write when read-only", () => {
    render(
      <PrizeChips
        event={makeEvent({ prizes: [{ ...PRIZE, awardedCount: 2 }] })}
        selectedPrizeId={null}
        canEdit={false}
        {...handlers()}
      />
    );

    expect(screen.getByText("Hạng mục đã đủ giải.")).toBeTruthy();
    expect(screen.queryByLabelText("Sửa hạng mục Tiền mặt")).toBeNull();
    expect(screen.queryByRole("button", { name: /Hạng mục$/ })).toBeNull();
  });
});

describe("PrizeFormDialog", () => {
  it("adds a prize with the typed fields", async () => {
    m.addPrize.mockResolvedValue({});
    const onOpenChange = vi.fn();
    render(<PrizeFormDialog eventId="e1" open prize={null} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText("Tên hạng mục"), { target: { value: "Vé" } });
    fireEvent.change(screen.getByLabelText("Số lượng"), { target: { value: "3" } });
    expect(screen.getByText(/Chỉ đổi màu và icon hiển thị/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Thường" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(m.addPrize).toHaveBeenCalledWith({
      id: "e1",
      name: "Vé",
      quantity: 3,
      tier: PrizeTier.LOW,
    });
  });

  it("edits a prize, prefilled, and tells how many were awarded", async () => {
    m.updatePrize.mockResolvedValue({});
    render(
      <PrizeFormDialog
        eventId="e1"
        open
        prize={{ ...PRIZE, awardedCount: 1 }}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Đã trao 1/)).toBeTruthy();
    expect((screen.getByLabelText("Tên hạng mục") as HTMLInputElement).value).toBe("Tiền mặt");
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(m.updatePrize).toHaveBeenCalledWith({
        id: "e1",
        prizeId: "p1",
        name: "Tiền mặt",
        quantity: 2,
        tier: PrizeTier.HIGH,
      })
    );
  });
});

describe("ParticipantsDialog", () => {
  const characters = [
    { id: "a", name: "Alice", guildClass: GuildClass.TO_VAN },
    { id: "c", name: "Carol", guildClass: GuildClass.TO_VAN },
  ] as Character[];

  it("saves the ticked roster with one ticket each in STANDARD mode", async () => {
    m.setParticipants.mockResolvedValue({});
    const onOpenChange = vi.fn();
    render(
      <ParticipantsDialog
        event={makeEvent()}
        characters={characters}
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(screen.getAllByRole("checkbox")[2]);
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(m.setParticipants).toHaveBeenCalledWith({
      id: "e1",
      participants: [
        { characterId: "a", tickets: 1 },
        { characterId: "b", tickets: 1 },
        { characterId: "c", tickets: 1 },
      ],
    });
  });

  it("keeps each person's tickets in TICKET mode", async () => {
    m.setParticipants.mockResolvedValue({});
    const event = makeEvent({ mode: CatRaceMode.TICKET });
    event.participants[0].tickets = 3;
    render(
      <ParticipantsDialog event={event} characters={characters} open onOpenChange={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(m.setParticipants).toHaveBeenCalled());
    expect(m.setParticipants.mock.calls[0][0].participants).toEqual([
      { characterId: "a", tickets: 3 },
      { characterId: "b", tickets: 1 },
    ]);
  });
});

describe("EntrantsDialog", () => {
  it("labels who already won and saves the character ids", async () => {
    m.setEntrants.mockResolvedValue({});
    render(
      <EntrantsDialog
        event={makeEvent({ rounds: [ROUND] })}
        prize={PRIZE}
        open
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText("đã trúng")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("checkbox")[2]);
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(m.setEntrants).toHaveBeenCalledWith({
        id: "e1",
        prizeId: "p1",
        characterIds: ["a"],
      })
    );
  });

  it("does not label the winner of a voided round", () => {
    render(
      <EntrantsDialog
        event={makeEvent({ rounds: [{ ...ROUND, voidedAt: "2026-10-12T02:00:00.000Z" }] })}
        prize={PRIZE}
        open
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByText("đã trúng")).toBeNull();
  });
});
