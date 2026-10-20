// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createCatRace: vi.fn(),
  updateCatRace: vi.fn(),
  deleteCatRace: vi.fn(),
  setCatRaceParticipants: vi.fn(),
  addCatRacePrize: vi.fn(),
  updateCatRacePrize: vi.fn(),
  deleteCatRacePrize: vi.fn(),
  setCatRaceEntrants: vi.fn(),
  voidCatRaceRound: vi.fn(),
  endCatRace: vi.fn(),
  announceCatRace: vi.fn(),
  drawCatRaceRound: vi.fn(),
  fetchCatRaces: vi.fn(),
  fetchCatRacePrefill: vi.fn(),
  fetchCatRaceEvent: vi.fn(),
}));
const invalidate = vi.hoisted(() => vi.fn());

vi.mock("../../api/cat-race-api", () => api);
vi.mock("@/hooks/use-invalidate", () => ({ useInvalidate: () => invalidate }));

import * as mutations from "../use-cat-race-mutations";
import { useCatRaceEvent, useCatRacePrefill, useCatRaces } from "../use-cat-races";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Wrapper giving a hook a fresh query client with retries off.
 * @param props - Children to wrap
 */
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(cleanup);

const WRITES = [
  ["useCreateCatRace", "createCatRace"],
  ["useUpdateCatRace", "updateCatRace"],
  ["useDeleteCatRace", "deleteCatRace"],
  ["useSetCatRaceParticipants", "setCatRaceParticipants"],
  ["useAddCatRacePrize", "addCatRacePrize"],
  ["useUpdateCatRacePrize", "updateCatRacePrize"],
  ["useDeleteCatRacePrize", "deleteCatRacePrize"],
  ["useSetCatRaceEntrants", "setCatRaceEntrants"],
  ["useVoidCatRaceRound", "voidCatRaceRound"],
  ["useEndCatRace", "endCatRace"],
  ["useAnnounceCatRace", "announceCatRace"],
] as const;

describe.each(WRITES)("%s", (hookName, apiName) => {
  it("calls the API and invalidates the cat-race cache", async () => {
    api[apiName].mockResolvedValue({ ok: true, data: {} });
    const { result } = renderHook(() => mutations[hookName](), { wrapper });

    await act(async () => {
      await (result.current.mutateAsync as (v: unknown) => Promise<unknown>)({ id: "e1" });
    });

    expect(api[apiName].mock.calls[0]?.[0]).toEqual({ id: "e1" });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

describe("a rejected write", () => {
  it("rejects with an ApiError carrying the backend's message and status", async () => {
    api.announceCatRace.mockResolvedValue({
      ok: false,
      message: "Chưa đặt kênh thông báo chung.",
      statusCode: 409,
    });
    const { result } = renderHook(() => mutations.useAnnounceCatRace(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync("e1")).rejects.toMatchObject({
        name: "ApiError",
        message: "Chưa đặt kênh thông báo chung.",
        statusCode: 409,
      });
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("surfaces a failed query as an ApiError too", async () => {
    api.fetchCatRaces.mockResolvedValue({ ok: false, message: "Hết quyền.", statusCode: 403 });
    const { result } = renderHook(() => useCatRaces(), { wrapper });

    await waitFor(() => expect(result.current.error).toMatchObject({ statusCode: 403 }));
  });
});

describe("useDrawCatRaceRound", () => {
  it("draws without invalidating, so the winners list never spoils the race", async () => {
    api.drawCatRaceRound.mockResolvedValue({ ok: true, data: { winningTicket: 1 } });
    const { result } = renderHook(() => mutations.useDrawCatRaceRound(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "e1", prizeId: "p1" });
    });

    expect(api.drawCatRaceRound.mock.calls[0]?.[0]).toEqual({ id: "e1", prizeId: "p1" });
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("cat race queries", () => {
  it("loads the event list", async () => {
    api.fetchCatRaces.mockResolvedValue({ ok: true, data: [{ id: "e1" }] });
    const { result } = renderHook(() => useCatRaces(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([{ id: "e1" }]));
  });

  it("loads the prefill", async () => {
    api.fetchCatRacePrefill.mockResolvedValue({ ok: true, data: [{ name: "p" }] });
    const { result } = renderHook(() => useCatRacePrefill(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([{ name: "p" }]));
  });

  it("loads one event by id", async () => {
    api.fetchCatRaceEvent.mockResolvedValue({ ok: true, data: { id: "e9" } });
    const { result } = renderHook(() => useCatRaceEvent("e9"), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ id: "e9" }));
    expect(api.fetchCatRaceEvent).toHaveBeenCalledWith("e9");
  });
});
