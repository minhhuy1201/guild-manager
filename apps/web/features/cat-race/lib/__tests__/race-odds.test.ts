import { describe, expect, it } from "vitest";
import { CatRaceMode } from "@guild/shared/enums";

import { isUnderdog, oddsText, winShare, type RaceOddsInput } from "../race-odds";

const TICKET = CatRaceMode.TICKET;
const STANDARD = CatRaceMode.STANDARD;

/**
 * A round.
 * @param overrides - Fields to change
 * @returns The input
 */
function odds(overrides: Partial<RaceOddsInput> = {}): RaceOddsInput {
  return { mode: TICKET, winnerTickets: 1, totalTickets: 4, entrantCount: 4, ...overrides };
}

describe("oddsText", () => {
  it("names the tickets in TICKET mode, with one decimal and a comma", () => {
    expect(oddsText(odds({ winnerTickets: 1, totalTickets: 8, entrantCount: 3 }))).toBe(
      "Thắng với 1/8 vé · tỉ lệ 12,5%"
    );
  });

  it("drops the decimal of a whole percentage", () => {
    expect(oddsText(odds({ winnerTickets: 2, totalTickets: 5 }))).toBe(
      "Thắng với 2/5 vé · tỉ lệ 40%"
    );
  });

  it("rounds to one decimal", () => {
    expect(oddsText(odds({ winnerTickets: 1, totalTickets: 3, entrantCount: 3 }))).toBe(
      "Thắng với 1/3 vé · tỉ lệ 33,3%"
    );
  });

  it("counts people in standard mode", () => {
    expect(oddsText(odds({ mode: STANDARD, entrantCount: 8 }))).toBe(
      "Thắng giữa 8 người · tỉ lệ 12,5%"
    );
    expect(oddsText(odds({ mode: STANDARD, entrantCount: 3 }))).toBe(
      "Thắng giữa 3 người · tỉ lệ 33,3%"
    );
  });
});

describe("winShare", () => {
  it("is tickets over tickets in TICKET mode and one over people otherwise", () => {
    expect(winShare(odds({ winnerTickets: 3, totalTickets: 4 }))).toBe(0.75);
    expect(winShare(odds({ mode: STANDARD, entrantCount: 4 }))).toBe(0.25);
  });
});

describe("isUnderdog", () => {
  it("is true below an even split", () => {
    expect(isUnderdog(odds({ winnerTickets: 1, totalTickets: 8, entrantCount: 4 }))).toBe(true);
  });

  it("is false at or above an even split", () => {
    expect(isUnderdog(odds({ winnerTickets: 2, totalTickets: 8, entrantCount: 4 }))).toBe(false);
    expect(isUnderdog(odds({ winnerTickets: 3, totalTickets: 8, entrantCount: 4 }))).toBe(false);
  });

  it("needs more than two people, even for a long shot", () => {
    expect(isUnderdog(odds({ winnerTickets: 1, totalTickets: 10, entrantCount: 2 }))).toBe(false);
    expect(isUnderdog(odds({ winnerTickets: 1, totalTickets: 10, entrantCount: 3 }))).toBe(true);
  });

  it("never fires in standard mode, where everyone weighs the same", () => {
    expect(isUnderdog(odds({ mode: STANDARD, entrantCount: 10 }))).toBe(false);
  });
});
