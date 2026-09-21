// @vitest-environment jsdom
import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/tactics-api", () => ({
  fetchTactics: vi.fn(),
  fetchTactic: vi.fn(),
  fetchTokenPresets: vi.fn(),
  createTactic: vi.fn(),
  updateTactic: vi.fn(),
  deleteTactic: vi.fn(),
  saveTacticStages: vi.fn(),
  createTokenPreset: vi.fn(),
  deleteTokenPreset: vi.fn(),
}));

import {
  createTactic,
  createTokenPreset,
  deleteTactic,
  deleteTokenPreset,
  fetchTactic,
  fetchTactics,
  fetchTokenPresets,
  saveTacticStages,
  updateTactic,
} from "../../api/tactics-api";
import { useSaveTactic } from "../use-save-tactic";
import { useTactic } from "../use-tactic";
import {
  useCreateTactic,
  useDeleteTactic,
  useUpdateTactic,
} from "../use-tactic-mutations";
import { useTactics } from "../use-tactics";
import {
  useCreateTokenPreset,
  useDeleteTokenPreset,
  useTokenPresets,
} from "../use-token-presets";
import { makeScene, makeTactic, renderTacticHook } from "./render-tactic-hook";

beforeEach(() => {
  vi.mocked(fetchTactics).mockResolvedValue([]);
  vi.mocked(fetchTactic).mockResolvedValue(makeTactic());
  vi.mocked(fetchTokenPresets).mockResolvedValue([]);
  vi.mocked(createTactic).mockResolvedValue(makeTactic());
  vi.mocked(updateTactic).mockResolvedValue(makeTactic());
  vi.mocked(saveTacticStages).mockResolvedValue(makeTactic());
  vi.mocked(deleteTactic).mockResolvedValue(undefined);
  vi.mocked(createTokenPreset).mockResolvedValue({
    id: "p1",
    label: "Đội cảm tử",
    icon: "skull",
    sortOrder: 1,
  });
  vi.mocked(deleteTokenPreset).mockResolvedValue(undefined);
});

describe("tactics queries", () => {
  it("reads the tactic list", async () => {
    const { result } = renderTacticHook(() => useTactics());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchTactics).toHaveBeenCalled();
  });

  it("reads one tactic by id", async () => {
    const { result } = renderTacticHook(() => useTactic("t1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchTactic).toHaveBeenCalledWith("t1");
    expect(result.current.data?.name).toBe("Thủ cổng tây");
  });

  it("reads the token presets", async () => {
    const { result } = renderTacticHook(() => useTokenPresets());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchTokenPresets).toHaveBeenCalled();
  });
});

describe("tactics mutations", () => {
  it("creates, renames and deletes a tactic through the API layer", async () => {
    const { result } = renderTacticHook(() => ({
      create: useCreateTactic(),
      update: useUpdateTactic(),
      remove: useDeleteTactic(),
    }));

    await result.current.create.mutateAsync({ name: "Thủ cổng tây" });
    await result.current.update.mutateAsync({ id: "t1", name: "Mở màn" });
    await result.current.remove.mutateAsync("t1");

    // TanStack hands the mutation function a second argument (its context), so each call is
    // asserted on its first argument alone.
    expect(vi.mocked(createTactic).mock.calls[0][0]).toEqual({
      name: "Thủ cổng tây",
    });
    expect(vi.mocked(updateTactic).mock.calls[0][0]).toEqual({
      id: "t1",
      name: "Mở màn",
    });
    expect(vi.mocked(deleteTactic).mock.calls[0][0]).toBe("t1");
  });

  it("saves the whole scene", async () => {
    const { result } = renderTacticHook(() => useSaveTactic());
    const scene = makeScene(2);

    await result.current.mutateAsync({ id: "t1", scene });

    expect(vi.mocked(saveTacticStages).mock.calls[0][0]).toEqual({
      id: "t1",
      scene,
    });
  });

  it("adds and removes a token preset", async () => {
    const { result } = renderTacticHook(() => ({
      create: useCreateTokenPreset(),
      remove: useDeleteTokenPreset(),
    }));

    await result.current.create.mutateAsync({
      label: "Đội cảm tử",
      icon: "skull",
    });
    await result.current.remove.mutateAsync("p1");

    expect(vi.mocked(createTokenPreset).mock.calls[0][0]).toEqual({
      label: "Đội cảm tử",
      icon: "skull",
    });
    expect(vi.mocked(deleteTokenPreset).mock.calls[0][0]).toBe("p1");
  });

  it("hands a failed save back to the caller instead of swallowing it", async () => {
    vi.mocked(saveTacticStages).mockRejectedValue(
      new Error("Một chiến thuật tối đa 20 giai đoạn.")
    );
    const { result } = renderTacticHook(() => useSaveTactic());

    await expect(
      result.current.mutateAsync({ id: "t1", scene: makeScene() })
    ).rejects.toThrow("Một chiến thuật tối đa 20 giai đoạn.");
  });
});
