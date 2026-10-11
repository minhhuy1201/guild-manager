import { CAT_RACE_MIN_ENTRANTS } from '@guild/shared/schemas';
import { vnParts } from '@guild/shared/lib';

/** A character and how many tickets they hold. */
export interface TicketHolder {
  readonly characterId: string;
  readonly tickets: number;
}

/** One ticket: its holder and its 1-based number among that holder's own tickets. */
export interface DrawnTicket {
  readonly characterId: string;
  readonly ticketNo: number;
}

/** Returns an integer in `[0, maxExclusive)`. */
export type RandomInt = (maxExclusive: number) => number;

/**
 * Flatten holders into tickets, holder order kept: [a#1, a#2, b#1, ...].
 * @param holders - Entrants with their ticket counts
 * @returns One entry per ticket
 */
export function expandTickets(holders: readonly TicketHolder[]): DrawnTicket[] {
  return holders.flatMap(({ characterId, tickets }) =>
    Array.from({ length: tickets }, (_, index) => ({
      characterId,
      ticketNo: index + 1,
    })),
  );
}

/**
 * Draw one ticket; a holder's chance is proportional to their tickets.
 * @param holders - Entrants with their ticket counts
 * @param randomInt - Source of randomness, injected so tests can fix it
 * @returns The winning ticket
 * @throws Error when fewer than `CAT_RACE_MIN_ENTRANTS` holders - the caller checks first
 */
export function drawTicket(
  holders: readonly TicketHolder[],
  randomInt: RandomInt,
): DrawnTicket {
  if (holders.length < CAT_RACE_MIN_ENTRANTS) {
    throw new Error(
      `drawTicket needs at least ${CAT_RACE_MIN_ENTRANTS} holders, got ${holders.length}`,
    );
  }
  const tickets = expandTickets(holders);

  return tickets[randomInt(tickets.length)];
}

/** What one prize looks like when the roster changes. */
export interface PrizeStanding {
  readonly prizeId: string;
  readonly quantity: number;
  readonly activeWinnerIds: ReadonlySet<string>;
}

/** The effect of a new participant list on the event. */
export interface ParticipantChange {
  readonly removed: string[];
  readonly added: string[];
  readonly entrantsToAdd: { prizeId: string; characterId: string }[];
}

/**
 * Work out what a roster change does. Added people join every prize that is not full and where
 * they hold no active win; removed people leave every prize (the caller deletes their entrants).
 * @param currentIds - Participants now
 * @param nextIds - Participants after the change
 * @param prizes - Each prize's size and its active winners
 * @returns Who was removed, who was added, and the entrant rows to create
 */
export function reconcileParticipants(
  currentIds: readonly string[],
  nextIds: readonly string[],
  prizes: readonly PrizeStanding[],
): ParticipantChange {
  const current = new Set(currentIds);
  const next = new Set(nextIds);
  const removed = currentIds.filter((id) => !next.has(id));
  const added = nextIds.filter((id) => !current.has(id));
  const entrantsToAdd = prizes
    .filter((prize) => prize.activeWinnerIds.size < prize.quantity)
    .flatMap((prize) =>
      added
        .filter((characterId) => !prize.activeWinnerIds.has(characterId))
        .map((characterId) => ({ prizeId: prize.prizeId, characterId })),
    );

  return { removed, added, entrantsToAdd };
}

/**
 * The name an event gets when the admin leaves it blank.
 * @param now - The current instant
 * @returns "Đợt quay dd/MM/yyyy" for the Vietnam calendar day of `now`
 */
export function defaultEventName(now: Date): string {
  const { day, month, year } = vnParts(now);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `Đợt quay ${pad(day)}/${pad(month)}/${year}`;
}
