import {
  formatSessionLabel,
  getActiveWeek,
  getEditableWeeks,
  guildWarDateTime,
  guildWarSessionId,
  isDeadlinePassed,
  isSameWeek,
  isSessionLocked,
  parseWeekStart,
  weekStartOf,
} from '../session-schedule';

/**
 * Build a Date from Vietnam time (UTC+7) for readability in tests.
 * @param iso - A string like '2026-07-22T12:00', read as Vietnam time
 * @returns The matching UTC Date
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

describe('session-schedule', () => {
  // Wednesday 2026-07-22 12:00 VN → the attendance week holding the Saturday 2026-07-25 Guild War.
  const wednesday = vn('2026-07-22T12:00');

  describe('ranh giới tuần', () => {
    it('tuần chạy từ Thứ 2 00:00 đến Thứ 7 23:59 (giờ VN)', () => {
      const week = getActiveWeek(wednesday);

      expect(week.weekStart.toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
      expect(week.weekEnd.toISOString()).toBe(
        vn('2026-07-25T23:59').toISOString(),
      );
    });

    it('trước 22:00 Thứ 7 vẫn là tuần hiện tại', () => {
      expect(
        getActiveWeek(vn('2026-07-25T21:59')).weekStart.toISOString(),
      ).toBe(vn('2026-07-20T00:00').toISOString());
    });

    it('sau 22:00 Thứ 7 thì mở sang tuần kế tiếp', () => {
      expect(
        getActiveWeek(vn('2026-07-25T22:00')).weekStart.toISOString(),
      ).toBe(vn('2026-07-27T00:00').toISOString());
    });
  });

  describe('getEditableWeeks', () => {
    it('trả về đúng tuần đang mở và tuần kế tiếp', () => {
      const weeks = getEditableWeeks(wednesday);

      expect(weeks).toHaveLength(2);
      expect(weeks[0].weekStart.toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
      expect(weeks[1].weekStart.toISOString()).toBe(
        vn('2026-07-27T00:00').toISOString(),
      );
    });
  });

  describe('weekStartOf', () => {
    it('quy mọi ngày trong tuần về Thứ 2 00:00 giờ VN', () => {
      expect(weekStartOf(vn('2026-07-20T00:00')).toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
      expect(weekStartOf(vn('2026-07-25T20:00')).toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
      expect(weekStartOf(vn('2026-07-26T23:59')).toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
    });

    it('Chủ nhật thuộc tuần bắt đầu từ Thứ 2 sáu ngày trước', () => {
      expect(weekStartOf(vn('2026-07-26T00:00')).toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
    });
  });

  describe('Guild War', () => {
    it('diễn ra 20:00 Thứ 7 của tuần', () => {
      expect(guildWarDateTime(vn('2026-07-20T00:00')).toISOString()).toBe(
        vn('2026-07-25T20:00').toISOString(),
      );
    });

    it('có id tất định theo ngày Thứ 2 của tuần', () => {
      expect(guildWarSessionId(vn('2026-07-20T00:00'))).toBe('gw-2026-07-20');
    });

    it('tuần vắt qua mốc đổi tháng vẫn lấy ngày của Thứ 2', () => {
      expect(guildWarSessionId(vn('2026-11-30T00:00'))).toBe('gw-2026-11-30');
    });

    it('tuần vắt qua mốc đổi năm vẫn lấy ngày của Thứ 2', () => {
      expect(guildWarSessionId(vn('2026-12-28T00:00'))).toBe('gw-2026-12-28');
      expect(guildWarSessionId(vn('2027-01-04T00:00'))).toBe('gw-2027-01-04');
    });
  });

  describe('formatSessionLabel', () => {
    it('trận thường hiện thứ và giờ đánh', () => {
      expect(formatSessionLabel(vn('2026-07-21T20:30'), false)).toBe(
        'Thứ 3 · 20:30',
      );
      expect(formatSessionLabel(vn('2026-07-26T09:05'), false)).toBe(
        'Chủ nhật · 09:05',
      );
    });

    it('Guild War hiện thứ và chữ Bang Chiến', () => {
      expect(formatSessionLabel(vn('2026-07-25T20:00'), true)).toBe(
        'Thứ 7 · Bang Chiến',
      );
    });
  });

  describe('isSameWeek', () => {
    it('cùng mốc thì cùng tuần', () => {
      expect(
        isSameWeek(weekStartOf(vn('2026-07-20T00:00')), weekStartOf(wednesday)),
      ).toBe(true);
    });

    it('hai tuần kề nhau thì khác tuần', () => {
      expect(
        isSameWeek(weekStartOf(wednesday), weekStartOf(vn('2026-07-27T09:00'))),
      ).toBe(false);
    });

    it('cùng mốc viết bằng hai múi giờ khác nhau vẫn cùng tuần', () => {
      // The case the old string comparison got wrong: same instant, two different strings.
      const asOffset = weekStartOf(new Date('2026-07-20T00:00:00+07:00'));
      const asUtc = weekStartOf(new Date('2026-07-19T17:00:00.000Z'));

      expect(isSameWeek(asOffset, asUtc)).toBe(true);
    });
  });

  describe('parseWeekStart', () => {
    it('bỏ trống thì lấy tuần đang mở', () => {
      expect(parseWeekStart(undefined, wednesday).toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
    });

    // A malformed string is a programming error, not a user error: `weekStartQuerySchema` blocks it
    // at the HTTP boundary (week-start-query.spec.ts), so this layer only throws a plain error and
    // does not build a 400 response.
    it('chuỗi không phải mốc thời gian thì ném RangeError', () => {
      expect(() => parseWeekStart('xyz', wednesday)).toThrow(RangeError);
    });

    it('mốc giữa tuần quy về Thứ 2 của tuần chứa nó', () => {
      expect(
        parseWeekStart(
          vn('2026-07-22T12:00').toISOString(),
          wednesday,
        ).toISOString(),
      ).toBe(vn('2026-07-20T00:00').toISOString());
    });

    it('Chủ nhật vẫn thuộc tuần bắt đầu từ Thứ 2 trước đó', () => {
      expect(
        parseWeekStart(
          vn('2026-07-26T23:00').toISOString(),
          wednesday,
        ).toISOString(),
      ).toBe(vn('2026-07-20T00:00').toISOString());
    });

    it('cùng một mốc gửi bằng +07:00 và bằng Z cho cùng kết quả', () => {
      const asOffset = parseWeekStart('2026-07-20T00:00:00+07:00', wednesday);
      const asUtc = parseWeekStart('2026-07-19T17:00:00.000Z', wednesday);

      expect(isSameWeek(asOffset, asUtc)).toBe(true);
    });
  });

  describe('isDeadlinePassed', () => {
    it('đúng mốc deadline thì vẫn còn hạn, sau đó thì khóa', () => {
      const deadline = vn('2026-07-23T17:00');

      expect(isDeadlinePassed(deadline, deadline)).toBe(false);
      expect(isDeadlinePassed(deadline, vn('2026-07-23T17:01'))).toBe(true);
    });
  });

  describe('isSessionLocked', () => {
    const dateTime = vn('2026-07-23T20:30');

    it('trước giờ đánh thì chưa khoá', () => {
      expect(isSessionLocked(dateTime, vn('2026-07-23T20:29'))).toBe(false);
    });

    it('đúng giờ đánh vẫn chưa khoá', () => {
      expect(isSessionLocked(dateTime, new Date(dateTime))).toBe(false);
    });

    it('sau giờ đánh thì khoá', () => {
      expect(isSessionLocked(dateTime, vn('2026-07-23T20:31'))).toBe(true);
    });

    it('khoá theo giờ đánh, không theo hạn điểm danh', () => {
      // The deadline sits before the battle time: past the attendance deadline but before the
      // battle, the formation is still editable.
      const deadline = vn('2026-07-23T17:00');
      const afterDeadline = vn('2026-07-23T18:00');

      expect(isDeadlinePassed(deadline, afterDeadline)).toBe(true);
      expect(isSessionLocked(dateTime, afterDeadline)).toBe(false);
    });
  });
});
