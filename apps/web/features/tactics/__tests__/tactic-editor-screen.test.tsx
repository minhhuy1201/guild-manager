// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TACTIC_SCHEMA_VERSION } from "@guild/shared/schemas";

let isDesktop: boolean | null = true;

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

afterEach(cleanup);

beforeEach(() => {
  isDesktop = true;
  useTacticEditorStore.getState().reset();
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
  it("opens with the breadcrumb, not a banner", async () => {
    renderScreen(true);

    await waitFor(() => expect(screen.getByText("Thủ cổng tây")).toBeTruthy());
    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeTruthy();
    expect(document.querySelector("img")).toBeNull();
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
});
