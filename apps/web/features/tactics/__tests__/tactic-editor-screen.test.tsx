// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TACTIC_SCHEMA_VERSION } from "@guild/shared/schemas";

import type { StageFrame } from "../lib/stage-transition";

let isDesktop: boolean | null = true;
const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("../hooks/use-is-desktop", () => ({
  useIsDesktop: () => isDesktop,
}));

/** Props the canvas was last rendered with, so a test can fire its drag callbacks. */
const canvasProps: { current: Record<string, unknown> } = { current: {} };

vi.mock("../components/tactic-canvas", () => ({
  TacticCanvas: (props: { frame: StageFrame }) => {
    canvasProps.current = props;

    return (
      <div data-testid="canvas">{props.frame.tokens[0]?.token.label ?? "trống"}</div>
    );
  },
}));

vi.mock("../hooks/use-token-presets", () => ({
  useTokenPresets: () => ({ data: [], isPending: false }),
  useCreateTokenPreset: () => ({ mutateAsync: vi.fn() }),
  useDeleteTokenPreset: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("../api/tactics-api", () => ({
  fetchTactic: vi.fn(() =>
    Promise.resolve({
      id: "t1",
      name: "Thủ cổng tây",
      description: null,
      stageCount: 2,
      updatedAt: "2026-09-20T10:00:00.000Z",
      scene: {
        schemaVersion: TACTIC_SCHEMA_VERSION,
        stages: [
          { id: "s1", name: "Giai đoạn 1", elements: [] },
          { id: "s2", name: "Giai đoạn 2", elements: [] },
        ],
      },
    })
  ),
  saveTacticStages: vi.fn(),
}));

import { useTacticEditorStore } from "../store/editor-store";
import { TacticEditorScreen } from "../components/tactic-editor-screen";

// jsdom ships no matchMedia, which `useReducedMotion` reads. Nothing here turns animation off, so
// the media query answers no.
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // Every stub is set again in a `beforeEach`, except the ones a single test sets for itself.
  vi.unstubAllGlobals();
});

beforeEach(() => {
  isDesktop = true;
  useTacticEditorStore.getState().reset();
  // jsdom measures every box as 0 wide, and a canvas 0 wide has nowhere to put the action bar.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    width: 1000,
    height: 560,
    top: 0,
    left: 0,
    right: 1000,
    bottom: 560,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

/**
 * Render the editor screen inside a fresh QueryClient.
 * @param isAdmin - Whether the viewer may write
 * @returns Nothing
 */
function renderScreen(isAdmin: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(TacticEditorScreen, {
        tacticId: "t1",
        isAdmin,
      }) as ReactNode
    )
  );
}

describe("TacticEditorScreen", () => {
  it("opens with a banner carrying the breadcrumb and the tactic's name", async () => {
    renderScreen(true);

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        "Thủ cổng tây"
      )
    );
    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeTruthy();
    expect(document.querySelector("img")).not.toBeNull();
  });

  it("gives an admin on a wide screen the tools and the palette", async () => {
    renderScreen(true);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Đội hình" })).toBeTruthy()
    );
    expect(screen.getByRole("heading", { name: "Quân hiệu" })).toBeTruthy();
    expect(screen.getAllByRole("tab", { name: "Giai đoạn 1" })).toHaveLength(1);
    expect(screen.getByTestId("canvas")).toBeTruthy();
    expect(screen.queryByText("Mở trên máy tính để vẽ chiến thuật.")).toBeNull();
  });

  it("gives an admin on a phone the notice and the read-only viewer", async () => {
    isDesktop = false;
    renderScreen(true);

    await waitFor(() =>
      expect(
        screen.getByText("Mở trên máy tính để vẽ chiến thuật.")
      ).toBeTruthy()
    );
    expect(screen.queryByRole("button", { name: "Đội hình" })).toBeNull();
    expect(screen.getByTestId("canvas")).toBeTruthy();
  });

  it("gives a member the viewer with no tools and no notice", async () => {
    renderScreen(false);

    await waitFor(() => expect(screen.getByTestId("canvas")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Đội hình" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xuất ảnh" })).toBeNull();
    expect(screen.queryByText("Mở trên máy tính để vẽ chiến thuật.")).toBeNull();
  });

  it("renders neither half until the screen width is known", () => {
    isDesktop = null;
    renderScreen(true);

    expect(screen.queryByTestId("canvas")).toBeNull();
    expect(screen.queryByRole("button", { name: "Đội hình" })).toBeNull();
  });

  it("puts the selected element's actions on the map, not in the toolbar", async () => {
    renderScreen(true);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Đội hình" })).toBeTruthy()
    );
    expect(
      screen.queryByRole("toolbar", { name: "Sửa phần tử đang chọn" })
    ).toBeNull();

    const token = {
      kind: "token" as const,
      id: "tok1",
      x: 900,
      y: 400,
      size: "md" as const,
      icon: "swords" as const,
      label: "Đội công",
      color: "blue" as const,
    };

    useTacticEditorStore.getState().commit("s1", [token]);
    useTacticEditorStore.getState().selectElements(["tok1"]);

    await waitFor(() =>
      expect(
        screen.getByRole("toolbar", { name: "Sửa phần tử đang chọn" })
      ).toBeTruthy()
    );
    expect(screen.getByRole("button", { name: "Cỡ lớn" })).toBeTruthy();

    useTacticEditorStore.getState().clearSelection();

    await waitFor(() =>
      expect(
        screen.queryByRole("toolbar", { name: "Sửa phần tử đang chọn" })
      ).toBeNull()
    );
  });

  it("drops a token dragged out of the palette where it is let go on the map", async () => {
    // jsdom has no DragEvent, and the plain Event it falls back to drops the pointer's position.
    vi.stubGlobal("DragEvent", class extends MouseEvent {});
    renderScreen(true);

    await waitFor(() => expect(screen.getByTestId("canvas")).toBeTruthy());

    const entry = screen.getByRole("button", { name: "Trinh sát" });
    const map = screen.getByTestId("canvas").parentElement as HTMLElement;
    const dataTransfer = {
      setData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: "all",
      dropEffect: "none",
    };

    fireEvent.dragStart(entry, { dataTransfer });
    // The solid token that stands in for the browser's faded drag image follows the pointer.
    fireEvent.dragOver(entry, { dataTransfer, clientX: 40, clientY: 300 });
    expect(screen.getByTestId("palette-drag-preview")).toBeTruthy();
    // Accepting the drag is what lets the browser drop it here at all.
    expect(fireEvent.dragOver(map, { dataTransfer })).toBe(false);
    // The canvas is 1000px wide and the map 1920 units, unzoomed and unpanned.
    fireEvent.drop(map, { dataTransfer, clientX: 500, clientY: 250 });
    fireEvent.dragEnd(entry, { dataTransfer });

    expect(screen.queryByTestId("palette-drag-preview")).toBeNull();
    const stage = useTacticEditorStore.getState().scene?.stages[0];
    expect(stage?.elements).toEqual([
      expect.objectContaining({
        kind: "token",
        label: "Trinh sát",
        x: expect.closeTo(960),
        y: expect.closeTo(480),
      }),
    ]);
  });

  it("refuses anything but a palette entry dragged over the map", async () => {
    renderScreen(true);

    await waitFor(() => expect(screen.getByTestId("canvas")).toBeTruthy());

    const map = screen.getByTestId("canvas").parentElement as HTMLElement;

    // A file dragged in from the desktop: not prevented, so the browser refuses the drop.
    expect(fireEvent.dragOver(map, { dataTransfer: { dropEffect: "none" } })).toBe(true);
  });

  // A press on a token picks it up only with the select and token tools; the drawing tools draw on
  // top of it, so the grab cursor would promise something the press does not do.
  it("offers tokens to pick up only with a tool that picks them up", async () => {
    renderScreen(true);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Đội hình" })).toBeTruthy()
    );
    await waitFor(() => expect(canvasProps.current.pickable).toBe(true));

    act(() => useTacticEditorStore.getState().setTool("arrow"));
    await waitFor(() => expect(canvasProps.current.pickable).toBe(false));

    act(() => useTacticEditorStore.getState().setTool("select"));
    await waitFor(() => expect(canvasProps.current.pickable).toBe(true));
  });

  it("takes the action bar away while the selection is being dragged", async () => {
    renderScreen(true);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Đội hình" })).toBeTruthy()
    );

    const token = {
      kind: "token" as const,
      id: "tok1",
      x: 900,
      y: 400,
      size: "md" as const,
      icon: "swords" as const,
      label: "Đội công",
      color: "blue" as const,
    };

    act(() => {
      useTacticEditorStore.getState().commit("s1", [token]);
      useTacticEditorStore.getState().selectElements(["tok1"]);
    });

    await waitFor(() =>
      expect(
        screen.getByRole("toolbar", { name: "Sửa phần tử đang chọn" })
      ).toBeTruthy()
    );

    const pointer = canvasProps.current as unknown as {
      onPointerDown: (point: { x: number; y: number }) => void;
      onPointerMove: (point: { x: number; y: number }) => void;
      onPointerUp: () => void;
    };

    // The bar would cover the piece being carried, so it waits for the drop.
    act(() => pointer.onPointerDown({ x: 900, y: 400 }));
    act(() => pointer.onPointerMove({ x: 1000, y: 450 }));

    expect(
      screen.queryByRole("toolbar", { name: "Sửa phần tử đang chọn" })
    ).toBeNull();

    act(() => pointer.onPointerUp());

    await waitFor(() =>
      expect(
        screen.getByRole("toolbar", { name: "Sửa phần tử đang chọn" })
      ).toBeTruthy()
    );
  });

  it("gives the action bar back when the window is left mid-drag", async () => {
    renderScreen(true);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Đội hình" })).toBeTruthy()
    );

    act(() => {
      useTacticEditorStore.getState().commit("s1", [
        {
          kind: "token" as const,
          id: "tok1",
          x: 900,
          y: 400,
          size: "md" as const,
          icon: "swords" as const,
          label: "Đội công",
          color: "blue" as const,
        },
      ]);
    });

    const pointer = canvasProps.current as unknown as {
      onPointerDown: (point: { x: number; y: number }) => void;
      onPointerMove: (point: { x: number; y: number }) => void;
    };
    act(() => pointer.onPointerDown({ x: 900, y: 400 }));
    act(() => pointer.onPointerMove({ x: 1000, y: 450 }));

    expect(
      screen.queryByRole("toolbar", { name: "Sửa phần tử đang chọn" })
    ).toBeNull();

    // Alt-tab away mid-drag and the release never reaches the canvas.
    act(() => {
      fireEvent.blur(window);
    });

    await waitFor(() =>
      expect(
        screen.getByRole("toolbar", { name: "Sửa phần tử đang chọn" })
      ).toBeTruthy()
    );
  });

  it("does not lose the action bar when the dragged token is deleted mid-drag", async () => {
    renderScreen(true);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Đội hình" })).toBeTruthy()
    );

    const token = {
      kind: "token" as const,
      id: "tok1",
      x: 900,
      y: 400,
      size: "md" as const,
      icon: "swords" as const,
      label: "Đội công",
      color: "blue" as const,
    };
    const other = { ...token, id: "tok2", x: 400, label: "Đội thủ" };

    act(() => {
      useTacticEditorStore.getState().commit("s1", [token, other]);
    });

    const pointer = canvasProps.current as unknown as {
      onPointerDown: (point: { x: number; y: number }) => void;
      onPointerMove: (point: { x: number; y: number }) => void;
    };
    act(() => pointer.onPointerDown({ x: 900, y: 400 }));
    act(() => pointer.onPointerMove({ x: 1000, y: 450 }));

    // Delete answers the keyboard even with the button still held.
    act(() => {
      fireEvent.keyDown(window, { key: "Delete" });
      useTacticEditorStore.getState().selectElements(["tok2"]);
    });

    await waitFor(() =>
      expect(
        screen.getByRole("toolbar", { name: "Sửa phần tử đang chọn" })
      ).toBeTruthy()
    );
  });

  it("keeps saving to the toolbar's own button, with no second bar for it", async () => {
    renderScreen(true);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Đội hình" })).toBeTruthy()
    );
    // Nothing to save yet, so the one Save button there is sits disabled.
    expect(
      screen.getByRole("button", { name: /Lưu/ }).hasAttribute("disabled")
    ).toBe(true);
    expect(screen.queryByText("Bản vẽ có thay đổi chưa lưu")).toBeNull();

    useTacticEditorStore.getState().commit("s1", [
      {
        kind: "text",
        id: "t1",
        x: 1,
        y: 1,
        text: "Tập kết",
        color: "red",
        fontSize: 24,
      },
    ]);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Lưu/ }).hasAttribute("disabled")
      ).toBe(false)
    );
    expect(screen.getAllByRole("button", { name: /Lưu/ })).toHaveLength(1);
    expect(screen.queryByText("Bản vẽ có thay đổi chưa lưu")).toBeNull();
  });

  it("asks before a link leaves an unsaved drawing, and follows it once discarded", async () => {
    renderScreen(true);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Đội hình" })).toBeTruthy()
    );
    useTacticEditorStore.getState().commit("s1", [
      {
        kind: "text",
        id: "t1",
        x: 1,
        y: 1,
        text: "Tập kết",
        color: "red",
        fontSize: 24,
      },
    ]);

    // The guard arms once the screen has rendered the draft as dirty, as it has by the time a
    // person could reach the link.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Lưu/ }).hasAttribute("disabled")
      ).toBe(false)
    );

    const back = within(
      screen.getByRole("navigation", { name: "breadcrumb" })
    ).getByRole("link", { name: /Chiến thuật/ });
    fireEvent.click(back);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Lưu rồi rời" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Ở lại" })).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Bỏ thay đổi" }));
    expect(push).toHaveBeenCalledWith("/chien-thuat");
  });
});
