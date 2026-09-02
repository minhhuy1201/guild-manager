import type { BattleSession } from '@guild/shared/schemas';

import { buildAnnouncement } from '../announcement';
import { ANNOUNCEMENT_ATTENDANCE_ID } from '../custom-id';
import { BUTTON_STYLE } from '../discord.constants';

const LINKS = {
  webOrigin: 'https://mmgh-nth.vercel.app',
  guildRoleId: '999888777',
};

/** Monday 2026-08-31 00:00 VN — the week every fixture below belongs to. */
const WEEK_START = '2026-08-30T17:00:00.000Z';

/**
 * One battle session, with only the fields the announcement reads spelled out.
 * @param overrides - Fields to override on top of a Thursday scrim
 * @returns A session shaped like the API returns it
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'a',
    label: 'Thứ 5 · 20:30',
    dateTime: '2026-09-03T13:30:00.000Z',
    deadline: '2026-09-03T03:00:00.000Z',
    isDeadlinePassed: false,
    isGuildWar: false,
    opponent: 'Moonlight',
    weekStart: WEEK_START,
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
    ...overrides,
  };
}

describe('buildAnnouncement', () => {
  it('mention role bang, và chỉ cho phép ping đúng role đó', () => {
    const payload = buildAnnouncement([session()], LINKS);

    expect(payload.content).toBe('<@&999888777>');
    expect(payload.allowed_mentions).toEqual({ roles: ['999888777'] });
  });

  it('mỗi ngày đánh là một khối riêng, xếp dọc chứ không xếp cột', () => {
    // Embed field là thứ Discord xếp thành cột. Cả lịch nằm trong `description`, mỗi ngày mở đầu
    // bằng một heading, nên chúng luôn nối tiếp nhau theo chiều dọc.
    const payload = buildAnnouncement(
      [
        session(),
        session({
          id: 'b',
          label: 'Thứ 7 · 20:00 · Bang Chiến',
          isGuildWar: true,
          opponent: null,
          dateTime: '2026-09-05T13:00:00.000Z',
        }),
      ],
      LINKS,
    );

    expect(payload.embeds![0].description.split('\n')).toEqual(
      expect.arrayContaining([
        '### ⚔️ Thứ 5 · 20:30',
        '### 🛡️ Thứ 7 · 20:00 · Bang Chiến',
      ]),
    );
  });

  it('tên ngày đánh dùng heading để chữ to hơn phần còn lại', () => {
    const payload = buildAnnouncement([session()], LINKS);

    expect(payload.embeds![0].description).toContain('### ⚔️ Thứ 5 · 20:30');
  });

  it('chi tiết một ngày gọn trên một dòng dưới tên ngày', () => {
    const payload = buildAnnouncement([session()], LINKS);
    const lines = payload.embeds![0].description.split('\n');
    const detail = lines[lines.indexOf('### ⚔️ Thứ 5 · 20:30') + 1];

    expect(detail).toBe('📅 03/09 · 🎮 2 trận · 🆚 Moonlight');
  });

  it('Bang Chiến đổi icon và không có phần đối thủ', () => {
    const payload = buildAnnouncement(
      [
        session({
          label: 'Thứ 7 · 20:00 · Bang Chiến',
          isGuildWar: true,
          opponent: null,
          dateTime: '2026-09-05T13:00:00.000Z',
        }),
      ],
      LINKS,
    );
    const { description } = payload.embeds![0];
    const lines = description.split('\n');
    const detail =
      lines[lines.indexOf('### 🛡️ Thứ 7 · 20:00 · Bang Chiến') + 1];

    expect(detail).toBe('📅 05/09 · 🎮 2 trận');
  });

  it('scrim chưa chốt đối thủ thì bỏ hẳn phần đó', () => {
    const payload = buildAnnouncement([session({ opponent: null })], LINKS);
    const lines = payload.embeds![0].description.split('\n');
    const detail = lines[lines.indexOf('### ⚔️ Thứ 5 · 20:30') + 1];

    expect(detail).toBe('📅 03/09 · 🎮 2 trận');
  });

  it('mở đầu bằng khoảng tuần từ thứ 2 đến thứ 7', () => {
    const payload = buildAnnouncement([session()], LINKS);

    expect(payload.embeds![0].description.split('\n')[0]).toBe(
      '**31/08 – 05/09**',
    );
  });

  it('ghi chú hướng dẫn đứng cuối, cũng là một heading', () => {
    const payload = buildAnnouncement([session()], LINKS);
    const headings = payload
      .embeds![0].description.split('\n')
      .filter((line) => line.startsWith('### '));

    expect(headings[headings.length - 1]).toBe('### ✅ Điểm danh');
    expect(payload.embeds![0].description).toContain('/diem-danh');
  });

  it('tuần rỗng thì nói rõ, và vẫn giữ ghi chú', () => {
    const payload = buildAnnouncement([], LINKS);
    const { description } = payload.embeds![0];

    expect(description.split('\n')[0]).toBe('Tuần này chưa có ngày đánh nào.');
    expect(description).toContain('### ✅ Điểm danh');
    expect(description).not.toContain('🎮');
  });

  it('hai nút: điểm danh mang custom_id hằng số, mở web là link button', () => {
    const payload = buildAnnouncement([session()], LINKS);
    const [attendance, website] = payload.components![0].components;

    expect(attendance).toEqual({
      type: 2,
      style: BUTTON_STYLE.primary,
      label: '✅ Điểm danh ngay',
      custom_id: ANNOUNCEMENT_ATTENDANCE_ID,
    });
    expect(website).toEqual({
      type: 2,
      style: BUTTON_STYLE.link,
      label: '🌐 Mở website',
      url: 'https://mmgh-nth.vercel.app',
    });
  });

  it('thông báo không ephemeral — cả bang phải thấy', () => {
    expect(buildAnnouncement([session()], LINKS).flags).toBeUndefined();
  });
});
