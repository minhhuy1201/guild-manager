// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TACTIC_SCHEMA_VERSION } from "@guild/shared/schemas";

let isDesktop: boolean | null = true;
const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("../hooks/use-is-desktop", () => ({
  useIsDesktop: () => isDesktop,
}));

vi.mock("../components/tactic-canvas", () => ({
  TacticCanvas: ({ stage }: { stage: { name: string } }) => (
    <div data-testid="canvas">{stage.name}</div>
  ),
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
    useTacticEditorStore.getState().selectElement("tok1");

    await waitFor(() =>
      expect(
        screen.getByRole("toolbar", { name: "Sửa phần tử đang chọn" })
      ).toBeTruthy()
    );
    expect(screen.getByRole("button", { name: "Cỡ lớn" })).toBeTruthy();

    useTacticEditorStore.getState().selectElement(null);

    await waitFor(() =>
      expect(
        screen.queryByRole("toolbar", { name: "Sửa phần tử đang chọn" })
      ).toBeNull()
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
