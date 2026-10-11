import {
  CatRaceMode,
  PrizeTier,
} from '@guild/shared/enums';
import {
  createCatRaceEventSchema,
  setCatRaceParticipantsSchema,
  voidCatRaceRoundSchema,
  catRacePrizeInputSchema,
} from '@guild/shared/schemas';

const prize = { name: 'Thiên thưởng', quantity: 1, tier: PrizeTier.HIGH };

function createInput(mode: CatRaceMode, tickets: number) {
  return {
    mode,
    participants: [{ characterId: 'c1', tickets }],
    prizes: [prize],
  };
}

describe('cat race schemas', () => {
  it.each([0, 4])('rejects %i tickets', (tickets) => {
    expect(
      setCatRaceParticipantsSchema.safeParse({
        participants: [{ characterId: 'c1', tickets }],
      }).success,
    ).toBe(false);
  });

  it('rejects extra tickets in STANDARD mode', () => {
    const result = createCatRaceEventSchema.safeParse(
      createInput(CatRaceMode.STANDARD, 2),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Chế độ Thường chỉ có 1 vé mỗi người.',
    );
  });

  it('accepts 3 tickets in TICKET mode', () => {
    expect(
      createCatRaceEventSchema.safeParse(createInput(CatRaceMode.TICKET, 3))
        .success,
    ).toBe(true);
  });

  it('rejects a prize name that is empty after trimming', () => {
    expect(
      catRacePrizeInputSchema.safeParse({ ...prize, name: '   ' }).success,
    ).toBe(false);
  });

  it('rejects a zero quantity', () => {
    expect(
      catRacePrizeInputSchema.safeParse({ ...prize, quantity: 0 }).success,
    ).toBe(false);
  });

  it('rejects a 256-character void reason', () => {
    expect(
      voidCatRaceRoundSchema.safeParse({ reason: 'x'.repeat(256) }).success,
    ).toBe(false);
  });
});
