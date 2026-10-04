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
});
