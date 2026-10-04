import { createLeaveSchema } from '@guild/shared/schemas';

const input = (startDate: string, endDate = startDate) => ({
  characterId: 'c1',
  startDate,
  endDate,
});

describe('createLeaveSchema dates', () => {
  it.each(['2026-13-01', '2026-02-99', '2026-02-31', '2026-00-10'])(
    'rejects %s with a validation error instead of throwing',
    (value) => {
      const result = createLeaveSchema.safeParse(input(value));

      expect(result.success).toBe(false);
    },
  );

  it('accepts a real day', () => {
    expect(createLeaveSchema.safeParse(input('2026-10-05')).success).toBe(true);
  });
});
