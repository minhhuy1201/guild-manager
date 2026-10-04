import { parseLeaveDateInput } from '../leave-date-input';
import { vn } from '../../../__tests__/vn-date';

describe('parseLeaveDateInput', () => {
  it.each<[string, string, string | null]>([
    ['05/10', '2026-10-04', '2026-10-05'],
    ['5/10', '2026-10-04', '2026-10-05'],
    ['5/1', '2026-10-04', '2027-01-05'],
    // A missing year picks the occurrence nearest today, across New Year in both directions.
    ['02/01', '2026-12-28', '2027-01-02'],
    ['27/12', '2027-01-02', '2026-12-27'],
    ['05/10/2027', '2026-10-04', '2027-10-05'],
    ['31/02', '2026-10-04', null],
    ['29/02/2027', '2026-10-04', null],
    ['29/02/2028', '2026-10-04', '2028-02-29'],
    ['abc', '2026-10-04', null],
    ['', '2026-10-04', null],
    ['32/01', '2026-10-04', null],
    ['05/13', '2026-10-04', null],
    ['  05/10  ', '2026-10-04', '2026-10-05'],
  ])('%j on %s -> %s', (input, today, expected) => {
    expect(parseLeaveDateInput(input, vn(`${today}T12:00`))).toBe(expected);
  });

  describe('end date after a start date', () => {
    it.each<[string, string, string, string | null]>([
      // Resolved on its own, 05/01 would land in the past of 2026-07-01 and precede the start.
      ['05/01', '2026-07-01', '2026-12-30', '2027-01-05'],
      ['30/12', '2026-07-01', '2026-12-30', '2026-12-30'],
      ['29/02', '2027-06-01', '2027-12-01', '2028-02-29'],
      // A reversed range is a typo, not a year-long leave: too far ahead, so it falls back to the
      // nearest occurrence and the schema refuses it as ending before it starts.
      ['05/10', '2026-10-04', '2026-10-12', '2026-10-05'],
      ['12/10', '2026-10-04', '2026-10-05', '2026-10-12'],
      ['12/10/2030', '2026-10-04', '2026-10-05', '2030-10-12'],
      ['31/02', '2026-10-04', '2026-10-05', null],
    ])('%j on %s, starting %s -> %s', (input, today, notBefore, expected) => {
      expect(parseLeaveDateInput(input, vn(`${today}T12:00`), notBefore)).toBe(
        expected,
      );
    });
  });
});
