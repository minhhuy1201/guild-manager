import { toAttendanceRecord } from '../attendance.codec';

const MARKED_AT = new Date('2026-07-22T05:00:00.000Z');

describe('toAttendanceRecord', () => {
  it('đổi markedAt sang ISO string và giữ nguyên câu trả lời "Có"', () => {
    expect(
      toAttendanceRecord({
        characterId: 'char-1',
        sessionId: 'session-sat',
        isPresent: true,
        markedAt: MARKED_AT,
      }),
    ).toEqual({
      characterId: 'char-1',
      sessionId: 'session-sat',
      isPresent: true,
      markedAt: '2026-07-22T05:00:00.000Z',
    });
  });

  it('giữ nguyên câu trả lời "Không"', () => {
    expect(
      toAttendanceRecord({
        characterId: 'char-1',
        sessionId: 'session-sat',
        isPresent: false,
        markedAt: MARKED_AT,
      }),
    ).toEqual({
      characterId: 'char-1',
      sessionId: 'session-sat',
      isPresent: false,
      markedAt: '2026-07-22T05:00:00.000Z',
    });
  });
});
