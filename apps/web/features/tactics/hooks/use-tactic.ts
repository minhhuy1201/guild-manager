"use client";

import { useQuery } from "@tanstack/react-query";
import type { TacticDetail } from "@guild/shared/schemas";

import { fetchTactic } from "../api/tactics-api";
import { tacticKeys } from "../api/tactics-keys";
import { readScene } from "../lib/read-scene";

/**
 * One tactic with its whole scene — the server copy the editor starts its draft from.
 *
 * Read again on every open, cache or not: the draft is taken from this read exactly once, and a
 * copy another admin has saved over since would be saved back over their work. The scene is read
 * in `select`, so a document this app cannot open becomes the query's error rather than a throw
 * deep in the editor.
 * @param id - Tactic id
 * @returns TanStack query holding the tactic
 */
export function useTactic(id: string) {
  return useQuery({
    queryKey: tacticKeys.detail(id),
    queryFn: () => fetchTactic(id),
    refetchOnMount: "always",
    select: readTacticDetail,
  });
}

/**
 * The tactic with its scene read by this app.
 * Module-level on purpose: TanStack reruns `select` when its identity changes, and an inline arrow
 * would re-parse the whole scene on every render - every pointer move while drawing.
 * @param tactic - The tactic as it came off the wire
 * @returns The same tactic, scene read
 */
function readTacticDetail(tactic: TacticDetail): TacticDetail {
  return { ...tactic, scene: readScene(tactic.scene) };
}
