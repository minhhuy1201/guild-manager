import { toBattleSession, type SessionRow } from '../battle-sessions.codec';

const ROW: SessionRow = {
  id: 'session-sat',
  dateTime: new Date('2026-07-25T13:00:00.000Z'),
  deadline: new Date('2026-07-23T10:00:00.000Z'),
  opponent: null,
  isGuildWar: true,
  weekStart: new Date('2026-07-19T17:00:00.000Z'),
  _count: { attendanceRecords: 3, formationMatches: 0 },
};

describe('toBattleSession', () => {
  it('đổi mọi mốc thời gian sang ISO string', () => {
    const entity = toBattleSession(ROW, new Date('2026-07-22T05:00:00.000Z'));

    expect(entity.dateTime).toBe('2026-07-25T13:00:00.000Z');
    expect(entity.deadline).toBe('2026-07-23T10:00:00.000Z');
    expect(entity.weekStart).toBe('2026-07-19T17:00:00.000Z');
  });

  it('chốt cờ quá hạn theo mốc `now` được truyền vào', () => {
    expect(
      toBattleSession(ROW, new Date('2026-07-22T05:00:00.000Z'))
        .isDeadlinePassed,
    ).toBe(false);
    expect(
      toBattleSession(ROW, new Date('2026-07-24T05:00:00.000Z'))
        .isDeadlinePassed,
    ).toBe(true);
  });

  it('rút số liệu phụ ra khỏi `_count`', () => {
    const entity = toBattleSession(ROW, new Date('2026-07-22T05:00:00.000Z'));

    expect(entity.attendanceCount).toBe(3);
    expect(entity.hasFormation).toBe(false);
  });
});
