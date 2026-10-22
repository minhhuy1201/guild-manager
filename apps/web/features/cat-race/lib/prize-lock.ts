import { CAT_RACE_MIN_ENTRANTS } from "@guild/shared/schemas";
import type { CatRaceEventStatus, CatRacePrize } from "@guild/shared/schemas";

/** Why a prize cannot be raced for right now. */
export type PrizeLockReason = "ended" | "full" | "too-few";

/** Vietnamese sentence per reason; shown in words, never only in a tooltip. */
export const PRIZE_LOCK_LABEL: Record<PrizeLockReason, string> = {
  ended: "Đợt đua đã kết thúc.",
  full: "Hạng mục đã đủ giải.",
  "too-few": "Cần ít nhất 2 người để đua.",
};

/**
 * Why a prize cannot be drawn, in the order the API checks it.
 * @param prize - The prize
 * @param eventStatus - Whether the event is still open
 * @returns The reason, or null when a round can start
 */
export function prizeLockReason(
  prize: Pick<CatRacePrize, "quantity" | "awardedCount" | "entrantIds">,
  eventStatus: CatRaceEventStatus
): PrizeLockReason | null {
  if (eventStatus === "ENDED") return "ended";
  if (prize.awardedCount >= prize.quantity) return "full";
  if (prize.entrantIds.length < CAT_RACE_MIN_ENTRANTS) return "too-few";

  return null;
}
