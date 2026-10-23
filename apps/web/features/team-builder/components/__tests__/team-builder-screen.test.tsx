// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("../match-tabs", () => ({
  MatchTabs: () => <div data-testid="match-tabs" />,
}));
vi.mock("../formation-grid", () => ({
  FormationGrid: () => <div data-testid="grid" />,
}));
vi.mock("../member-pool", () => ({
  MemberPool: () => <div data-testid="pool" />,
}));
vi.mock("../prefill-banner", () => ({ PrefillBanner: () => null }));
vi.mock("../absent-banner", () => ({
  AbsentBanner: ({ count }: { count: number }) =>
    count > 0 ? <div data-testid="absent-banner" /> : null,
}));
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

const fullscreen = vi.hoisted(() => ({ element: null as Element | null }));
const viewport = vi.hoisted(() => ({ isWide: true }));

// jsdom has no matchMedia, which the `F` key reads to stay off below `lg`.
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: viewport.isWide }));
});

afterEach(() => {
  cleanup();
  announceState.open = false;
  fullscreen.element = null;
  viewport.isWide = true;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Stub the Fullscreen API, which jsdom lacks.
 * @param request - What `requestFullscreen` does
 * @returns The two stubs, to assert against
 */
function stubFullscreen(request: () => Promise<void> = () => Promise.resolve()) {
  const requestFullscreen = vi.fn(request);
  const exitFullscreen = vi.fn(() => Promise.resolve());
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    configurable: true,
    value: requestFullscreen,
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: exitFullscreen,
  });
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => fullscreen.element,
  });
  return { requestFullscreen, exitFullscreen };
}

const ENTER_NAME = /Toàn màn hình/;
const DIALOG_NAME = "Xếp đội hình toàn màn hình";

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

describe("TeamBuilderScreen - chế độ toàn màn hình", () => {
  it("trận sửa được thì có nút Toàn màn hình với cap F", () => {
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);

    const button = screen.getByRole("button", { name: ENTER_NAME });
    expect(button.textContent).toContain("F");
  });

  it("trận chỉ xem thì không có nút", () => {
    const readOnly = editableScreen();
    readOnly.selection.editable = false;
    formationScreen.value = readOnly;

    render(<TeamBuilderScreen />);

    expect(screen.queryByRole("button", { name: ENTER_NAME })).toBeNull();
  });

  it("bấm nút thì mở dialog chứa grid và pool, mỗi thứ một bản", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));

    const dialog = screen.getByRole("dialog", { name: DIALOG_NAME });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.querySelector('[data-testid="grid"]')).not.toBeNull();
    expect(dialog.querySelector('[data-testid="pool"]')).not.toBeNull();
    expect(screen.getAllByTestId("grid")).toHaveLength(1);
    expect(screen.getAllByTestId("pool")).toHaveLength(1);
  });

  it("phím F mở chế độ", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    fireEvent.keyDown(document.body, { key: "f" });

    expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeTruthy();
  });

  it("phím F trong ô nhập hoặc kèm phím bổ trợ thì không mở", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "f" });
    fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
    input.remove();

    expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();
  });

  it("phím F dưới lg thì không mở", () => {
    stubFullscreen();
    viewport.isWide = false;
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    fireEvent.keyDown(document.body, { key: "f" });

    expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();
  });

  it("Esc lúc đang kéo chỉ huỷ kéo, không đóng chế độ", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    const { rerender } = render(<TeamBuilderScreen />);
    fireEvent.keyDown(document.body, { key: "f" });
    const dragging = editableScreen();
    dragging.dnd = { activeCharacter: { id: "c1", name: "A" } } as never;
    formationScreen.value = dragging;
    rerender(<TeamBuilderScreen />);
    fireEvent.keyDown(screen.getByRole("dialog", { name: DIALOG_NAME }), { key: "Escape" });

    expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeTruthy();
  });

  it("Esc đóng chế độ và trả focus về nút", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    fireEvent.keyDown(document.body, { key: "f" });
    fireEvent.keyDown(screen.getByRole("dialog", { name: DIALOG_NAME }), { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: ENTER_NAME }));
  });

  it("nút Thoát đóng chế độ", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));
    fireEvent.click(screen.getByRole("button", { name: /Thoát toàn màn hình/ }));

    expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();
  });

  it("Esc đã bị chặn, hoặc bấm trong ô nhập, thì không đóng", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    fireEvent.keyDown(document.body, { key: "f" });
    const dialog = screen.getByRole("dialog", { name: DIALOG_NAME });
    const input = document.createElement("input");
    dialog.appendChild(input);
    fireEvent.keyDown(input, { key: "Escape" });
    const handled = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    handled.preventDefault();
    act(() => {
      dialog.dispatchEvent(handled);
    });

    expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeTruthy();
  });

  it("gọi requestFullscreen trên documentElement, và vẫn bật khi bị từ chối", async () => {
    const { requestFullscreen } = stubFullscreen(() => Promise.reject(new Error("denied")));
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));
    });

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeTruthy();
  });

  it("vẫn bật khi trình duyệt không có Fullscreen API", () => {
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));

    expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeTruthy();
  });

  it("trình duyệt rời toàn màn hình thì chế độ tắt", async () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));
    });
    fullscreen.element = document.documentElement;
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeTruthy();

    fullscreen.element = null;
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();
  });

  it("đóng bằng Esc khi document đang toàn màn hình thì gọi exitFullscreen", async () => {
    const { exitFullscreen } = stubFullscreen();
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));
    });
    fullscreen.element = document.documentElement;
    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog", { name: DIALOG_NAME }), { key: "Escape" });
    });

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it("rời màn khi đang toàn màn hình thì thoát toàn màn hình", async () => {
    const { exitFullscreen } = stubFullscreen();
    formationScreen.value = editableScreen();

    const { unmount } = render(<TeamBuilderScreen />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));
    });
    fullscreen.element = document.documentElement;
    await act(async () => unmount());

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it("đóng trước khi trình duyệt kịp vào toàn màn hình thì vẫn thoát sau đó", async () => {
    let grant = () => {};
    const { exitFullscreen } = stubFullscreen(
      () =>
        new Promise<void>((resolve) => {
          grant = resolve;
        })
    );
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));
    fireEvent.click(screen.getByRole("button", { name: /Thoát toàn màn hình/ }));
    await act(async () => {
      fullscreen.element = document.documentElement;
      grant();
    });

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it("trận chỉ xem không thoát toàn màn hình mà chế độ không mở", () => {
    const { exitFullscreen } = stubFullscreen();
    fullscreen.element = document.documentElement;
    const readOnly = editableScreen();
    readOnly.selection.editable = false;
    formationScreen.value = readOnly;

    render(<TeamBuilderScreen />);

    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it("trận chuyển sang chỉ xem thì focus về vùng điều khiển", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    const { rerender } = render(<TeamBuilderScreen />);
    fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));
    const readOnly = editableScreen();
    readOnly.selection.editable = false;
    formationScreen.value = readOnly;
    rerender(<TeamBuilderScreen />);

    expect(document.activeElement).toBe(
      screen.getByRole("region", { name: "Điều khiển đội hình" })
    );
  });

  it("trận chuyển sang chỉ xem khi đang mở thì chế độ tắt", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    const { rerender } = render(<TeamBuilderScreen />);
    fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));
    const readOnly = editableScreen();
    readOnly.selection.editable = false;
    formationScreen.value = readOnly;
    rerender(<TeamBuilderScreen />);

    expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();
  });

  it("thanh trên có chọn trận và tên trận", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));

    const dialog = screen.getByRole("dialog", { name: DIALOG_NAME });
    expect(within(dialog).getByTestId("match-tabs")).toBeTruthy();
    expect(within(dialog).getByRole("heading", { level: 2 }).textContent).toContain("BANG CHIẾN");
  });

  it("có người vắng thì dòng báo nằm trong dialog, chỉ một bản", () => {
    stubFullscreen();
    const absent = editableScreen();
    absent.pool.absentIds = new Set(["a"]);
    formationScreen.value = absent;

    render(<TeamBuilderScreen />);
    fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));

    const dialog = screen.getByRole("dialog", { name: DIALOG_NAME });
    expect(within(dialog).getByTestId("absent-banner")).toBeTruthy();
  });

  it("có thay đổi thì thanh lưu nằm trong dialog, chỉ một bản", () => {
    stubFullscreen();
    const dirty = editableScreen();
    dirty.draft.dirty = true;
    dirty.draft.changeCount = 3;
    formationScreen.value = dirty;

    render(<TeamBuilderScreen />);
    expect(screen.getAllByRole("button", { name: "Lưu" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));

    const dialog = screen.getByRole("dialog", { name: DIALOG_NAME });
    expect(within(dialog).getByRole("button", { name: "Lưu" })).toBeTruthy();
    expect(within(dialog).getByText("3 thay đổi chưa lưu")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Lưu" })).toHaveLength(1);
  });

  it("không có thay đổi thì không có thanh lưu trong dialog", () => {
    stubFullscreen();
    formationScreen.value = editableScreen();

    render(<TeamBuilderScreen />);
    fireEvent.click(screen.getByRole("button", { name: ENTER_NAME }));

    expect(screen.queryByRole("button", { name: "Lưu" })).toBeNull();
  });
});
