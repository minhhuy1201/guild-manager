import { randomInt } from 'node:crypto';

import {
  defaultEventName,
  drawTicket,
  expandTickets,
  reconcileParticipants,
  type PrizeStanding,
} from '../cat-race.rules';

describe('drawTicket', () => {
  const holders = [
    { characterId: 'a', tickets: 2 },
    { characterId: 'b', tickets: 1 },
    { characterId: 'c', tickets: 2 },
  ];

  it('maps the drawn index to the ticket holder', () => {
    expect(drawTicket(holders, () => 0)).toEqual({
      characterId: 'a',
      ticketNo: 1,
    });
    expect(drawTicket(holders, () => 2)).toEqual({
      characterId: 'b',
      ticketNo: 1,
    });
    expect(drawTicket(holders, () => 4)).toEqual({
      characterId: 'c',
      ticketNo: 2,
    });
  });

  it('keeps holder order when expanding tickets', () => {
    expect(
      expandTickets(holders).map((t) => `${t.characterId}${t.ticketNo}`),
    ).toEqual(['a1', 'a2', 'b1', 'c1', 'c2']);
  });

  it('throws with a single holder', () => {
    expect(() => drawTicket([holders[0]], () => 0)).toThrow();
  });

  it('draws in proportion to tickets', () => {
    const runs = 30_000;
    let aWins = 0;
    for (let i = 0; i < runs; i += 1) {
      const pick = drawTicket(
        [
          { characterId: 'a', tickets: 3 },
          { characterId: 'b', tickets: 1 },
        ],
        (max) => randomInt(max),
      );
      if (pick.characterId === 'a') aWins += 1;
    }

    const ratio = aWins / runs;
    expect(ratio).toBeGreaterThan(0.72);
    expect(ratio).toBeLessThan(0.78);
  });
});

describe('reconcileParticipants', () => {
  const prizes: PrizeStanding[] = [
    {
      prizeId: 'P1',
      quantity: 2,
      awardedCount: 1,
      activeWinnerIds: new Set(['y']),
    },
    {
      prizeId: 'P2',
      quantity: 1,
      awardedCount: 1,
      activeWinnerIds: new Set(['w']),
    },
    { prizeId: 'P3', quantity: 3, awardedCount: 0, activeWinnerIds: new Set() },
  ];

  it('adds a newcomer to every prize that is not full', () => {
    const change = reconcileParticipants(['w'], ['w', 'x'], prizes);

    expect(change.added).toEqual(['x']);
    expect(change.entrantsToAdd).toEqual([
      { prizeId: 'P1', characterId: 'x' },
      { prizeId: 'P3', characterId: 'x' },
    ]);
  });

  it('skips prizes where a re-added person holds an active win', () => {
    const change = reconcileParticipants([], ['y'], prizes);

    expect(change.entrantsToAdd).toEqual([{ prizeId: 'P3', characterId: 'y' }]);
  });

  it('counts a win by a deleted member as filling the slot', () => {
    const full: PrizeStanding[] = [
      {
        prizeId: 'P1',
        quantity: 1,
        awardedCount: 1,
        activeWinnerIds: new Set(),
      },
    ];

    expect(reconcileParticipants([], ['x'], full).entrantsToAdd).toEqual([]);
  });

  it('reports who was removed', () => {
    const change = reconcileParticipants(['z', 'w'], ['w'], prizes);

    expect(change.removed).toEqual(['z']);
    expect(change.added).toEqual([]);
  });
});

describe('defaultEventName', () => {
  it('uses the Vietnam calendar day', () => {
    expect(defaultEventName(new Date('2026-10-11T18:30:00Z'))).toBe(
      'Đợt đua 12/10/2026',
    );
  });
});
