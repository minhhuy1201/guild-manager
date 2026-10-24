import {
  isActiveRound,
  toEventDetail,
  toEventSummary,
  toPrizeTemplate,
  toRound,
  type EventDetailRow,
  type EventSummaryRow,
  type RoundRow,
} from '../cat-race.codec';

const DRAWN = new Date('2026-10-12T01:00:00.000Z');
const VOIDED = new Date('2026-10-12T02:00:00.000Z');

const round = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'r1',
    prizeId: 'p1',
    winnerCharacterId: 'c1',
    winnerName: 'Alice',
    winnerGuildClass: 'TO_VAN',
    winnerTickets: 1,
    entrantCount: 2,
    totalTickets: 2,
    drawnAt: DRAWN,
    voidedAt: null,
    voidReason: null,
    ...overrides,
  }) as RoundRow;

const summaryRow = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'e1',
    name: 'Đợt 1',
    mode: 'STANDARD',
    createdAt: DRAWN,
    endedAt: null,
    discordPostedAt: null,
    featuredAt: null,
    prizes: [{ rounds: [round(), round({ voidedAt: VOIDED })] }],
    ...overrides,
  }) as unknown as EventSummaryRow;

describe('cat race codec', () => {
  it('counts a round as active until it is voided', () => {
    expect(isActiveRound({ voidedAt: null })).toBe(true);
    expect(isActiveRound({ voidedAt: VOIDED })).toBe(false);
  });

  it('maps a round, turning dates into ISO strings', () => {
    expect(toRound(round({ voidedAt: VOIDED, voidReason: 'nhầm' }))).toEqual({
      id: 'r1',
      prizeId: 'p1',
      winnerCharacterId: 'c1',
      winnerName: 'Alice',
      winnerGuildClass: 'TO_VAN',
      winnerTickets: 1,
      entrantCount: 2,
      totalTickets: 2,
      drawnAt: DRAWN.toISOString(),
      voidedAt: VOIDED.toISOString(),
      voidReason: 'nhầm',
    });
  });

  it('summarises an open event and counts only the rounds still in force', () => {
    expect(toEventSummary(summaryRow())).toEqual({
      id: 'e1',
      name: 'Đợt 1',
      mode: 'STANDARD',
      status: 'OPEN',
      createdAt: DRAWN.toISOString(),
      discordPostedAt: null,
      featured: false,
      awardedCount: 1,
    });
  });

  it('marks an ended event and carries the Discord post time', () => {
    const summary = toEventSummary(
      summaryRow({ endedAt: VOIDED, discordPostedAt: VOIDED }),
    );

    expect(summary.status).toBe('ENDED');
    expect(summary.discordPostedAt).toBe(VOIDED.toISOString());
  });

  it('reports featured once featuredAt is set', () => {
    expect(toEventSummary(summaryRow({ featuredAt: VOIDED })).featured).toBe(
      true,
    );
  });

  it('maps a detail with roster, prizes and rounds sorted by draw time', () => {
    const later = round({
      id: 'r2',
      drawnAt: VOIDED,
      winnerCharacterId: 'c2',
      winnerName: 'Bob',
    });
    const row = {
      ...summaryRow(),
      participants: [
        {
          characterId: 'c1',
          tickets: 2,
          character: {
            name: 'Alice',
            guildClass: 'TO_VAN',
            discordId: '111',
            discordAvatar: 'hash',
          },
        },
      ],
      prizes: [
        {
          id: 'p1',
          name: 'Tiền mặt',
          quantity: 3,
          tier: 'HIGH',
          sortOrder: 0,
          rounds: [later, round(), round({ id: 'r3', voidedAt: VOIDED })],
          entrants: [{ characterId: 'c1' }, { characterId: 'c2' }],
        },
      ],
    } as unknown as EventDetailRow;

    const detail = toEventDetail(row);

    expect(detail.participants).toEqual([
      {
        characterId: 'c1',
        name: 'Alice',
        guildClass: 'TO_VAN',
        discordId: '111',
        discordAvatar: 'hash',
        tickets: 2,
      },
    ]);
    expect(detail.prizes).toEqual([
      {
        id: 'p1',
        name: 'Tiền mặt',
        quantity: 3,
        tier: 'HIGH',
        sortOrder: 0,
        awardedCount: 2,
        entrantIds: ['c1', 'c2'],
      },
    ]);
    expect(detail.rounds.map((r) => r.id)).toEqual(['r1', 'r3', 'r2']);
    expect(detail.awardedCount).toBe(2);
  });

  it('maps a stored prize to a template line', () => {
    expect(toPrizeTemplate({ name: 'Vé', quantity: 4, tier: 'LOW' })).toEqual({
      name: 'Vé',
      quantity: 4,
      tier: 'LOW',
    });
  });
});
