import {
  isAutoAttendCovering,
  type AutoAttendWindow,
} from '../auto-attend-coverage';
import type { CoverageSession } from '../leave-coverage';

// Battle Saturday 2026-10-10 20:00 VN = 13:00 UTC; deadline 2026-10-10 12:00 VN.
const SESSION: CoverageSession = {
  id: 's1',
  dateTime: new Date('2026-10-10T13:00:00Z'),
  deadline: new Date('2026-10-10T05:00:00Z'),
  attendanceClosedAt: null,
};
const LONG_BEFORE = new Date('2026-09-01T00:00:00Z');
const BEFORE_DEADLINE = new Date('2026-10-09T05:00:00Z');
const AFTER_DEADLINE = new Date('2026-10-10T06:00:00Z');

const period = (
  overrides: Partial<AutoAttendWindow> = {},
): AutoAttendWindow => ({
  id: 'a1',
  characterId: 'c1',
  enabledAt: LONG_BEFORE,
  disabledAt: null,
  ...overrides,
});

describe('isAutoAttendCovering', () => {
  it.each<
    [string, Partial<AutoAttendWindow>, Partial<CoverageSession>, boolean]
  >([
    ['still on, turned on well before the day', {}, {}, true],
    ['turned on before the deadline', { enabledAt: BEFORE_DEADLINE }, {}, true],
    ['turned on after the deadline', { enabledAt: AFTER_DEADLINE }, {}, false],
    [
      'turned on exactly at the closing moment',
      { enabledAt: SESSION.deadline },
      {},
      false,
    ],
    [
      'turned on after the announcement closed the day early',
      { enabledAt: new Date('2026-10-10T02:00:00Z') },
      { attendanceClosedAt: new Date('2026-10-10T01:00:00Z') },
      false,
    ],
    [
      'turned off before the closing moment',
      { disabledAt: BEFORE_DEADLINE },
      {},
      false,
    ],
    [
      'turned off exactly at the closing moment',
      { disabledAt: SESSION.deadline },
      {},
      true,
    ],
    [
      'turned off after the closing moment',
      { disabledAt: AFTER_DEADLINE },
      {},
      true,
    ],
    [
      'turned off after the day closed early by the announcement',
      { disabledAt: new Date('2026-10-10T02:00:00Z') },
      { attendanceClosedAt: new Date('2026-10-10T01:00:00Z') },
      true,
    ],
    [
      'a later day than the one it was turned off before',
      { disabledAt: BEFORE_DEADLINE },
      {
        dateTime: new Date('2026-10-17T13:00:00Z'),
        deadline: new Date('2026-10-17T05:00:00Z'),
      },
      false,
    ],
  ])('%s', (_name, periodOverrides, sessionOverrides, expected) => {
    expect(
      isAutoAttendCovering(period(periodOverrides), {
        ...SESSION,
        ...sessionOverrides,
      }),
    ).toBe(expected);
  });

  it('covers only its own days when turned on, off and on again', () => {
    const first = period({
      id: 'first',
      enabledAt: LONG_BEFORE,
      disabledAt: AFTER_DEADLINE,
    });
    const second = period({
      id: 'second',
      enabledAt: new Date('2026-10-12T00:00:00Z'),
    });
    const nextWeek: CoverageSession = {
      id: 's2',
      dateTime: new Date('2026-10-17T13:00:00Z'),
      deadline: new Date('2026-10-17T05:00:00Z'),
      attendanceClosedAt: null,
    };

    expect([
      isAutoAttendCovering(first, SESSION),
      isAutoAttendCovering(second, SESSION),
      isAutoAttendCovering(first, nextWeek),
      isAutoAttendCovering(second, nextWeek),
    ]).toEqual([true, false, false, true]);
  });
});
