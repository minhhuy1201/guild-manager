// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TeamBuilderScreen } from "../team-builder-screen";

const { announceState, formationScreen } = vi.hoisted(() => ({
  announceState: { open: false, setOpen: vi.fn() },
  formationScreen: { value: {} as Record<string, unknown> },
}));

// Some child hooks reach the attendance barrel, which carries `server-only`; no action runs here.
vi.mock("server-only", () => ({}));
vi.mock("../../hooks/use-formation-screen", () => ({
  useFormationScreen: () => formationScreen.value,
}));
vi.mock("../../hooks/use-formation-announce", () => ({
  useFormationAnnounce: () => ({
    open: announceState.open,
    setOpen: announceState.setOpen,
    sending: false,
    notifyMembers: false,
    outcome: null,
    setNotifyMembers: vi.fn(),
    retry: vi.fn(),
    confirm: vi.fn(),
  }),
}));
vi.mock("../../hooks/use-save-shortcut", () => ({ useSaveShortcut: vi.fn() }));
vi.mock("../../hooks/use-undo-shortcut", () => ({ useUndoShortcut: vi.fn() }));
vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("../week-picker", () => ({ WeekPicker: () => null }));
vi.mock("../session-tabs", () => ({ SessionTabs: () => null }));
vi.mock("../match-tabs", () => ({ MatchTabs: () => null }));
vi.mock("../formation-grid", () => ({ FormationGrid: () => null }));
vi.mock("../member-pool", () => ({ MemberPool: () => null }));
vi.mock("../prefill-banner", () => ({ PrefillBanner: () => null }));
vi.mock("../absent-banner", () => ({ AbsentBanner: () => null }));
vi.mock("../copy-formation-dialog", () => ({ CopyFormationDialog: () => null }));
vi.mock("../save-conflict-dialog", () => ({ SaveConflictDialog: () => null }));
vi.mock("../formation-capture-sheet", () => ({
  FormationCaptureSheet: () => <div data-testid="capture-sheet" />,
}));
vi.mock("../announce-formation-dialog", () => ({
  AnnounceFormationDialog: ({ open }: { open: boolean }) => (
    <div data-testid="announce-dialog" data-open={String(open)} />
  ),
}));

afterEach(() => {
  cleanup();
  announceState.open = false;
});

/**
 * Build the screen hook's result for an editable, saved day.
 * @returns The fake formation screen
 */
function editableScreen() {
  return {
    week: { isError: false, isPending: false, weeks: [], weekStart: "2026-01-05", setWeek: vi.fn() },
    selection: {
      editable: true,
      sessions: [],
      activeSessionId: "s1",
      activeSession: {
        id: "s1",
        label: "Thứ 7",
        isGuildWar: true,
        locked: false,
        matchCount: 1,
        dateTime: "2026-01-10T12:00:00.000Z",
        opponent: null,
      },
      setActiveSession: vi.fn(),
    },
    draft: {
      dirty: false,
      saving: false,
      dirtySessionIds: new Set<string>(),
      changeCount: 0,
      saveErrorMessage: null,
      slotCount: 5,
      matchCount: 1,
      activeMatchIndex: 0,
      matches: [{ assignment: {} }],
      assignment: {},
      notes: {},
    },
    teamNames: { dirty: false, saving: false, changeCount: 0, saveErrorMessage: null, names: {} },
    copy: { sourceLabel: "Thứ 6", canCopy: true, copy: vi.fn() },
    pool: { absentIds: new Set<string>(), charactersById: new Map(), pool: [], classCounts: [], otherMatchIds: new Set<string>(), prefill: null },
    dnd: { activeCharacter: null },
  };
}

describe("TeamBuilderScreen - khu điều khiển", () => {
  it("gom thanh công cụ vào một vùng điều khiển có tên", () => {
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);

    const region = screen.getByRole("region", { name: "Điều khiển đội hình" });
    expect(region.textContent).toContain("Gửi Discord");
  });

  it("bấm Gửi Discord thì mở hộp thoại thông báo", () => {
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Gửi Discord" }));

    expect(announceState.setOpen).toHaveBeenCalledWith(true);
  });

  it("hộp thoại mở thì dựng tờ chụp đội hình bên cạnh", () => {
    formationScreen.value = editableScreen();
    announceState.open = true;

    render(<TeamBuilderScreen />);

    expect(screen.getByTestId("announce-dialog").dataset.open).toBe("true");
    expect(screen.getByTestId("capture-sheet")).toBeTruthy();
  });

  it("tuần không có trận thì báo trống thay vì dựng khu điều khiển", () => {
    const empty = editableScreen();
    empty.selection.activeSession = null as never;
    formationScreen.value = empty;

    render(<TeamBuilderScreen />);

    expect(screen.queryByRole("region", { name: "Điều khiển đội hình" })).toBeNull();
    expect(screen.getByText("Tuần này chưa có trận đánh nào.")).toBeTruthy();
  });
});
