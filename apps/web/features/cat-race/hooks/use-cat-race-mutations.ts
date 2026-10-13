"use client";

import { useMutation } from "@tanstack/react-query";

import { useInvalidate } from "@/hooks/use-invalidate";
import {
  createCatRace,
  updateCatRace,
  deleteCatRace,
  setCatRaceParticipants,
  addCatRacePrize,
  updateCatRacePrize,
  deleteCatRacePrize,
  setCatRaceEntrants,
  voidCatRaceRound,
  endCatRace,
  announceCatRace,
  drawCatRaceRound,
} from "../api/cat-race-api";

/**
 * Create an event.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useCreateCatRace() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: createCatRace, onSuccess: invalidate });
}

/**
 * Rename an event or change its mode.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useUpdateCatRace() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: updateCatRace, onSuccess: invalidate });
}

/**
 * Delete an event with no round.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useDeleteCatRace() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: deleteCatRace, onSuccess: invalidate });
}

/**
 * Replace the roster and tickets.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useSetCatRaceParticipants() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: setCatRaceParticipants, onSuccess: invalidate });
}

/**
 * Add a prize.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useAddCatRacePrize() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: addCatRacePrize, onSuccess: invalidate });
}

/**
 * Edit a prize.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useUpdateCatRacePrize() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: updateCatRacePrize, onSuccess: invalidate });
}

/**
 * Delete a prize with no round.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useDeleteCatRacePrize() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: deleteCatRacePrize, onSuccess: invalidate });
}

/**
 * Replace who may win a prize.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useSetCatRaceEntrants() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: setCatRaceEntrants, onSuccess: invalidate });
}

/**
 * Void a round.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useVoidCatRaceRound() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: voidCatRaceRound, onSuccess: invalidate });
}

/**
 * End an event.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useEndCatRace() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: endCatRace, onSuccess: invalidate });
}

/**
 * Post the summary to Discord.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useAnnounceCatRace() {
  const invalidate = useInvalidate("cat-race");

  return useMutation({ mutationFn: announceCatRace, onSuccess: invalidate });
}

/**
 * Draw one round. Does NOT invalidate: the race screen shows the winner first and refreshes the
 * cache when the result overlay closes, so the winners list never spoils the race.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useDrawCatRaceRound() {
  return useMutation({ mutationFn: drawCatRaceRound });
}
