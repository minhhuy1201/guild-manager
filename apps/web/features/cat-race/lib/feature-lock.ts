import type { CatRaceEventDetail } from "@guild/shared/schemas";

/** Why an event cannot be shown on the landing page right now. */
export type FeatureLockReason = "not-ended" | "no-round";

/** Vietnamese sentence per reason; shown beside the switch, never only in a tooltip. */
export const FEATURE_LOCK_LABEL: Record<FeatureLockReason, string> = {
  "not-ended": "Kết thúc đợt trước khi hiện ở trang chủ.",
  "no-round": "Đợt chưa có vòng nào còn hiệu lực để hiện ở trang chủ.",
};

/**
 * Why an event cannot be featured, in the order the API checks it.
 * @param event - The event
 * @returns The reason, or null when it can be featured
 */
export function featureLockReason(
  event: Pick<CatRaceEventDetail, "status" | "rounds">
): FeatureLockReason | null {
  if (event.status !== "ENDED") return "not-ended";
  if (event.rounds.every((round) => round.voidedAt !== null)) return "no-round";

  return null;
}
