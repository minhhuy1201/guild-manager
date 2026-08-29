import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, type RenderHookResult } from "@testing-library/react";
import { afterEach } from "vitest";
import type { SessionFormation, TeamNames } from "@guild/shared/schemas";

import { useFormationStore } from "../../store/formation-store";
import { usePoolFilterStore } from "../../store/pool-filter-store";
import { useTeamNameStore } from "../../store/team-name-store";

/** Store state a test may want in place before the first render. */
interface SeedState {
  /** Formation store fields — drafts, open day, open match, week */
  formation?: Partial<
    Pick<
      ReturnType<typeof useFormationStore.getState>,
      "drafts" | "activeSessionId" | "activeMatchIndex" | "selectedWeekStart"
    >
  >;
  /** Pool filter fields — search keyword and guild class filter */
  poolFilter?: Partial<ReturnType<typeof usePoolFilterStore.getState>>;
  /** Unsaved team names, null for "nothing typed yet" */
  teamNameDraft?: TeamNames | null;
}

// A hook left mounted keeps reacting to the Zustand stores, so a later test's
// reset would run the previous test's effects again.
afterEach(cleanup);

// React only batches and flushes state updates inside act() when it knows it is
// under test; without this flag a mutation's error never reaches the assertion.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/**
 * Render a formation hook inside a fresh QueryClient, with both Zustand stores
 * reset. Every test gets its own client so a mutation in one cannot leak a
 * cached error into the next.
 * @param hook - The hook to run
 * @param seed - Store state to put in place before the first render
 * @returns The testing-library render result
 */
export function renderFormationHook<T>(
  hook: () => T,
  seed: SeedState = {}
): RenderHookResult<T, void> {
  useFormationStore.setState({
    drafts: {},
    activeSessionId: null,
    activeMatchIndex: 0,
    selectedWeekStart: null,
    ...seed.formation,
  });
  usePoolFilterStore.setState({
    search: "",
    guildClasses: [],
    ...seed.poolFilter,
  });
  useTeamNameStore.setState({ draft: seed.teamNameDraft ?? null });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return renderHook(hook, {
    /**
     * Provide the QueryClient the hooks under test read from.
     * @param props - Children rendered inside the provider
     * @returns The wrapped tree
     */
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });
}

/**
 * Build one battle day of a week, saved formation included.
 * @param sessionId - Id of the battle
 * @param overrides - Fields to change from the default (an editable, empty day)
 * @returns A SessionFormation fixture
 */
export function makeSession(
  sessionId: string,
  overrides: Partial<SessionFormation> = {}
): SessionFormation {
  return {
    sessionId,
    label: `Trận ${sessionId}`,
    dateTime: "2026-08-18T20:00:00.000Z",
    isGuildWar: false,
    opponent: null,
    locked: false,
    matches: [],
    ...overrides,
  };
}
