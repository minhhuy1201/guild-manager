import { toBattleSession, type SessionRow } from '../battle-sessions.codec';

const ROW: SessionRow = {
  id: 'session-sat',
  dateTime: new Date('2026-07-25T13:00:00.000Z'),
  deadline: new Date('2026-07-23T10:00:00.000Z'),
  opponent: null,
  isGuildWar: true,
  matchCount: 2,
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
    expect(entity.formationMatchCount).toBe(0);
  });

  it('trả số trận của ngày đánh và số đội hình đã xếp như hai con số khác nhau', () => {
    const entity = toBattleSession(
      {
        ...ROW,
        matchCount: 2,
        _count: { attendanceRecords: 3, formationMatches: 1 },
      },
      new Date('2026-07-22T05:00:00.000Z'),
    );

    expect(entity.matchCount).toBe(2);
    expect(entity.formationMatchCount).toBe(1);
  });
});
