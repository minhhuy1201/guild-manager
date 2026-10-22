import type { CatRaceEventSummary } from "@guild/shared/schemas";

export type EventStage = "open" | "ended" | "posted";

/**
 * Where an event stands in the list.
 * @param race - The event summary
 * @returns The stage the badge and the card dimming follow
 */
export function eventStageOf(
  race: Pick<CatRaceEventSummary, "status" | "discordPostedAt">
): EventStage {
  if (race.status === "OPEN") return "open";
  return race.discordPostedAt ? "posted" : "ended";
}
