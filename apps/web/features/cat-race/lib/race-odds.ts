import { CatRaceMode } from "@guild/shared/enums";

/** A draw needs more people than this before a long shot means anything. */
const UNDERDOG_MIN_PEOPLE = 2;

export interface RaceOddsInput {
  mode: CatRaceMode;
  /** Tickets the winner held */
  winnerTickets: number;
  totalTickets: number;
  /** People in the draw */
  entrantCount: number;
}

/**
 * The winner's chance of winning, 0..1. In TICKET mode that is their tickets over all tickets; in
 * standard mode every person weighs the same.
 * @param odds - The round
 * @returns The share
 */
export function winShare({ mode, winnerTickets, totalTickets, entrantCount }: RaceOddsInput): number {
  return mode === CatRaceMode.TICKET ? winnerTickets / totalTickets : 1 / entrantCount;
}

/**
 * Whether the winner beat the odds: their chance was below an even split and the field was big
 * enough for that to be a surprise.
 * @param odds - The round
 * @returns True for a long shot
 */
export function isUnderdog(odds: RaceOddsInput): boolean {
  return odds.entrantCount > UNDERDOG_MIN_PEOPLE && winShare(odds) < 1 / odds.entrantCount;
}

/**
 * The odds line of the result card.
 * @param odds - The round
 * @returns e.g. "Thắng với 2/5 vé · tỉ lệ 40%" or "Thắng giữa 4 người · tỉ lệ 25%"
 */
export function oddsText(odds: RaceOddsInput): string {
  const percent = (winShare(odds) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  const subject =
    odds.mode === CatRaceMode.TICKET
      ? `Thắng với ${odds.winnerTickets}/${odds.totalTickets} vé`
      : `Thắng giữa ${odds.entrantCount} người`;

  return `${subject} · tỉ lệ ${percent}%`;
}
