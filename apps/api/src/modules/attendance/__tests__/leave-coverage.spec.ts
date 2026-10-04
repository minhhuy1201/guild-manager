import type { AttendanceRecord } from '@guild/shared/schemas';

import {
  effectiveRecords,
  isLeaveCovering,
  type CoverageSession,
  type LeaveWindow,
} from '../leave-coverage';

// Battle Saturday 2026-10-10 20:00 VN = 13:00 UTC; deadline 2026-10-10 12:00 VN.
const SESSION: CoverageSession = {
  id: 's1',
  dateTime: new Date('2026-10-10T13:00:00Z'),
  deadline: new Date('2026-10-10T05:00:00Z'),
  attendanceClosedAt: null,
};
const BEFORE_DEADLINE = new Date('2026-10-09T05:00:00Z');
const AFTER_DEADLINE = new Date('2026-10-10T06:00:00Z');

const leave = (overrides: Partial<LeaveWindow> = {}): LeaveWindow => ({
  id: 'l1',
  characterId: 'c1',
  startDate: '2026-10-09',
  endDate: '2026-10-11',
  reason: 'du lịch',
  createdAt: BEFORE_DEADLINE,
  createdByAdmin: false,
  cancelledAt: null,
  cancelledByAdmin: false,
  ...overrides,
});

describe('isLeaveCovering', () => {
  it.each<[string, Partial<LeaveWindow>, Partial<CoverageSession>, boolean]>([
    ['session inside the range, filed before the deadline', {}, {}, true],
    ['session on startDate', { startDate: '2026-10-10' }, {}, true],
    ['session on endDate', { endDate: '2026-10-10' }, {}, true],
    ['session the day after endDate', { endDate: '2026-10-09' }, {}, false],
    [
      'session the day before startDate',
      { startDate: '2026-10-11' },
      {},
      false,
    ],
    [
      'session at 00:30 VN on day D is day D, not D-1 in UTC',
      { startDate: '2026-10-10', endDate: '2026-10-10' },
      { dateTime: new Date('2026-10-09T17:30:00Z') },
      true,
    ],
    ['filed after the deadline', { createdAt: AFTER_DEADLINE }, {}, false],
    [
      'filed exactly at the closing moment',
      { createdAt: SESSION.deadline },
      {},
      false,
    ],
    [
      'announcement closed the day before the deadline and before filing',
      { createdAt: new Date('2026-10-10T02:00:00Z') },
      { attendanceClosedAt: new Date('2026-10-10T01:00:00Z') },
      false,
    ],
    [
      'cancelled before the closing moment',
      { cancelledAt: BEFORE_DEADLINE },
      {},
      false,
    ],
    [
      'cancelled exactly at the closing moment',
      { cancelledAt: SESSION.deadline },
      {},
      true,
    ],
    [
      'cancelled after the closing moment',
      { cancelledAt: AFTER_DEADLINE },
      {},
      true,
    ],
    [
      'admin leave filed after the closing moment',
      { createdAt: AFTER_DEADLINE, createdByAdmin: true },
      {},
      true,
    ],
    [
      'admin cancel after the closing moment releases the closed day',
      { cancelledAt: AFTER_DEADLINE, cancelledByAdmin: true },
      {},
      false,
    ],
    [
      'admin leave cancelled by a member after the closing moment',
      {
        createdByAdmin: true,
        createdAt: AFTER_DEADLINE,
        cancelledAt: new Date('2026-10-10T07:00:00Z'),
      },
      {},
      true,
    ],
  ])('%s', (_name, leaveOverrides, sessionOverrides, expected) => {
    expect(
      isLeaveCovering(leave(leaveOverrides), {
        ...SESSION,
        ...sessionOverrides,
      }),
    ).toBe(expected);
  });
});

describe('effectiveRecords', () => {
  const answer = (
    overrides: Partial<AttendanceRecord> = {},
  ): AttendanceRecord => ({
    characterId: 'c1',
    sessionId: 's1',
    isPresent: true,
    markedAt: '2026-10-09T08:00:00.000Z',
    reason: null,
    source: 'answer',
    ...overrides,
  });

  it('keeps a pressed answer over a covering leave', () => {
    expect(effectiveRecords([answer()], [leave()], [SESSION])).toEqual([
      answer(),
    ]);
  });

  it('fills an unanswered cell covered by a leave', () => {
    expect(effectiveRecords([], [leave()], [SESSION])).toEqual([
      {
        characterId: 'c1',
        sessionId: 's1',
        isPresent: false,
        markedAt: BEFORE_DEADLINE.toISOString(),
        reason: 'du lịch',
        source: 'leave',
      },
    ]);
  });

  it('ignores a leave of another character for this cell', () => {
    const records = effectiveRecords(
      [answer({ characterId: 'c2' })],
      [leave()],
      [SESSION],
    );

    expect(records.map((r) => [r.characterId, r.source])).toEqual(
      expect.arrayContaining([
        ['c2', 'answer'],
        ['c1', 'leave'],
      ]),
    );
    expect(records).toHaveLength(2);
  });

  it('orders by markedAt descending', () => {
    const records = effectiveRecords(
      [answer({ characterId: 'c2', markedAt: '2026-10-01T00:00:00.000Z' })],
      [leave()],
      [SESSION],
    );

    expect(records.map((r) => r.characterId)).toEqual(['c1', 'c2']);
  });
});
