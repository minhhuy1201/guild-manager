import { AttendanceStatus } from '@guild/shared/enums';

import { toAttendanceRecord } from '../attendance.codec';

const MARKED_AT = new Date('2026-07-22T05:00:00.000Z');

describe('toAttendanceRecord', () => {
  it('đổi markedAt sang ISO string và giữ nguyên trạng thái', () => {
    expect(
      toAttendanceRecord({
        characterId: 'char-1',
        sessionId: 'session-sat',
        status: AttendanceStatus.PRESENT,
        markedAt: MARKED_AT,
      }),
    ).toEqual({
      characterId: 'char-1',
      sessionId: 'session-sat',
      status: AttendanceStatus.PRESENT,
      markedAt: '2026-07-22T05:00:00.000Z',
    });
  });
});
