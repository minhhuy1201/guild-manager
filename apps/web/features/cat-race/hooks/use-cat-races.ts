"use client";

import { useQuery } from "@tanstack/react-query";

import { fromAction } from "@/lib/action-result";
import {
  fetchCatRaceEvent,
  fetchCatRacePrefill,
  fetchCatRaces,
} from "../api/cat-race-api";
import { catRaceKeys } from "../api/cat-race-keys";

/**
 * Every cat race event, newest first.
 * @returns TanStack query holding the event summaries
 */
export function useCatRaces() {
  return useQuery({ queryKey: catRaceKeys.list(), queryFn: fromAction(fetchCatRaces) });
}

/**
 * The prizes of the latest event, to prefill the create form.
 * @returns TanStack query holding the prize lines
 */
export function useCatRacePrefill() {
  return useQuery({
    queryKey: catRaceKeys.prefill(),
    queryFn: fromAction(fetchCatRacePrefill),
  });
}

/**
 * One event with roster, prizes and rounds.
 * @param id - Event id
 * @returns TanStack query holding the event
 */
export function useCatRaceEvent(id: string) {
  return useQuery({
    queryKey: catRaceKeys.detail(id),
    queryFn: () => fromAction(fetchCatRaceEvent)(id),
  });
}
