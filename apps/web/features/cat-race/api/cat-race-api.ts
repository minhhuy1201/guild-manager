"use server";

import type {
  CatRaceDrawResult,
  CatRaceEventDetail,
  CatRaceEventSummary,
  CatRacePrizeInput,
  CatRacePrizeTemplate,
  CreateCatRaceEventInput,
  SetCatRaceEntrantsInput,
  SetCatRaceParticipantsInput,
  UpdateCatRaceEventInput,
  UpdateCatRacePrizeInput,
  VoidCatRaceRoundInput,
} from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
import { type ActionResult, toActionResult } from "@/lib/action-result";
import { apiFetch } from "@/lib/api-client";

/** Arguments of `updateCatRace`. `id` travels on the URL; only the fields are sent. */
export interface UpdateCatRaceArgs extends UpdateCatRaceEventInput {
  id: string;
}

/** Arguments of `setCatRaceParticipants`. */
export interface SetCatRaceParticipantsArgs extends SetCatRaceParticipantsInput {
  id: string;
}

/** Arguments of `addCatRacePrize`. */
export interface AddCatRacePrizeArgs extends CatRacePrizeInput {
  id: string;
}

/** Arguments of `updateCatRacePrize`. */
export interface UpdateCatRacePrizeArgs extends UpdateCatRacePrizeInput {
  id: string;
  prizeId: string;
}

/** Arguments of `setCatRaceEntrants`. */
export interface SetCatRaceEntrantsArgs extends SetCatRaceEntrantsInput {
  id: string;
  prizeId: string;
}

/** Arguments of `voidCatRaceRound`. */
export interface VoidCatRaceRoundArgs extends VoidCatRaceRoundInput {
  id: string;
  roundId: string;
}

/**
 * Path of one event.
 * @param id - Event id
 * @returns `/cat-races/<escaped id>`
 */
function eventPath(id: string): string {
  return `/cat-races/${encodeURIComponent(id)}`;
}

/**
 * Get every event, newest first. Runs on the server because the token lives in an httpOnly cookie.
 * @returns Event summaries; a failure value (`ok: false`) when signed out, not an admin (403), or the backend rejects it
 */
export async function fetchCatRaces(): Promise<ActionResult<CatRaceEventSummary[]>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventSummary[]>("/cat-races", {
      headers: await authHeader(),
    })
  );
}

/**
 * Get the prizes of the latest event, to prefill the create form.
 * @returns Prize lines; empty before the first event
 */
export async function fetchCatRacePrefill(): Promise<ActionResult<CatRacePrizeTemplate[]>> {
  return toActionResult(async () =>
    apiFetch<CatRacePrizeTemplate[]>("/cat-races/prefill", {
      headers: await authHeader(),
    })
  );
}

/**
 * Get one event with roster, prizes and rounds.
 * @param id - Event id
 * @returns The event; a failure value (`ok: false`) when the event is gone (404)
 */
export async function fetchCatRaceEvent(id: string): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>(eventPath(id), {
      headers: await authHeader(),
    })
  );
}

/**
 * Create an event.
 * @param input - name, mode, roster and prizes
 * @returns The event just created
 */
export async function createCatRace(
  input: CreateCatRaceEventInput
): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>("/cat-races", {
      method: "POST",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
}

/**
 * Rename an event or change its mode before the first round.
 * @param args - event id and the fields to change
 * @returns The event after the change
 */
export async function updateCatRace({
  id,
  ...fields
}: UpdateCatRaceArgs): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>(eventPath(id), {
      method: "PATCH",
      body: JSON.stringify(fields),
      headers: await authHeader(),
    })
  );
}

/**
 * Delete an event that has no round.
 * @param id - Event id
 */
export async function deleteCatRace(id: string): Promise<ActionResult<void>> {
  return toActionResult(async () =>
    apiFetch<void>(eventPath(id), {
      method: "DELETE",
      headers: await authHeader(),
    })
  );
}

/**
 * Replace the roster and ticket counts.
 * @param args - event id and the new roster
 * @returns The event after the change
 */
export async function setCatRaceParticipants({
  id,
  ...body
}: SetCatRaceParticipantsArgs): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>(`${eventPath(id)}/participants`, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: await authHeader(),
    })
  );
}

/**
 * Add a prize to an event.
 * @param args - event id and the prize
 * @returns The event after the change
 */
export async function addCatRacePrize({
  id,
  ...prize
}: AddCatRacePrizeArgs): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>(`${eventPath(id)}/prizes`, {
      method: "POST",
      body: JSON.stringify(prize),
      headers: await authHeader(),
    })
  );
}

/**
 * Edit a prize.
 * @param args - event id, prize id and the fields to change
 * @returns The event after the change
 */
export async function updateCatRacePrize({
  id,
  prizeId,
  ...fields
}: UpdateCatRacePrizeArgs): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>(
      `${eventPath(id)}/prizes/${encodeURIComponent(prizeId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(fields),
        headers: await authHeader(),
      }
    )
  );
}

/**
 * Delete a prize that has no round.
 * @param args - event id and prize id
 * @returns The event after the change
 */
export async function deleteCatRacePrize({
  id,
  prizeId,
}: {
  id: string;
  prizeId: string;
}): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>(
      `${eventPath(id)}/prizes/${encodeURIComponent(prizeId)}`,
      { method: "DELETE", headers: await authHeader() }
    )
  );
}

/**
 * Replace who may win a prize.
 * @param args - event id, prize id and the entrant ids
 * @returns The event after the change
 */
export async function setCatRaceEntrants({
  id,
  prizeId,
  ...body
}: SetCatRaceEntrantsArgs): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>(
      `${eventPath(id)}/prizes/${encodeURIComponent(prizeId)}/entrants`,
      {
        method: "PUT",
        body: JSON.stringify(body),
        headers: await authHeader(),
      }
    )
  );
}

/**
 * Draw one round. The server picks the winner; the client only replays it.
 * @param args - event id and prize id
 * @returns The stored round, the field that ran and the winning ticket number
 */
export async function drawCatRaceRound({
  id,
  prizeId,
}: {
  id: string;
  prizeId: string;
}): Promise<ActionResult<CatRaceDrawResult>> {
  return toActionResult(async () =>
    apiFetch<CatRaceDrawResult>(`${eventPath(id)}/rounds`, {
      method: "POST",
      body: JSON.stringify({ prizeId }),
      headers: await authHeader(),
    })
  );
}

/**
 * Void a round.
 * @param args - event id, round id and the reason
 * @returns The event after the change
 */
export async function voidCatRaceRound({
  id,
  roundId,
  ...body
}: VoidCatRaceRoundArgs): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>(
      `${eventPath(id)}/rounds/${encodeURIComponent(roundId)}/void`,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: await authHeader(),
      }
    )
  );
}

/**
 * End an event.
 * @param id - Event id
 * @returns The event
 */
export async function endCatRace(id: string): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>(`${eventPath(id)}/end`, {
      method: "POST",
      headers: await authHeader(),
    })
  );
}

/**
 * Post the event's summary to Discord.
 * @param id - Event id
 * @returns The event, now carrying `discordPostedAt`
 */
export async function announceCatRace(id: string): Promise<ActionResult<CatRaceEventDetail>> {
  return toActionResult(async () =>
    apiFetch<CatRaceEventDetail>(`${eventPath(id)}/announce`, {
      method: "POST",
      headers: await authHeader(),
    })
  );
}
