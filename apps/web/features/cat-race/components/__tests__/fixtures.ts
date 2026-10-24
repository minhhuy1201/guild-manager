import { CatRaceMode, GuildClass, PrizeTier } from "@guild/shared/enums";
import type {
  CatRaceEventDetail,
  CatRacePrize,
  CatRaceRound,
} from "@guild/shared/schemas";

export const PRIZE: CatRacePrize = {
  id: "p1",
  name: "Tiền mặt",
  quantity: 2,
  tier: PrizeTier.HIGH,
  sortOrder: 0,
  awardedCount: 0,
  entrantIds: ["a", "b"],
};

export const ROUND: CatRaceRound = {
  id: "r1",
  prizeId: "p1",
  winnerCharacterId: "a",
  winnerName: "Alice",
  winnerGuildClass: GuildClass.TO_VAN,
  winnerTickets: 1,
  entrantCount: 2,
  totalTickets: 2,
  drawnAt: "2026-10-12T01:00:00.000Z",
  voidedAt: null,
  voidReason: null,
};

/**
 * An open two-person event with one prize and no round.
 * @param overrides - Fields to change
 * @returns The event
 */
export function makeEvent(
  overrides: Partial<CatRaceEventDetail> = {}
): CatRaceEventDetail {
  return {
    id: "e1",
    name: "Đợt 1",
    mode: CatRaceMode.STANDARD,
    status: "OPEN",
    createdAt: "2026-10-12T00:00:00.000Z",
    discordPostedAt: null,
    featured: false,
    awardedCount: 0,
    participants: ["a", "b"].map((id) => ({
      characterId: id,
      name: id === "a" ? "Alice" : "Bob",
      guildClass: GuildClass.TO_VAN,
      discordId: null,
      discordAvatar: null,
      tickets: 1,
    })),
    prizes: [PRIZE],
    rounds: [],
    ...overrides,
  };
}
