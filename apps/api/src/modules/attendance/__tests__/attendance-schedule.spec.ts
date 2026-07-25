import { getActiveWeek, isDeadlinePassed } from '../attendance-schedule';

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-21T09:00' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

/**
 * Lấy một trận theo nhãn.
 * @param now - Thời điểm tính tuần
 * @param label - Nhãn trận cần lấy
 * @returns Trận tương ứng
 */
function sessionAt(now: Date, label: string) {
  const session = getActiveWeek(now).sessions.find(
    (item) => item.label === label,
  );

  if (!session) {
    throw new Error(`Không có trận "${label}"`);
  }

  return session;
}

describe('attendance-schedule', () => {
  // Thứ 4 2026-07-22 12:00 VN → tuần điểm danh chứa Guild War Thứ 7 2026-07-25.
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
      const week = getActiveWeek(vn('2026-07-25T21:59'));

      expect(week.weekStart.toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
    });

    it('sau 22:00 Thứ 7 thì mở sang tuần kế tiếp', () => {
      const week = getActiveWeek(vn('2026-07-25T22:00'));

      expect(week.weekStart.toISOString()).toBe(
        vn('2026-07-27T00:00').toISOString(),
      );
    });
  });

  describe('deadline từng trận', () => {
    it('trận trước Thứ 5 có hạn 10:00 sáng chính ngày đánh', () => {
      const tuesday = sessionAt(wednesday, 'Thứ 3 · 20:30');

      expect(tuesday.dateTime.toISOString()).toBe(
        vn('2026-07-21T20:30').toISOString(),
      );
      expect(tuesday.deadline.toISOString()).toBe(
        vn('2026-07-21T10:00').toISOString(),
      );
    });

    it('trận Thứ 5 bị chặn bởi trần chốt sổ 17:00 Thứ 5', () => {
      const thursday = sessionAt(wednesday, 'Thứ 5 · 20:30');

      expect(thursday.deadline.toISOString()).toBe(
        vn('2026-07-23T17:00').toISOString(),
      );
    });

    it('Guild War Thứ 7 cũng phải chốt trước 17:00 Thứ 5', () => {
      const guildWar = sessionAt(wednesday, 'Thứ 7 · Guild War');

      expect(guildWar.isGuildWar).toBe(true);
      expect(guildWar.dateTime.toISOString()).toBe(
        vn('2026-07-25T20:00').toISOString(),
      );
      expect(guildWar.deadline.toISOString()).toBe(
        vn('2026-07-23T17:00').toISOString(),
      );
    });
  });

  describe('isDeadlinePassed', () => {
    it('đúng mốc deadline thì vẫn còn hạn, sau đó thì khóa', () => {
      const deadline = vn('2026-07-23T17:00');

      expect(isDeadlinePassed(deadline, deadline)).toBe(false);
      expect(isDeadlinePassed(deadline, vn('2026-07-23T17:01'))).toBe(true);
    });
  });
});
