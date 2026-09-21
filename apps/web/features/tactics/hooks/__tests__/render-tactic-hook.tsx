import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  renderHook,
  type RenderHookResult,
} from "@testing-library/react";
import { afterEach } from "vitest";
import {
  TACTIC_SCHEMA_VERSION,
  type TacticDetail,
  type TacticScene,
} from "@guild/shared/schemas";

import { useTacticEditorStore } from "../../store/editor-store";

// A hook left mounted keeps reacting to the store, so the next test's reset would run this test's
// effects again.
afterEach(cleanup);

// React only batches and flushes updates inside act() when it knows it is under test; without this
// flag a mutation's error never reaches the assertion.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/**
 * Render a tactics hook inside a fresh QueryClient, with the editor store reset.
 * Each test gets its own client, so one test's cached error cannot leak into the next.
 * @param hook - The hook to run
 * @returns The testing-library render result
 */
export function renderTacticHook<T>(hook: () => T): RenderHookResult<T, void> {
  useTacticEditorStore.getState().reset();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return renderHook(hook, {
    /**
     * Provide the QueryClient the hooks read from.
     * @param props - Children rendered inside the provider
     * @returns The wrapped tree
     */
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });
}

/**
 * A scene with one stage, or as many as asked for.
 * @param stageCount - How many stages the scene holds
 * @returns The scene
 */
export function makeScene(stageCount = 1): TacticScene {
  return {
    schemaVersion: TACTIC_SCHEMA_VERSION,
    stages: Array.from({ length: stageCount }, (_, index) => ({
      id: `s${index + 1}`,
      name: `Giai đoạn ${index + 1}`,
      elements: [],
    })),
  };
}

/**
 * One saved tactic as the API returns it.
 * @param overrides - Fields to change from the default
 * @returns The tactic
 */
export function makeTactic(overrides: Partial<TacticDetail> = {}): TacticDetail {
  const scene = overrides.scene ?? makeScene();

  return {
    id: "t1",
    name: "Thủ cổng tây",
    description: null,
    stageCount: scene.stages.length,
    updatedAt: "2026-09-20T10:00:00.000Z",
    scene,
    ...overrides,
  };
}
